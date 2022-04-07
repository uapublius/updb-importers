import fs from 'fs/promises';
import { Knex } from 'knex';
import { Report, Location, Attachment } from '../types';
import { createReport } from '../report';
import { getCountryAbbreviationByName, isDistrictOf, walk } from '../utils';
import config from '../config.json';
import { JSDOM } from 'jsdom';
import path from 'path';

let SOURCE_NUFORC = 2;

type NuforcRecord = {
  id: string;
  event_date: string;
  reported_date: string;
  posted_date: string;
  location: string;
  shape: string;
  duration: string;
  text: string;
  characteristics: string;
  attachments: string[];
};

function buildDescription(record: NuforcRecord) {
  let desc = "";

  if (record.shape) desc += "Shape: " + record.shape + "\n";
  if (record.duration) desc += "Duration: " + record.duration + "\n";
  if (record.characteristics) desc += "Characteristics: " + record.characteristics + "\n";

  desc += "\n" + record.text;

  return desc;
}

function buildDate(record: NuforcRecord) {
  let [date] = record.event_date.split(' (Entered as');
  date = date.trim();

  let [datePart, timePart] = date.split(' ');
  let [month, day, year] = datePart.split('/');

  if (!timePart) timePart = "00:00";
  timePart += ":00";

  return `${year}-${month}-${day} ${timePart}`;
}

function buildLocation(record: NuforcRecord) {
  let locationRecord = record.location.split(',').map(s => s.trim()).filter(s => s);
  let location: Location;

  if (locationRecord.length === 1) {
    location = buildLocationLength1(locationRecord, record);
  }
  else if (locationRecord.length === 2) {
    location = buildLocationLength2(locationRecord);
  }
  else if (locationRecord.length === 3) {
    location = buildLocationLength3(locationRecord, record);
  }
  else if (locationRecord.length === 4 && locationRecord[2] === locationRecord[3]) {
    locationRecord.pop();
    location = buildLocationLength3(locationRecord, record);
  }
  else if (!locationRecord.length) {
    location = { city: '', district: '', country: '' };
  }
  else {
    console.warn('[NUFORC] Malformed location: ' + record.location);
    location = { city: record.location, district: '', country: '' };
  }

  return location;
}


function buildCountryDistrictByName(name: string) {
  let country = '';
  let district = '';

  country = getCountryAbbreviationByName(name);

  let nameParts = name.split('/');

  if (nameParts.length === 2) {
    let [countryPart, districtPart] = nameParts;
    if (countryPart === "UK") countryPart = "GB";
    country = getCountryAbbreviationByName(countryPart);
    district = districtPart;
  }

  if (!country) {
    throw new Error('Could not find country code for: ' + name);
  }

  return { country, district };
}


function buildCityCountry(locationRecord: string[], countryRaw?: string) {
  let cityRaw = locationRecord[0].trim();
  let city = '';
  let country = '';
  let cityParts = cityRaw.match(/^(.*)\s?\((.*)\)$/);

  if (cityParts && cityParts.length === 3) {
    let cityPartRaw = cityParts[1].trim();
    let countryPartRaw = cityParts[2].trim();
    // has country in parens - use first part for city name
    city = cityPartRaw;

    if (countryRaw) {
      // country passed, see if matches
      if (buildCountryDistrictByName(countryRaw).country !== buildCountryDistrictByName(countryPartRaw).country) {
        throw new Error(`Country in parens doesnt match country value\n` + locationRecord);
      }

      country = buildCountryDistrictByName(countryRaw).country;
    }
    else {
      // no country, use value in parens
      country = countryPartRaw;
    }
  }
  else {
    city = cityRaw;
  }

  return { city, country };
}

function buildLocationLength1(locationRecord: string[], record: NuforcRecord) {
  // e.g. Karnatakaa (Chamarajanagar)(India)
  let locationParts1 = locationRecord[0].match(/^(.*)\s?\((.*)\)\s?\((.*)\)$/);

  if (locationParts1 && locationParts1.length === 4) {
    let { country, district } = buildCountryDistrictByName(locationParts1[3]);
    let city = locationParts1[2].trim();
    district = district || locationParts1[1].trim();
    if (!isDistrictOf(country, district)) {
      console.warn(`[NUFORC] ${district} is not a district of ${country}\n` + locationRecord);
    }
    return { city, district, country };
  }

  // e.g. Berlin (Germany)
  let locationParts2 = locationRecord[0].match(/^(.*)\s?\((.*)\)$/);

  if (locationParts2 && locationParts2.length === 3) {
    let { country, district } = buildCountryDistrictByName(locationParts2[2]);
    let city = locationParts2[1].trim();

    if (isDistrictOf(country, city)) {
      // district is in city field (happens in e.g. Dunbartionshire, Scotland, GB)
      district = city + ", " + district;
      city = '';
    }

    return { city, district, country };
  }

  let locationParts3 = locationRecord[0].split(',').map(s => s.trim());
  let firstLocationPart = locationParts3[0];

  if (isDistrictOf('US', firstLocationPart)) {
    return { city: '', district: firstLocationPart, country: 'US' };
  }
  else if (getCountryAbbreviationByName(firstLocationPart)) {
    return { city: '', district: '', country: getCountryAbbreviationByName(firstLocationPart) };
  }
  else {
    return { city: firstLocationPart, district: '', country: '' };
  }
}

function buildLocationLength2(locationRecord: string[]) {
  let city = locationRecord[0].trim();
  let district = locationRecord[1].trim();
  let countriesToCheckForDistrict = ['US', 'CA', 'UK', 'AU', 'NZ'];

  for (const country of countriesToCheckForDistrict) {
    if (isDistrictOf(country, district)) {
      return { city, district, country };
    }
  }

  let locationParts2 = city.match(/^(.*)\s?\((.*)\)$/);

  if (locationParts2 && locationParts2.length === 3) {
    let { city, country } = buildCityCountry(locationRecord, locationParts2[2]);
    if (!isDistrictOf(country, district)) {
      console.warn(`[NUFORC] ${district} is not a district of ${country}\n` + locationRecord);
    }
    return { city, district, country };
  }

  console.warn('[NUFORC] Could not determine country for: ' + locationRecord);

  return { city, district, country: '' };
}

function buildLocationLength3(locationRecord: string[], record: NuforcRecord) {
  let isSameDistrictAndCountry = locationRecord[1].trim() === locationRecord[2].trim();
  if (isSameDistrictAndCountry) return buildLocationLength2(locationRecord);

  let countryRaw = locationRecord[2].trim();
  let { city, country } = buildCityCountry(locationRecord, countryRaw);
  let district = locationRecord[1].trim();

  if (!isDistrictOf(country, district)) {
    console.warn(`[NUFORC] ${district} is not a district of ${country}\n` + locationRecord);
  }

  return { city, district, country };
}

function buildEntry(file: string, tds: NodeListOf<HTMLTableCellElement>) {
  let id = path.parse(file).name.replace('.html', '');
  let eventDate = '';
  let reportedDate = '';
  let postedDate = '';
  let location = '';
  let shape = '';
  let duration = '';
  let characteristics = '';
  let attachments: string[] = [];
  let text = '';

  for (let idx = 0;idx < tds.length;idx++) {
    let td = tds[idx];

    if (idx === 0) {
      // First row - fields
      let text = td.querySelector('font')?.innerHTML || '';
      let fields = text.split('<br>');

      for (let jdx = 0;jdx < fields.length;jdx++) {
        let field = fields[jdx];
        let fieldParts = field.match(/^\w+\s?: (.*)$/);

        if (fieldParts && fieldParts.length > 1) {
          let contents = fieldParts[1];

          switch (jdx) {
            case 0:
              eventDate = contents;
              break;
            case 1:
              reportedDate = contents;
              break;
            case 2:
              postedDate = contents;
              break;
            case 3:
              location = contents;
              break;
            case 4:
              shape = contents;
              break;
            case 5:
              duration = contents;
              break;
            case 6:
              characteristics = contents;
              break;
            default:
              break;
          }
        }
      }
    }
    else if (idx === 1) {
      // Second row - body
      let font = td.querySelector('font')?.innerHTML || '';
      font = font.replace(/<br>/g, '');
      font = font.replace(/�/g, '');
      text = font;
    }
    else {
      // Subsequent rows - attachments
      let img = td.querySelector('img');

      if (!img) {
        throw new Error('non-image in attachments row: ' + td.innerHTML);
      }

      attachments.push(img.src);
    }
  }

  let entry: NuforcRecord = {
    id,
    event_date: eventDate,
    reported_date: reportedDate,
    posted_date: postedDate,
    location,
    shape,
    duration,
    characteristics,
    text,
    attachments
  };

  return entry;
}

//
// Transform source-specific record into Phenomenon location & report
//
function transform(record: NuforcRecord): [Location, Report, Attachment[]] {
  let location: Location = buildLocation(record);
  let date = buildDate(record);
  let description = buildDescription(record);
  let report = {
    date,
    description,
    raw: record,
    source: SOURCE_NUFORC,
    source_id: record.id.toString()
  };

  return [
    location,
    report,
    []
  ];
}

let failed: any[] = [];

//
// Parse file into source-specific records
//
let parseFile = (addFn: Function) => async (file: string) => {
  if (!file.endsWith('.html')) return;

  let html = await fs.readFile(file, { encoding: 'utf8' });
  let { window } = new JSDOM(html);
  let tds = window.document.querySelectorAll('td');
  let entry: NuforcRecord = buildEntry(file, tds);
  let transformed;

  try {
    transformed = transform(entry);
    if (transformed) await addFn(...transformed, entry);
  } catch (error: any) {
    failed.push([error.message, entry]);
  }
};

export async function start(connection: Knex<any, unknown>) {
  console.log('[NUFORC] Starting...');

  try {
    let createFn = createReport(connection);
    let parser = parseFile(createFn);
    let files = await walk(config.sources.nuforc.path);

    for (let file of files) {
      try {
        await parser(file);
      } catch (error: any) {
        console.log('[NUFORC] Error parsing file:', error.message);
      }
    }

    await fs.writeFile('log/failed-nuforc.json', JSON.stringify(failed, null, 2));
    console.log(`[NUFORC] ${failed.length} failed. See logs for details.`);
    console.log('[NUFORC] Done.');
  } catch (error: any) {
    console.log('[NUFORC] Error starting:', error.message);
  }
}

export default {
  start
};
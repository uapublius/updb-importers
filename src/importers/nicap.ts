import { createReadStream } from 'fs';
import fs from 'fs/promises';
import * as csv from 'fast-csv';
import md5 from 'md5';
import linewrap from 'linewrap';
import { Knex } from 'knex';
import { JSDOM } from 'jsdom';
import waterBodies from '../lib/water-bodies';
import * as windows1252 from '../vendor/windows-1252';
import { Report, Location, Attachment } from '../types';
import { createReport } from '../report';
import { continents, getCountryAbbreviationByName, isDistrictOf, ukCountries } from '../utils';
import config from '../config.json';

let wrap = linewrap(80, { respectLineBreaks: 'multi' });

let SOURCE_NICAP = 3;

type NicapRecord = {
  id: number,
  Date: string,
  City: string;
  'State or      Country': string;
  Cat: string;
  BB: string;
  'NC flag': string;
  LC: string;
  Description: string;
};

async function getDetails(document: Document) {
  let skippedHrefs = cleanDocument(document);
  let { body, type } = getBody(document);
  let attachments = getAttachments(document, skippedHrefs);

  return { body, type, attachments };
}

function cleanDocument(document: Document) {
  let skippedHrefs = [
    'http://www.nicap.org/ratings.htm',
    'http://www.nicap.org/index.htm',
    'http://www.nicap.org/'
  ];

  for (const skippedHref of skippedHrefs) {
    document.querySelector(`a[href='${skippedHref}']`)?.remove();
  }
  return skippedHrefs;
}

function trimTextContent(t: Element) {
  return t.textContent?.trim();
}

function getBody(document: Document) {
  let isEmailType = document.querySelector('body > big > span.EUDORAHEADER') !== null;
  let isEmailType2 = document.querySelector('body > span.EUDORAHEADER') !== null;
  let isFrontpageType = document.querySelector('meta[content="Microsoft FrontPage 5.0"]') !== null;
  let isMozType = document.querySelector('meta[content^="Mozilla/4') !== null;
  let isWordType = document.querySelector('meta[content^="Microsoft Word "]') !== null;
  let isFullBody = isEmailType || isEmailType2 || isFrontpageType || isMozType || isWordType;

  let isCaseType = document.title === 'UFO Report';
  let caseType = document.querySelector('body > div > table > tbody > tr:nth-child(1) > td > center:nth-child(1) > table > tbody > tr > td:nth-child(2) > center > font > font')?.textContent?.trim();
  let caseType2 = document.querySelector('body > div > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(2) > center > font > font')?.textContent?.trim();
  let caseType3 = document.querySelector('body > table > tbody > tr:nth-child(1) > td > center:nth-child(1) > table > tbody > tr > td:nth-child(2) > center > font > font')?.textContent?.trim();
  let caseType4 = document.querySelector('body > div > div > table > tbody > tr:nth-child(1) > td > center:nth-child(1) > table > tbody > tr > td:nth-child(2) > center > font > font')?.textContent?.trim();
  let caseCat = document.querySelector('body > table:nth-child(1) > tbody > tr > td:nth-child(1) > span:nth-child(5)')?.textContent?.trim();
  let isFirstTableBody = isCaseType;

  let isPhysicalEvidenceCase = document.querySelector('body > table > tbody > tr:nth-child(1) > td > center:nth-child(1) > table > tbody > tr > td:nth-child(2) > center > font:nth-child(3) > font')?.textContent?.trim() === 'Physical Evidence';
  let isFotocat = document.title.endsWith('fotocat');
  let isOther2 = document.head.innerHTML.includes('<meta content="text/html; charset=ISO-8859-1" http-equiv="content-type"');

  let body = '';
  let type = '';

  if (isFullBody) {
    body = document.body.textContent?.trim() || '';
  }
  else if (isFirstTableBody) {
    body = document.querySelector('body > div > div > table')?.textContent?.trim() || '';
  }
  else if (caseType) {
    let node = document.querySelector('body > div > table > tbody > tr > td');

    body = node?.textContent?.trim() || '';
    type = caseType;
  }
  else if (isFotocat) {
    let nodes = document.querySelectorAll('body > div:not(:first-child)');

    body = [...nodes].map(trimTextContent)
      .join('\n')
      .replace(/.*We \(the[\s\S]*the fotocat link above.*/, '');
  }
  else if (isOther2) {
    let nodes = document.querySelectorAll('body > :not(big:first-child)');

    body = [...nodes]
      .map(trimTextContent)
      .join('\n');
  }
  else if (caseType3) {
    let nodes = document.querySelectorAll('body > table > tbody > tr > td > *');

    body = [...nodes]
      .filter(t => !t.innerHTML.includes('<img src="images/title.jpg"'))
      .map(trimTextContent)
      .filter(t => t && t !== 'NICAP Home Page')
      .join('\n');
    type = caseType3;
  }
  else if (caseType4) {
    let nodes = document.querySelectorAll('body > div > div > table > tbody > tr > td > *');

    body = [...nodes]
      .filter(t => !t.innerHTML.includes('<img src="http://www.nicap.org/images/title2.jpg"'))
      .map(trimTextContent)
      .filter(t => t && t !== 'NICAP Home Page')
      .join('\n');
    type = caseType4;
  }
  else if (caseCat) {
    let nodes = document.querySelectorAll('body > :not(:first-child):not(:last-child)');
    body = [...nodes].map(trimTextContent).join('\n');
  }
  else if (caseType2) {
    let nodes = document.querySelectorAll('body > div > table > tbody > tr > td > *');
    body = [...nodes].filter(t => !t.querySelector('img[src="images/title.jpg"]'))
      .map(trimTextContent)
      .join('\n');
    type = caseType2;
  }
  else {
    body = document.body.textContent?.trim() || '';
  }

  let is1252 = document.querySelector('meta[content="text/html; charset=windows-1252"]') !== null;
  if (is1252) body = windows1252.decode(body);

  body = body.split('\n').map(t => t.trim()).join('\n');
  body = body.replace(/\n{3,99}/gm, "\n\n");
  body = body.replace(/(\s) /gm, '$1');
  body = wrap(body);

  return { body, type };
}

function getAttachments(document: Document, skippedHrefs: string[]) {
  return [...document.querySelectorAll('a')]
    .map(a => {
      let href = a.href;
      if (!href.startsWith('http'))
        href = 'http://www.nicap.org/' + href;
      return href;
    })
    .filter(href => !skippedHrefs.includes(href))
    .map(href => ({ url: href }));
}

//
// Transform source-specific record into Phenomenon location & report
//
async function transform(record: NicapRecord): Promise<[Location, Report, Attachment[]]> {
  let id = md5(JSON.stringify(record));
  let location: Location = buildLocation(record);
  let { date, dateDetail, link } = buildDateLink(record);
  let description = record.Description;
  let attachments: Attachment[] = [];

  if (link) {
    if (!link.endsWith('.htm') && !link.endsWith('.html')) {
      attachments.push({ url: link });
    }
    else {
      let url = new URL(link);
      let file = config.sources.nicap.root + url.pathname;
      try {
        let html = await fs.readFile(file, { encoding: 'utf8' });
        let { window } = new JSDOM(html);
        let document = window.document;
        let details = await getDetails(document);
        description += details.body;
        attachments = attachments.concat(details.attachments);
      } catch (error) {
        description += `\n[This NICAP entry had a details link to ${url.pathname}, but the URL couldn't be loaded. -ed]`;
      }
    }
  }

  let report = {
    date,
    description,
    raw: record,
    source: SOURCE_NICAP,
    source_id: id
  };

  return [
    location,
    report,
    attachments
  ];
}

function buildDateLink(record: NicapRecord) {
  let dateParts = record.Date.split(' (http');
  let link = '';

  if (dateParts.length > 1) {
    link = "http" + dateParts[1].substring(0, dateParts[1].length - 1);
  }

  let datePart = dateParts[0];
  let dateParts2 = datePart.split('-');
  let date = '';

  if (dateParts2.length > 1) {
    date = parseDatePart(dateParts2[0]);
  }
  else {
    date = parseDatePart(datePart);
  }

  let dateDetail = '';

  if (!date) {
    let p = datePart.match(/(\d+)[\s-]*?(\w+)?/) || [];

    if (p.length > 1) {
      let numbers = parseInt(p[1], 10);
      dateDetail = p[2];

      if (numbers > 1900 && numbers < 2000) {
        date = `${numbers}-01-01 00:00:00`;
      }
      else if (numbers < 100) {
        date = `19${numbers}-01-01 00:00:00`;
      }
      else if (p[1].length === 4) {
        let y = p[1].substring(0, 2);
        let m = p[1].substring(2, 4);
        date = `19${y}-${m}-01 00:00:00`;
      }
      else {
        // debugger;
      }
    }
    else {
      // debugger;
    }
  }

  return { date, dateDetail, link };
}

function parseDatePart(datePart: string) {
  let year = 0;
  let month = 0;
  let day = 0;
  let time = '';

  if (datePart.length === 8) {
    year = parseInt(datePart.substring(0, 4), 10);

    month = parseInt(datePart.substring(4, 6), 10);
    if (month === 0) month = 1;

    day = parseInt(datePart.substring(6, 8));
    if (day === 0) day = 1;
    if (day > 31) day = 1;

    time = "00:00:00";
  }
  else if (datePart.length === 6) {
    // All nicap reports are in 20th century
    year = 1900 + parseInt(datePart.substring(0, 2), 10);

    month = parseInt(datePart.substring(2, 4), 10);

    if (month === 0) month = 1;

    day = parseInt(datePart.substring(4, 6));

    if (day === 0) day = 1;

    time = "00:00:00";
  }

  if (year !== -1 && month !== -1 && day !== -1 && time) {
    return `${year}-${month}-${day} ${time}`;
  }

  return '';
}

function buildLocation(record: NicapRecord): Location {
  let city = record.City || '';
  // this field has weird spaces because tabula detects this as the field name
  let stateOrCountry = record['State or      Country'];
  if (stateOrCountry === 'D.C.') stateOrCountry = "Washington D.C.";

  let countryCode = getCountryAbbreviationByName(stateOrCountry);

  let unknownLocations = new Set(["LOCATION UNKNOWN", "NO LOCATION DETAILS"]);
  let isUnknownLocation = unknownLocations.has(city.toUpperCase()) && stateOrCountry.toUpperCase() === "UNKNOWN";

  // Unknown/empty locations
  if (isUnknownLocation) {
    return { other: 'Unknown' };
  }

  let countriesToCheckForDistrict = ['US', 'CA', 'UK', 'AU', 'NZ'];

  // e.g. Chicago, IL or Sydney, NSW
  for (const country of countriesToCheckForDistrict) {
    if (isDistrictOf(country, stateOrCountry)) {
      return { city, district: stateOrCountry, country };
    }
  }

  // e.g. London, UK
  if (countryCode) {
    return { city, country: countryCode };
  }

  // Bodies of water e.g. Atlantic Ocean
  if (waterBodies.has(stateOrCountry.toUpperCase())) {
    // debugger;
    return { other: city, water: stateOrCountry };
  }

  if (waterBodies.has(city.toUpperCase())) {
    // debugger;
    return { other: stateOrCountry, water: city };
  }

  if (stateOrCountry.toUpperCase() === 'AT SEA') {
    // debugger;
    return { other: city, water: stateOrCountry };
  }

  if (ukCountries.has(stateOrCountry.toUpperCase())) {
    return { city, district: stateOrCountry, country: 'UK' };
  }

  if (city.endsWith("United States")) {
    city = city.replace("United States", "").trim();
    return { city, country: 'US' };
  }

  let cityParts = city.split(', ');

  if (cityParts.length > 1) {
    let country = cityParts.pop() || '';
    let countryAbbreviation = getCountryAbbreviationByName(country);
    if (countryAbbreviation) {
      cityParts.push(country);
      let city = cityParts.join(', ');
      return { city, country: countryAbbreviation };
    }
  }

  cityParts = city.split(' ');

  if (cityParts.length > 1) {
    let lastCityPart = cityParts.pop() || '';
    let countryAbbreviation = getCountryAbbreviationByName(lastCityPart);
    if (countryAbbreviation) {
      cityParts.push(lastCityPart);
      cityParts.push("(" + stateOrCountry + ")");
      let city = cityParts.join(' ');
      return { other: city, country: countryAbbreviation };
    }
    else if (continents.has(lastCityPart.toUpperCase())) {
      return { other: city, continent: lastCityPart };
    }
  }

  if (continents.has(stateOrCountry.toUpperCase())) {
    return { city, continent: stateOrCountry };
  }

  if (city.endsWith('In Space') || stateOrCountry.endsWith('In Space')) {
    // debugger;
    return { other: `${city} ${stateOrCountry}` };
  }

  console.warn('[NICAP] Malformed location, city:', city, 'state:', stateOrCountry);
  return { city, other: stateOrCountry };
}

let handleData = (createFn: Function, failed: any[]) => async (row: NicapRecord) => {
  try {
    let transformed = await transform(row);
    if (transformed) await createFn(...transformed);
  } catch (error: any) {
    failed.push([error.message, row]);
  }
};

async function done(failed: any[]) {
  await fs.writeFile('log/failed-nicap.json', JSON.stringify(failed, null, 2));
  console.log(`[NICAP] ${failed.length} failed. See logs for details.`);
  console.log('[NICAP] Done.');
}

export async function start(connection: Knex<any, unknown>): Promise<any[]> {
  console.log('[NICAP] Starting...');

  let failed: any[] = [];
  let handlerFn = handleData(createReport(connection), failed);

  return new Promise((resolve, reject) => {
    createReadStream(config.sources.nicap.file)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on('data', handlerFn)
      .on('data-invalid', (row: NicapRecord) => console.error('[NICAP] Invalid CSV row: ', row))
      .on('error', reject)
      .on('close', () => {
        done(failed);
        resolve(failed);
      });
  });
}

export default {
  start
};

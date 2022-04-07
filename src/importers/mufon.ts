import fs from 'fs/promises';
import { Knex } from 'knex';
import { countries } from 'countries-list';
import { Report, Location, Attachment } from '../types';
import { createReport } from '../report';
import { walk } from '../utils';
import config from '../config.json';

let SOURCE_MUFON = 1;

type MufonRecord = {
  id: number,
  submitDate: string,
  eventDate: string;
  summary: string;
  location: string;
  attachments: string[];
  description: string;
};

//
// Transform source-specific record into Phenomenon location & report
//
function transform(record: MufonRecord): [Location, Report, Attachment[]] {
  let location: Location = buildLocation(record);
  let date = buildDate(record);
  let description = buildDescription(record);
  let report = {
    date,
    description,
    raw: record,
    source: SOURCE_MUFON,
    source_id: record.id.toString()
  };
  let attachments = record.attachments.map(r => ({ url: r }));

  return [
    location,
    report,
    attachments
  ];
}

//
// Parse file into source-specific records
//
let parseFile = (addFn: Function) => async (file: string) => {
  if (!file.endsWith('.json')) return;

  let contents = await fs.readFile(file, { encoding: 'utf8' });
  let entries = JSON.parse(contents);
  if (entries.length) {
    await Promise.all(entries.map(async (entry: any) => {
      try {
        let transformed;
        try {
          transformed = transform(entry);
        } catch (error: any) {
          console.log('[MUFON] Error transforming record: ' + error.message);
        }
        if (transformed) await addFn(...transformed, entry);
      } catch (error: any) {
        failed.push([error.message, entry]);
      }
    }));
  }
};

function buildDescription(record: MufonRecord) {
  return record.summary + "\n\n" + record.description;
}

function buildDate(record: MufonRecord) {
  let year = '';
  let month = '';
  let day = '';
  let time = '';

  if (record.eventDate.length >= 10) {
    [year, month, day] = record.eventDate.substring(0, 10).split('-');
    time = record.eventDate.substring(10);
  }
  else {
    [year, month, day] = record.submitDate.substring(0, 10).split('-');
    time = record.eventDate;
  }

  let [submitYear, submitMonth, submitDay] = record.submitDate.substring(0, 10).split('-');
  // if (!year || year === '0000') year = submitYear;
  if (month === '00') month = '01';
  if (day === '00') day = '01';

  if (time.length === 6)
    time = "0" + time;

  let hour = time.substring(0, 2);
  let minute = time.substring(3, 5);
  let meridiem = time.substring(5, 7);

  if (hour === '12') {
    hour = '00';
  }

  if (meridiem === 'PM') {
    hour = (parseInt(hour, 10) + 12).toString();
  }

  let date = `${year}-${month}-${day} ${hour}:${minute}:00`;

  return date;
}

function buildLocation(record: MufonRecord) {
  let location: Location;
  let locationRecord = record.location.split(',').map(s => s.trim()).filter(s => s);
  let isLastPartCountry = countries[locationRecord[locationRecord.length - 1] as keyof typeof countries] !== undefined;
  if (locationRecord.length >= 3) {
    let country = locationRecord.pop() || '';
    let district = locationRecord.pop() || '';
    location = { city: locationRecord.join(', '), district, country };
  }

  // 2 parts, like "Chicago, IL" or "London, UK"
  else if (locationRecord.length === 2) {
    if (isLastPartCountry) {
      if (locationRecord[0].length === 2) {
        // district/country
        location = { city: '', district: locationRecord[0], country: locationRecord[1] };
      }
      else {
        // city/country
        location = { city: locationRecord[0], district: '', country: locationRecord[1] };
      }
    }
    else {
      // city/district
      location = { city: locationRecord[0], district: locationRecord[1], country: '' };
    }
  }

  // single part like "CN" or "Los Angeles"
  else if (locationRecord.length === 1) {
    if (isLastPartCountry) {
      // 2-letter country
      location = { city: '', district: '', country: locationRecord[0] };
    }
    else if (locationRecord[0].length === 2) {
      // 2-letter non-country
      location = { city: '', district: locationRecord[0], country: '' };
    }
    else {
      // not 2-letters single part
      location = { city: locationRecord[0], district: '', country: '' };
    }
  }
  else {
    throw new Error('Invalid location ' + locationRecord);
  }
  return location;
}

let failed: any[] = [];

export async function start(connection: Knex<any, unknown>) {
  console.log('[MUFON] Starting...');

  try {
    let createFn = createReport(connection);
    let parser = parseFile(createFn);
    let files = await walk(config.sources.mufon.path);

    for (const file of files) {
      try {
        await parser(file);
      } catch (error: any) {
        console.log('[MUFON] Error adding report:', error.message);
      }
    }

    await fs.writeFile('log/failed-mufon.json', JSON.stringify(failed, null, 2));
    console.log(`[MUFON] ${failed.length} failed. See logs for details.`);
    console.log('[MUFON] Done.');
  } catch (error: any) {
    console.log('[MUFON] Error adding report:', error.message);
  }

}

export default {
  start
};

import { createReadStream } from 'fs';
import fs from 'fs/promises';
import * as csv from 'fast-csv';
import { Knex } from 'knex';
import { JSDOM } from 'jsdom';
import { Location, Reference } from '../../types';
import { FullRecord, NicapRecord, SOURCE_NICAP } from '../../sources';
import { createReport } from '../../report';
import config from '../../config.json';
import { buildBody } from './buildBody';
import { buildLocation } from './buildLocation';
import { buildDateLink } from './buildDateLink';
import { hash } from '../../utils';

function cleanHrefs(document: Document) {
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

function buildReferences(document: Document, skippedHrefs: string[]) {
  return [...document.querySelectorAll('a')]
    .map(a => {
      let href = a.href;
      if (!href.startsWith('http'))
        href = 'http://www.nicap.org/' + href;
      return href;
    })
    .filter(href => !skippedHrefs.includes(href))
    .map(href => ({ text: "https://web.archive.org/web/" + href }));
}

async function buildDetails(document: Document) {
  let skippedHrefs = cleanHrefs(document);
  let { body, type } = buildBody(document);
  let references = buildReferences(document, skippedHrefs);

  return { body, type, references };
}

//
// Transform source-specific record into Phenomenon location & report
//

async function recordToReport(record: NicapRecord): Promise<FullRecord> {
  let id = hash(JSON.stringify(record)).toString();
  let location: Location = buildLocation(record);
  let { date, dateDetail, link } = buildDateLink(record);
  let description = record.Description;
  let references: Reference[] = [];

  if (link) {
    if (!link.endsWith('.htm') && !link.endsWith('.html')) {
      let text = link;
      if (link.startsWith('http://www.nicap.org')) {
        text = 'https://web.archive.org/web/' + link;
      }
      references.push({ text });
    }
    else {
      let url = new URL(link);
      let file = config.sources.nicap.root + url.pathname;
      try {
        let html = await fs.readFile(file, { encoding: 'utf8' });
        let { window } = new JSDOM(html);
        let document = window.document;
        let details = await buildDetails(document);
        description += details.body;
        references = references.concat(details.references);
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
    source_id: id,
    date_detail: dateDetail
  };

  return {
    location,
    report,
    attachments: [],
    references
  };
}

export default async function start(connection: Knex<any, unknown>): Promise<any[]> {
  console.log('[NICAP] Starting...');

  let failed: any[] = [];
  let addFn = createReport(connection);

  return new Promise((resolve, reject) => {
    createReadStream(config.sources.nicap.file)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on('data', async (row: NicapRecord) => {
        try {
          let transformed = await recordToReport(row);
          await addFn(transformed);
        } catch (error: any) {
          failed.push(error.message);
        }
      })
      .on('data-invalid', (row: NicapRecord) => console.error('[NICAP] Invalid CSV row: ', row))
      .on('error', reject)
      .on('close', async () => {
        await fs.writeFile('failed/failed-nicap.json', JSON.stringify(failed, null, 2));
        console.log(`[NICAP] ${failed.length} failed. See logs for details.`);
        console.log('[NICAP] Done.');
        resolve(failed);
      });
  });
}

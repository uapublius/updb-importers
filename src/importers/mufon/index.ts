import fs from 'fs/promises';
import { Knex } from 'knex';
import Piscina from 'piscina';
import { createReport } from '../../report';
import { walk } from '../../utils';
import config from '../../config.json';
import { FullRecord } from '../../sources';

let queue = new Piscina({ filename: __dirname + '/build.js' });
let addFn: (fullRecord: FullRecord) => Promise<void>;
let failed: any[] = [];

async function parseFile(file: string) {
  if (!file.endsWith('.json')) return;

  let contents = await fs.readFile(file, { encoding: 'utf8' });
  let entries = JSON.parse(contents);

  if (!entries.length) return;

  let allTransformed = [];

  for (let record of entries) {
    try {
      allTransformed.push(await queue.run(record));
    } catch (error) {
      failed.push(error.message);
    }
  }

  for (let transformed of allTransformed) {
    try {
      await addFn(transformed);
    } catch (error) {
      failed.push(error.message);
    }
  }

  console.log(`[MUFON] (${entries.length}) ${file.replace(config.sources.prefix, '')}`);
}

export default async function start(connection: Knex<any, unknown>) {
  console.log('[MUFON] Building file list...');

  addFn = createReport(connection);
  let files = await walk(config.sources.mufon.path);

  console.log(`[MUFON] Found ${files.length} files...`);

  for (let file of files) {
    await parseFile(file);
  }

  await fs.writeFile('failed/failed-mufon.json', JSON.stringify(failed, null, 2));

  console.log(`[MUFON] ${failed.length} failed. See logs for details.`);
  console.log('[MUFON] Done.');

  return failed;
}

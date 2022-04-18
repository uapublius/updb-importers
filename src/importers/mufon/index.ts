import { Knex } from 'knex';
import Piscina from 'piscina';
import { createReport } from '../../report';
import config from '../../config.json';

let queue = new Piscina({ filename: __dirname + '/build.js' });
let failed: any[] = [];

const startId = config.sources.mufon.startId;
let remaining = startId;

export default async function start(connection: Knex<any, unknown>) {
  console.log('[MUFON] Starting...');
  let addFn = createReport(connection);

  setInterval(() => {
    console.log(`[MUFON] Completed: ${startId - remaining}/${startId}`);
  }, 3000);

  for (let idx = startId; idx > 0; idx--) {
    try {
      let transformed = await queue.run(idx);
      if (transformed) await addFn(transformed);
    } catch (error) {
      failed.push(error.message, idx);
    } finally {
      remaining--;
    }
  }

  return failed;
}

import { Knex } from "knex";
import Piscina from "piscina";
import Logger from "js-logger";
import { createReport } from "../../report";
import config from "../../config.json";

let queue = new Piscina({ filename: __dirname + "/build.js", concurrentTasksPerWorker: 1 });
let failed: any[] = [];
let startId = config.sources.mufon.startId;
let remaining = startId;

export default async function start(connection: Knex<any, unknown>) {
  Logger.info("[MUFON] Starting...");
  let addFn = createReport(connection);

  return new Promise(async resolve => {
    setInterval(() => {
      Logger.info(`[MUFON] Completed: ${startId - remaining}/${startId}`);
      if (remaining === 0) resolve(null);
    }, 3000);

    let transformed = [];

    for (let idx = startId; idx > 0; idx -= 1) {
      try {
        let trans = await queue.run(idx);
        if (trans) transformed.push(trans);
      } catch (error) {
        Logger.error(error.message);
        failed.push(error.message, idx);
      } finally {
        remaining--;
      }
    }

    for (const tra of transformed) {
      if (tra) addFn(tra);
    }

    return failed;
  });
}

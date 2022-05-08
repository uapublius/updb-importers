import { Knex } from "knex";
import Piscina from "piscina";
import Logger from "js-logger";
import { createReport } from "../../report";
import { walk } from "../../utils";
import config from "../../config.json";
import path from "path";

let queue = new Piscina({ filename: __dirname + "/build.js" });

export default async function start(connection: Knex<any, unknown>) {
  Logger.info("[PHENOMAINON] Walking files...");

  let createFn = createReport(connection);
  let target = path.join(config.sources.prefix, config.sources.phenomainon.path);
  let files = await walk(target);
  files = files.filter(file => file.endsWith(".out.json"));
  let completed = 0;
  Logger.info(`[PHENOMAINON] ${files.length} files found.`);

  setInterval(async () => {
    Logger.info(`[PHENOMAINON] Completed: ${completed}/${files.length}`);
  }, 3000);

  for (const file of files) {
    try {
      let transformed = await queue.run(file);
      for (const t of transformed) {
        try {
          await createFn(t);
        } catch (error) {
          Logger.error(error.message);
        }
      }
    } catch (error: any) {
      Logger.error(error.message);
    }

    completed++;
  }

  Logger.info(`[PHENOMAINON] Done. ${files.length} files transformed.`);
}

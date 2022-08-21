import Logger from "js-logger";
import { Knex } from "knex";
import Piscina from "piscina";
import path from "path";
import config from "../../config.json";
import { createReport } from "../../report";
import { walk } from "../../utils";

let queue = new Piscina({ filename: __dirname + "/build.js", concurrentTasksPerWorker: 4 });

export default async function start(connection: Knex<any, unknown>) {
  Logger.info("[NUFORC] Walking files...");

  let createFn = createReport(connection);
  let target = path.join(config.sources.prefix, config.sources.nuforc.path);
  let files = await walk(target);
  files = files.filter(file => file.endsWith(".html"));
  let completed = 0;
  Logger.info(`[NUFORC] ${files.length} files found.`);

  setInterval(async () => {
    Logger.info(`[NUFORC] Completed: ${completed}/${files.length}`);
  }, 3000);

  for (const file of files) {
    try {
      let transformed = await queue.run(file);
      await createFn(transformed);
    }
 catch (error: any) {
      Logger.error(error.message);
    }

    completed++;
  }

  Logger.info(`[NUFORC] Done. ${files.length} files transformed.`);
}

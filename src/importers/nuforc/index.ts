import fs from "fs/promises";
import { Knex } from "knex";
import Piscina from 'piscina';
import { createReport } from "../../report";
import { walk } from "../../utils";
import config from "../../config.json";

let queue = new Piscina({ filename: __dirname + '/build.js' });

export default async function start(connection: Knex<any, unknown>) {
  console.log("[NUFORC] Walking files...");

  let failed = [];
  let createFn = createReport(connection);
  let files = await walk(config.sources.nuforc.path);
  files = files.filter(file => file.endsWith(".html"));
  let completed = 0;
  console.log(`[NUFORC] ${files.length} files found.`);

  setInterval(async () => {
    console.log(`[NUFORC] Completed: ${completed}/${files.length}`);
  }, 3000);

  for (const file of files) {
    try {
      let transformed = await queue.run(file);
      await createFn(transformed);
    } catch (error: any) {
      failed.push(error.message);
    }

    completed++;
  }

  console.log(`[NUFORC] ${files.length} files transformed.`);

  await fs.writeFile("failed/failed-nuforc.json", JSON.stringify(failed, null, 2));
  console.log(`[NUFORC] ${failed.length} of ${files.length} failed. See failed/failed-nuforc.json for details.`);
  console.log("[NUFORC] Done.");
}

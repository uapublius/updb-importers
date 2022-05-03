import fs from "fs/promises";
import Piscina from "piscina";
import { Knex } from "knex";
import Logger from "js-logger";
import { createDocument, createDocumentPage } from "../../document";
import { walk } from "../../utils";
import config from "../../config.json";

let queue = new Piscina({ filename: __dirname + "/build.js" });

export default async function start(connection: Knex<any, unknown>) {
  Logger.info("[Documents] Starting...");

  let sources = [];
  for (const path of config.sources.documents.path) {
    sources = [...sources, ...(await walk(path, f => f.endsWith(".ocrv.json")))];
  }
  let addDocFn = createDocument(connection);
  let addPageFn = createDocumentPage(connection);
  let completed = 0;

  setInterval(() => {
    Logger.info(`[Documents] Completed: ${completed}/${sources.length}`);
  }, 3000);

  for (let source of sources) {
    let name = "http://" + source.replace(config.sources.prefix, "").replace(".ocrv.json", "");
    let docSource = await fs.readFile(source);
    let documentRecord = await addDocFn({ name });
    let document;

    try {
      document = JSON.parse(docSource.toString());
    } catch (error) {
      Logger.error(error.message, source);
      continue;
    }

    let numPages = document.length;

    if (!Array.isArray(document)) {
      numPages = Math.max(...Object.keys(document).map(k => parseInt(k)));
    }

    for (let idx = 0; idx < numPages; idx++) {
      try {
        await addPageFn({
          document: documentRecord.id,
          page: idx + 1,
          text: document[idx]
        });
      } catch (error) {
        Logger.error(error.message);
      }
    }

    completed++;
  }
}

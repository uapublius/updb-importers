import fs from "fs/promises";
import { Knex } from "knex";
import Logger from "js-logger";
import { createDocument, createDocumentPages } from "../../document";
import { walk } from "../../utils";
import config from "../../config.json";
import path from "path";

export default async function start(connection: Knex<any, unknown>) {
  Logger.info("[Documents] Starting...");

  let sources = [];

  for (let docPath of config.sources.documents.path) {
    try {
      docPath = path.join(config.sources.prefix, docPath);
      Logger.info(`[Documents (${sources.length})] ${docPath}`);
      sources = [...sources, ...(await walk(docPath, f => f.endsWith(".ocrv.json")))];
    } catch (error) {
      Logger.error(`[DOCUMENTS] ${error.message}`);
    }
  }

  Logger.info(`[Documents (${sources.length})] Built list of ${sources.length} files.`);

  let addDocFn = createDocument(connection);
  let addPagesFn = createDocumentPages(connection);
  let completed = 0;

  setInterval(() => {
    Logger.info(`[Documents] Completed: ${completed}/${sources.length}`);
  }, 3000);

  for (let source of sources) {
    let name = "http://" + source.replace(config.sources.prefix, "").replace(".ocrv.json", "");

    let docSource;

    try {
      docSource = await fs.readFile(source);
    } catch (error) {
      Logger.error(`[DOCUMENTS] ${error.message}`);
      continue;
    }

    let documentRecord = await addDocFn({ name });
    let document;

    try {
      document = JSON.parse(docSource.toString());
    } catch (error) {
      Logger.error(error.message, source);
      continue;
    }

    try {
      await addPagesFn(document, documentRecord.id);
    } catch (error) {
      Logger.error(error.message);
    }

    completed++;
  }
}

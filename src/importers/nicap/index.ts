import { createReadStream } from "fs";
import fs from "fs/promises";
import * as csv from "fast-csv";
import { Knex } from "knex";
import { JSDOM } from "jsdom";
import Logger from "js-logger";
import { Attachment, Location, Reference } from "../../types";
import { FullRecord, NicapRecord, SOURCE_NICAP } from "../../sources";
import { createReport } from "../../report";
import config from "../../config.json";
import { buildBody } from "./buildBody";
import { buildLocation } from "./buildLocation";
import { buildDateLink } from "./buildDateLink";
import { hash } from "../../utils";
import path from "path";

function cleanHrefs(document: Document) {
  let skippedHrefs = [
    "http://www.nicap.org/ratings.htm",
    "http://www.nicap.org/index.htm",
    "http://www.nicap.org/"
  ];

  for (const skippedHref of skippedHrefs) {
    document.querySelector(`a[href='${skippedHref}']`)?.remove();
  }
  return skippedHrefs;
}

function buildReferences(document: Document, skippedHrefs: string[]) {
  return [...document.querySelectorAll("a")]
    .map(a => {
      let href = a.href;
      if (!href.startsWith("http")) href = "http://www.nicap.org/" + href;
      return href;
    })
    .filter(href => !skippedHrefs.includes(href))
    .map(href => ({ text: href }));
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
    if (!link.endsWith(".htm") && !link.endsWith(".html")) {
      let text = link;
      if (link.startsWith("http://www.nicap.org")) {
        text = link;
      }
      references.push({ text });
    } else {
      let url = new URL(link);
      let file = path.join(config.sources.prefix, config.sources.nicap.root, url.pathname);
      try {
        let html = await fs.readFile(file, { encoding: "utf8" });
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

let done = 0;

export default async function start(connection: Knex<any, unknown>): Promise<any[]> {
  Logger.info("[NICAP] Starting...");

  let records = [];

  async function processRecords() {
    for (const record of records) {
      try {
        let transformed = await recordToReport(record);
        if (transformed) {
          await addFn(transformed);
        } else {
          Logger.error("[NICAP] Could not transform", record);
        }
      } catch (error: any) {
        Logger.error(error.message);
      } finally {
        done++;
      }
    }
  }
  let addFn = createReport(connection);

  return new Promise((resolve, reject) => {
    setInterval(() => {
      Logger.info(`[NICAP] Completed: ${done}/${records.length}`);
      if (done === records.length) resolve(null);
    }, 3000);

    createReadStream(config.sources.nicap.file)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on("data", async (row: NicapRecord) => {
        records.push(row);
      })
      .on("data-invalid", (row: NicapRecord) => Logger.error("[NICAP] Invalid CSV row: ", row))
      .on("error", error => {
        Logger.error("[NICAP]" + error.message);
      })
      .on("close", async () => {
        Logger.info(`[NICAP] Done.`);
        await processRecords();
      });
  });
}

import fs from "fs/promises";
import { JSDOM } from "jsdom";
import { buildLocation } from "./buildLocation";
import { buildDate } from "./buildDate";
import { cleanText } from "../../utils";
import { Location } from "../../types";
import { FullRecord, NuforcRecord, SOURCE_NUFORC } from "../../sources";
import config from '../../config.json';
import { fileToRecord } from "./fileToRecord";

//
// NuforcRecord -> Report, Location, Attachments, References
//

export function recordToReport(record: NuforcRecord, file: string): FullRecord {
  let location: Location = buildLocation(record);
  let date = buildDate(record);
  let description = buildDescription(record);
  let report = {
    date,
    description,
    source: SOURCE_NUFORC,
    source_id: record.id.toString()
  };

  let references = [];
  let text = file.replace(config.sources.prefix, 'https://');
  references.push({ text });

  return { location, report, attachments: [], references };
}

function buildDescription(record: NuforcRecord) {
  let desc = "";

  if (record.shape) desc += "Shape: " + record.shape + "\n";
  if (record.duration) desc += "Duration: " + record.duration + "\n";
  if (record.characteristics) desc += "Characteristics: " + record.characteristics + "\n";

  desc += "\n" + record.text;
  desc = cleanText(desc);

  return desc;
}

export default async (file: string): Promise<FullRecord> => {
  let html = await fs.readFile(file, { encoding: "utf8" });
  let { window } = new JSDOM(html);
  let tds = window.document.querySelectorAll("td");
  let entry: NuforcRecord = fileToRecord(file, tds);

  return recordToReport(entry, file);
};

import { SOURCE_PILOTS } from "./../../sources";
import fs from "fs/promises";
import Logger from "js-logger";
import { buildLocation } from "./buildLocation";
import { buildDate } from "./buildDate";
import { cleanText, hash } from "../../utils";
import { Location } from "../../types";
import {
  FullRecord,
  PhenomainonRecord,
  SOURCE_BAASS,
  SOURCE_BLUEBOOK,
  SOURCE_NIDS,
  SOURCE_SKINWALKER,
  SOURCE_CANADAGOV,
  SOURCE_UKTNA,
  SOURCE_BRAZILGOV
} from "../../sources";

Logger.useDefaults();

Logger.setHandler((messages, context) => {
  for (const message of messages) {
    console.log(message);
  }
});

//
// PhenomainonRecord -> Report, Location, Attachments, References
//

export function recordToReport(record: any, source: number): FullRecord {
  if (!record.Date || record.Date === "No data") {
    Logger.error(`[PHENOMAINON ${source}] Skipping record with no date`);
    return;
  }

  let location: Location;

  if (source === SOURCE_SKINWALKER) record.State = "UT";

  try {
    location = buildLocation(record, source);
  } catch (error) {
    Logger.error(
      `[PHENOMAINON ${source}] Could not parse location ` + record.Location + " " + error.message
    );
    return;
  }

  let date;

  try {
    date = buildDate(record);
  } catch (error) {
    Logger.error(`[PHENOMAINON ${source}] Could not parse date ` + record.Date);
    return;
  }

  let description = buildDescription(record);
  let sourceId = record["Catalog Entry"] || record["Case ID"];

  if (!sourceId) {
    sourceId = hash(JSON.stringify(record)).toString();
  }

  let report = {
    date,
    date_detail: record.date,
    description,
    source,
    source_id: sourceId
  };

  let references = [{ text: "https://www.phenomainon.com/data" }];
  return { location, report, attachments: [], references };
}

function buildDescription(record: PhenomainonRecord) {
  let desc = record["Incident"] || record["Summary Description"] || "";

  desc += "\n\n";

  for (const [key, value] of Object.entries(record)) {
    if (
      [
        "Date",
        "Incident",
        "Summary Description",
        "Case ID",
        "Location",
        "State",
        "Country"
      ].includes(key)
    ) {
      continue;
    }
    if (!value || value === "No data") continue;

    let val = value;

    val = value
      .split("|")
      .map(s => s.trim())
      .join("\n  ");

    desc += `${key}: ${val}\n`;
  }

  desc = cleanText(desc);

  return desc;
}

export default async (file: string): Promise<FullRecord> => {
  let json = await fs.readFile(file, { encoding: "utf8" });
  let data = JSON.parse(json);
  let sourcePart = file.match(/(\w+)\.out\.json$/);

  const SOURCES = {
    baass: SOURCE_BAASS,
    nids: SOURCE_NIDS,
    bluebook1: SOURCE_BLUEBOOK,
    bluebook2: SOURCE_BLUEBOOK,
    skinwalker: SOURCE_SKINWALKER,
    pilots: SOURCE_PILOTS,
    canada: SOURCE_CANADAGOV,
    uk: SOURCE_UKTNA,
    brazil: SOURCE_BRAZILGOV
  };

  if (!sourcePart.length) {
    throw new Error("[PHENOMAINON] Could not determine source " + sourcePart);
  }

  let source = SOURCES[sourcePart[1]];

  if (source === undefined) {
    throw new Error("[PHENOMAINON] Could not determine source " + sourcePart[1]);
  }

  return data.map(d => recordToReport(d, source)).filter(r => r);
};

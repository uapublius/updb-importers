import * as chrono from "chrono-node";
import fs from "fs/promises";
import path from "path";
import { JSDOM } from "jsdom";
import { cleanText, getCountryAbbreviationByName, getCountryForDistrict } from "../../utils";
import waterBodies from "../../lib/water-bodies";
import { Location, Reference } from "../../types";
import { UfoDnaRecord, SOURCE_UFODNA, FullRecord } from "../../sources";
import config from "../../config.json";
import Logger from "js-logger";

let now = +new Date();

//
// File -> UfoDnaRecord
//

export function fileToRecord(filename: string, file: string) {
  let { window } = new JSDOM(file);
  let record = window.document.querySelector(
    "body > table > tbody > tr > td > table > tbody > tr:nth-child(2) > td"
  );
  let record2 = window.document.querySelector(
    "body > center > table > tbody > tr:nth-child(2) > td > font"
  );
  let record3 = window.document.querySelector(
    "body > center > table > tbody > tr:nth-child(2) > td"
  );
  let els = record?.childNodes || record2?.childNodes || record3?.childNodes;

  let id = path.parse(filename).name.replace(".html", "");
  let eventDate = "";
  let location = "";
  let text = "";
  let rating = {
    valleeRating: "",
    hynekRating: ""
  };
  let references: number[] = [];

  for (let idx = 0; idx < els.length; idx++) {
    let el = els[idx];
    if (el.nodeType === el.COMMENT_NODE) continue;

    let elText = el.textContent?.trim();
    if (!elText) continue;

    let skipTexts = ["Sources", "Sources: \n-", "-", "Start here"];
    if (skipTexts.includes(elText)) continue;

    elText = elText.replace(/(^: )|(\s?:$)/, "");

    if (el.nodeName === "A") {
      let href = (el as HTMLAnchorElement).href;
      let matches = href.match(/sources?\/(\d+)\.htm$/);
      let matches2 = href.match(/(\d+)\.htm$/);

      if (matches?.length > 1) {
        references.push(parseInt(matches[1]));
      } else if (matches2?.length > 1) {
        references.push(parseInt(matches2[1]));
      } else {
        let skip = ["articles/articles", "/geo/geo/"];

        if (!skip.some(s => href.includes(s))) {
          Logger.warn("Unknown link found:", href);
        }
      }
    } else if (el.nodeName === "P") {
    } else if (el.nodeName === "B") {
      eventDate = el.childNodes[0].textContent.trim().replace(/\s:$/, "");
      location = el.childNodes[2].textContent.trim().replace(/\s:$/, "");
    } else if (el.nodeType === el.TEXT_NODE) {
      let lookup = {
        "Vallee rating": "valleeRating",
        "Hynek rating": "hynekRating"
      };

      if (lookup[elText]) {
        rating[lookup[elText]] = els[idx + 1].textContent?.trim().toUpperCase();
        els[idx].textContent = "";
        els[idx + 1].textContent = "";
        els[idx + 2].textContent = "";
      } else {
        text += elText + "\n";
      }
    } else {
      text += elText + "\n";
    }
  }

  text = text.replace(/^Vallee rating:/, "");
  text = text.replace(/^Hynek rating:/, "");
  text = cleanText(text);

  let entry: UfoDnaRecord = {
    id,
    event_date: eventDate,
    location,
    text,
    valleeRating: rating.valleeRating,
    hynekRating: rating.hynekRating,
    references
  };

  return entry;
}

//
// UfoDnaRecord -> Report, Location, Attachments, References
//

export function recordToReport(
  record: UfoDnaRecord,
  file: string,
  referencesMap: Record<string, number>
): FullRecord {
  let location: Location = buildLocation(record);
  let { value, detail } = buildDate(record);
  let report = {
    date: value,
    date_detail: detail,
    description: record.text,
    source: SOURCE_UFODNA,
    source_id: record.id.toString()
  };

  let references = buildReferences(record, referencesMap, file);

  return { location, report, attachments: [], references };
}

function buildReferences(
  record: UfoDnaRecord,
  referencesMap: Record<string, number>,
  file: string
) {
  let references: Reference[] = record.references
    .filter(r => referencesMap[r])
    .map(r => ({ id: referencesMap[r] }));
  let text = file.replace(config.sources.prefix, "https://web.archive.org/web/http://");
  references.unshift({ text });
  return references;
}

export function buildDate(record: UfoDnaRecord) {
  let eventDate = record.event_date;

  if (eventDate === "1930") debugger;

  if (eventDate.match(/^\d{4}$/)?.length) {
    eventDate = "01/01/" + eventDate + " 00:00";
  }

  eventDate = eventDate.replace(/^In /, "");
  eventDate = eventDate.replace("24:00", "00:00");
  eventDate = eventDate.replace(/Early /i, "January 1 ");
  eventDate = eventDate.replace(/^Mid(dle)?[- ]/i, "July 1 ");
  eventDate = eventDate.replace(/Late /i, "October 1 ");
  eventDate = eventDate.replace(/Spring /i, "March 1 ");
  eventDate = eventDate.replace(/Summer /i, "June 1 ");
  eventDate = eventDate.replace(/Fall /i, "September 1 ");
  eventDate = eventDate.replace(/Winter /i, "December 1 ");
  eventDate = eventDate.replace(/20th Century /i, "1/1/1900 ");
  eventDate = eventDate.replace(/^(\d{4}) (\w+)$/, "Jan 1 $1 $2");
  eventDate = eventDate.replace(/^(\w+) (\d{4}) (\d{2}:\d{2})$/, "$1 1 $2 $3");
  eventDate = eventDate.replace(/^(\d{4}) (\d{2}:\d{2})$/, "Jan 1 $1 $2");

  let parsed = chrono.parse(eventDate, { timezone: "UTC" });

  let detail = record.event_date;

  if (!parsed?.length) {
    let year = eventDate.match(/.*(\d{4}).*/);

    if (year?.length) {
      parsed = chrono.parse("01/01/" + year[1], { timezone: "UTC" });
    } else {
      throw new Error("[Documents] Cannot parse date: " + JSON.stringify(record));
    }
  }

  let [date] = parsed;

  if (date.start.get("year") >= 2022) {
    detail = eventDate;

    let year = eventDate.match(/.*(\d{4}).*/);

    if (year?.length) {
      [date] = chrono.parse("01/01/" + year[1], { timezone: "UTC" });
    } else {
      throw new Error("[Documents] Cannot parse future date: " + JSON.stringify(record));
    }
  }

  let start = date.start;

  let value = `${start.get("year")}-${start.get("month")}-${start.get("day")} ${start.get(
    "hour"
  )}:${start.get("minute")}:${start.get("second")}`;

  return {
    value,
    detail
  };
}

export function buildLocation(record: UfoDnaRecord) {
  let location;
  let locationRecord = record?.location.toUpperCase().match(/((.+)?\,\s)?(.+)?\,\s?(.+)?/);
  if (locationRecord) {
    locationRecord.shift();
    locationRecord = locationRecord.filter(r => r);
  }

  let countryCandidate = "";
  let districtCandidate = "";
  let cityCandidate = "";
  let otherCandidate = "";
  let waterCandidate = "";

  if (!locationRecord) {
    let countryAbbreviation = getCountryAbbreviationByName(record?.location);
    if (countryAbbreviation) {
      countryCandidate = countryAbbreviation;
    } else {
      otherCandidate = record?.location;
    }
  } else {
    if (locationRecord.length === 4) locationRecord.shift();

    if (locationRecord.length === 2) {
      let countryAbbreviation = getCountryAbbreviationByName(locationRecord[1]);
      if (countryAbbreviation) {
        countryCandidate = countryAbbreviation;
        districtCandidate = locationRecord[0];
      } else {
        let countryAbbreviation = getCountryForDistrict(locationRecord[1]);
        if (countryAbbreviation) {
          cityCandidate = locationRecord[0];
          districtCandidate = locationRecord[1];
          countryCandidate = countryAbbreviation;
        } else if (waterBodies.has(locationRecord[1])) {
          waterCandidate = locationRecord[1];
          otherCandidate = locationRecord[0];
        } else {
          otherCandidate = locationRecord.join(", ");
        }
      }
    } else if (locationRecord.length === 3) {
      let countryAbbreviation = getCountryAbbreviationByName(locationRecord[2]);
      if (countryAbbreviation) {
        countryCandidate = countryAbbreviation;
        cityCandidate = locationRecord[0];
        districtCandidate = locationRecord[1];
      } else if (waterBodies.has(locationRecord[2])) {
        waterCandidate = locationRecord[2];
        otherCandidate = locationRecord[0] + ", " + locationRecord[1];
      }
    } else {
      otherCandidate = record?.location.replace(/,$/, "");
    }
  }

  location = {
    city: cityCandidate,
    district: districtCandidate,
    country: countryCandidate,
    other: otherCandidate,
    water: waterCandidate
  };

  return location;
}

//
// Parse file into source-specific records
//

export default async ({ file, referencesMap }): Promise<FullRecord> => {
  if (!file.endsWith(".htm")) return;
  let html = await fs.readFile(file, { encoding: "utf8" });
  let entry = fileToRecord(file, html);
  let report = recordToReport(entry, file, referencesMap);
  return report;
};

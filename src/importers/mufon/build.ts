import path from "path";
import fs from "fs/promises";
import config from "../../config.json";
import { FullRecord, MufonRecord, SOURCE_MUFON } from "./../../sources";
import { buildLocation } from "./buildLocation";
import { buildDate } from "./buildDate";
import { JSDOM, VirtualConsole } from "jsdom";
import { cleanText } from "../../utils";

let virtualConsole = new VirtualConsole();

function processField(r: Element) {
  let hasLinks = [...r.querySelectorAll("a")];

  if (hasLinks.length) {
    return hasLinks.map(a => a.href);
  }

  return cleanText(r.textContent?.trim());
}

export default async (id: string): Promise<FullRecord | null> => {
  // Logger.debug(`[${id}] Build start.`);
  let filePrefix = path.join(config.sources.prefix, config.sources.mufon.path, id.toString());
  let file = filePrefix + ".html";
  let fileDetails = filePrefix + "-detail.html";
  let fileContents = "";
  let fileDetailsContents = "";

  try {
    let fileCont = await Promise.all([await fs.readFile(file), await fs.readFile(fileDetails)]);
    fileContents = fileCont[0].toString();
    fileDetailsContents = fileCont[1].toString();
  } catch (error) {
    return null;
  }

  if (fileContents.includes("Cases Found = 0")) {
    return null;
  }

  let dom = new JSDOM(fileContents, { virtualConsole });
  let domDetails = new JSDOM(fileDetailsContents, { virtualConsole });

  let recordRow = dom.window.document.querySelectorAll(
    'form[name="mufon_form"] > table > tbody > tr:nth-child(3) > td'
  );
  let recordDetail = domDetails.window.document.querySelectorAll(
    "body > center > table > tbody > tr:nth-child(2)"
  );

  let [_, submitDate, eventDate, summary, location, __, attachments] = [...recordRow].map(
    processField
  );
  let [description] = [...recordDetail].map(r => cleanText(r.textContent?.trim()));

  let record: MufonRecord = {
    id,
    submitDate,
    eventDate,
    summary,
    location,
    attachments: attachments || [],
    description
  };

  let report = {
    date: buildDate(record),
    date_detail: record.eventDate,
    description: record.summary + "\n\n" + record.description,
    source: SOURCE_MUFON,
    source_id: record.id.toString()
  };

  let text = `https://mufoncms.com/cgi-bin/report_handler.pl?req=view_long_desc&id=${record.id}&rnd=`;
  let references = [{ text }];

  // Logger.debug(`[${id}] Build done.`);

  return {
    location: buildLocation(record),
    report,
    attachments: record.attachments.map(r => ({ url: r })),
    references
  };
};

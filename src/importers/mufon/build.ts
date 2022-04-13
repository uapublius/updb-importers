import { FullRecord, MufonRecord, SOURCE_MUFON } from './../../sources';
import { Location } from "../../types";
import { cleanText } from "../../utils";
import { buildLocation } from "./buildLocation";
import { buildDate } from "./buildDate";

export default (record: MufonRecord): FullRecord => {
  let location: Location = buildLocation(record);

  let description = cleanText(record.summary + "\n\n" + record.description);

  let report = {
    date: buildDate(record),
    description,
    source: SOURCE_MUFON,
    source_id: record.id.toString()
  };

  let attachments = record.attachments.map(r => ({ url: r }));

  let text = `https://mufoncms.com/cgi-bin/report_handler.pl?req=view_long_desc&id=${record.id}&rnd=`;
  let references = [{ text }];

  return {
    location,
    report,
    attachments,
    references
  };
};

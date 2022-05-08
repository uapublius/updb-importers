import * as chrono from "chrono-node";
import { PhenomainonRecord } from "../../sources";

export function buildDate(record: PhenomainonRecord) {
  let parsed = chrono.parse(record.Date, { timezone: "UTC" });

  if (!parsed?.length) {
    throw new Error("[PHENOMAINON] Cannot parse date: " + JSON.stringify(record));
  }

  let [date] = parsed;
  let start = date.start;

  // @ts-ignore
  if (start.impliedValues.year) {
    throw new Error("[PHENOMAINON] Skipping uncertain year: " + JSON.stringify(record));
  }

  let value = `${start.get("year")}-${start.get("month")}-${start.get("day")} ${start.get(
    "hour"
  )}:${start.get("minute")}:${start.get("second")}`;

  return value;
}

import { NuforcRecord } from "../../sources";

export function buildDate(record: NuforcRecord) {
  let [date] = record.event_date.split(' (Entered as');
  date = date?.trim();

  let [datePart, timePart] = date.split(' ');
  let [month, day, year] = datePart.split('/');

  if (!year) year = "1900";
  if (!day) day = "01";
  if (!month) month = "01";
  if (!timePart) timePart = "00:00";
  if (timePart.split(':').length === 1) timePart += ":00";

  if (month === '20:00') month = '01';

  return `${year}-${month}-${day} ${timePart}`;
}

import { NuforcRecord } from "../../sources";

export function buildDate(record: NuforcRecord) {
  let eventDate = record.event_date || record.reported_date;
  let [date] = eventDate.split(' (Entered as');
  date = date?.trim();

  let [datePart, timePart] = date.split(' ');
  let [month, day, year] = datePart.split('/');

  if (year) {
    if (!day) day = "01";
    if (!month) month = "01";
    if (!timePart) timePart = "00:00";
    if (timePart.split(':').length === 1) timePart += ":00";

    if (month === '20:00') month = '01';

    return `${year}-${month}-${day} ${timePart}`;
  }

  let [_, date2] = eventDate.split(' (Entered as : ');
  date2 = date2?.trim().slice(0, -1);
  let [datePart2, timePart2] = date2.split(' ');
  let [month2, day2, year2] = datePart2.split('/');
  let parsedYear = parseInt(year2);
  if (parsedYear < 100) {
    if (parsedYear > 47) year2 = "19" + year2;
  }
  if (day2 === "??") day2 = "15";

  return `${year2}-${month2}-${day2} ${timePart2}`;
}

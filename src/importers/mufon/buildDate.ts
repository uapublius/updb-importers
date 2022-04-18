import { MufonRecord } from './../../sources';

export function buildDate(record: MufonRecord) {
  let year = '';
  let month = '';
  let day = '';
  let time = '';

  let eventDateParts = record.eventDate.substring(0, 10).split('-');
  let submitDateParts = record.submitDate.substring(0, 10).split('-');

  if (record.eventDate.length >= 10) {
    [year, month, day] = eventDateParts;
    time = record.eventDate.substring(10);
  }
  else {
    [year, month, day] = submitDateParts;
    time = record.eventDate;
  }

  if (month === '00') month = '01';
  if (day === '00') day = '01';
  if (time.length === 6) time = "0" + time;

  let hour = time.substring(0, 2);
  let minute = time.substring(3, 5);
  let meridiem = time.substring(5, 7);

  if (hour === '12') hour = '00';
  if (meridiem === 'PM') hour = (parseInt(hour, 10) + 12).toString();
  if (year === '0000') year = submitDateParts[0];

  let date = `${year}-${month}-${day} ${hour}:${minute}:00`;

  let now = new Date();
  let parsedDate = new Date(parseInt(year), parseInt(month), parseInt(day), parseInt(hour), parseInt(minute), 0);

  if (+parsedDate > +now) {
    throw new Error('Cannot parse future date: ' + date);
  }

  return date;
}

import { MufonRecord } from './../../sources';

export function buildDate(record: MufonRecord) {
  let year = '';
  let month = '';
  let day = '';
  let time = '';

  if (record.eventDate.length >= 10) {
    [year, month, day] = record.eventDate.substring(0, 10).split('-');
    time = record.eventDate.substring(10);
  }
  else {
    [year, month, day] = record.submitDate.substring(0, 10).split('-');
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

  let date = `${year}-${month}-${day} ${hour}:${minute}:00`;

  return date;
}

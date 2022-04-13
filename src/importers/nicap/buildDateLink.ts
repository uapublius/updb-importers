import { NicapRecord } from '../../sources';

export function buildDateLink(record: NicapRecord) {
  let dateParts = record.Date.split(' (http');
  let link = '';

  if (dateParts.length > 1) {
    link = "http" + dateParts[1].substring(0, dateParts[1].length - 1);
  }

  let datePart = dateParts[0];
  let dateParts2 = datePart.split('-');
  let date = '';

  if (dateParts2.length > 1) {
    date = buildDatePart(dateParts2[0]);
  }
  else {
    date = buildDatePart(datePart);
  }

  let dateDetail = '';

  if (!date) {
    let p = datePart.match(/(\d+)[\s-]*?(\w+)?/) || [];

    if (p.length > 1) {
      let numbers = parseInt(p[1], 10);
      dateDetail = p[2];

      if (numbers > 1900 && numbers < 2000) {
        date = `${numbers}-01-01 00:00:00`;
      }
      else if (numbers < 100) {
        date = `19${numbers}-01-01 00:00:00`;
      }
      else if (p[1].length === 4) {
        let y = p[1].substring(0, 2);
        let m = p[1].substring(2, 4);
        date = `19${y}-${m}-01 00:00:00`;
      }
      else {
        // debugger;
      }
    }
    else {
      // debugger;
    }
  }

  return { date, dateDetail, link };
}

function buildDatePart(datePart: string) {
  let year = 0;
  let month = 0;
  let day = 0;
  let time = '';

  if (datePart.length === 8) {
    year = parseInt(datePart.substring(0, 4), 10);

    month = parseInt(datePart.substring(4, 6), 10);
    if (month === 0)
      month = 1;

    day = parseInt(datePart.substring(6, 8));
    if (day === 0)
      day = 1;
    if (day > 31)
      day = 1;

    time = "00:00:00";
  }
  else if (datePart.length === 6) {
    // All nicap reports are in 20th century
    year = 1900 + parseInt(datePart.substring(0, 2), 10);

    month = parseInt(datePart.substring(2, 4), 10);

    if (month === 0)
      month = 1;

    day = parseInt(datePart.substring(4, 6));

    if (day === 0)
      day = 1;

    time = "00:00:00";
  }

  if (year !== -1 && month !== -1 && day !== -1 && time) {
    return `${year}-${month}-${day} ${time}`;
  }

  return '';
}

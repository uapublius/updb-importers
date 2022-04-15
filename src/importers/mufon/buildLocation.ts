import { MufonRecord } from './../../sources';
import { Location } from "../../types";
import { countries } from "countries-list";
import { cleanText } from '../../utils';

export function buildLocation(record: MufonRecord) {
  let location: Location;
  let locationRecord = record.location.split(',').map(s => s.trim()).filter(s => s);
  let isLastPartCountry = countries[locationRecord[locationRecord.length - 1] as keyof typeof countries] !== undefined;
  if (locationRecord.length >= 3) {
    let country = locationRecord.pop() || '';
    let district = locationRecord.pop() || '';
    location = { city: locationRecord.join(', '), district, country };
  }

  // 2 parts, like "Chicago, IL" or "London, UK"
  else if (locationRecord.length === 2) {
    if (isLastPartCountry) {
      if (locationRecord[0].length === 2) {
        // district/country
        location = { city: '', district: locationRecord[0], country: locationRecord[1] };
      }
      else {
        // city/country
        location = { city: locationRecord[0], district: '', country: locationRecord[1] };
      }
    }
    else {
      // city/district
      location = { city: locationRecord[0], district: locationRecord[1], country: '' };
    }
  }

  // single part like "CN" or "Los Angeles"
  else if (locationRecord.length === 1) {
    if (isLastPartCountry) {
      // 2-letter country
      location = { city: '', district: '', country: locationRecord[0] };
    }
    else if (locationRecord[0].length === 2) {
      // 2-letter non-country
      location = { city: '', district: locationRecord[0], country: '' };
    }
    else {
      // not 2-letters single part
      location = { city: locationRecord[0], district: '', country: '' };
    }
  }
  else {
    throw new Error('Invalid location ' + locationRecord);
  }

  for (let key of Object.keys(location)) {
    location[key] = cleanText(location[key].toUpperCase());
  }

  return location;
}

import { MufonRecord } from "./../../sources";
import { Location } from "../../types";
import { countries } from "countries-list";
import { cleanText, getFullDistrictName, isDistrictOf } from "../../utils";
import waterBodies from "../../lib/water-bodies";

export function buildLocation(record: MufonRecord) {
  let location: Location;
  let locationRecord = record.location
    .split(",")
    .map(s => s.trim())
    .filter(s => s);
  let isLastPartCountry =
    countries[locationRecord[locationRecord.length - 1] as keyof typeof countries] !== undefined;

  let countryCandidate = "";
  let districtCandidate = "";
  let cityCandidate = "";
  let otherCandidate = "";
  let waterCandidate = "";

  if (locationRecord.length >= 3) {
    countryCandidate = locationRecord.pop() || "";
    districtCandidate = locationRecord.pop() || "";
    cityCandidate = locationRecord.join(", ");
  }

  // 2 parts, like "Chicago, IL" or "London, UK"
  else if (locationRecord.length === 2) {
    if (isLastPartCountry) {
      if (locationRecord[0].length === 2) {
        // district/country
        countryCandidate = locationRecord[1];
        districtCandidate = locationRecord[0];
      } else {
        // city/country
        countryCandidate = locationRecord[1];
        cityCandidate = locationRecord[0];
      }
    } else {
      // city/district
      districtCandidate = locationRecord[1];
      cityCandidate = locationRecord[0];
    }
  }

  // single part like "CN" or "Los Angeles"
  else if (locationRecord.length === 1) {
    if (isLastPartCountry) {
      // 2-letter country
      countryCandidate = locationRecord[0];
    } else if (waterBodies.has(locationRecord[0].toUpperCase())) {
      // last part is water
      waterCandidate = locationRecord[0].toUpperCase();
    } else {
      // other single part (no commas)
      otherCandidate = locationRecord[0];
    }
  } else {
    throw new Error("Invalid location " + locationRecord);
  }

  location = {
    city: cityCandidate,
    district: getFullDistrictName(districtCandidate, countryCandidate),
    country: countryCandidate,
    other: otherCandidate,
    water: waterCandidate
  };

  for (let key of Object.keys(location)) {
    location[key] = cleanText(location[key].toUpperCase());
  }

  return location;
}

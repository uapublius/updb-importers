import {
  cleanText,
  getCountryAbbreviationByName,
  getFullDistrictName,
  isDistrictOf
} from "../../utils";
import { NuforcRecord } from "../../sources";
import waterBodies from "../../lib/water-bodies";
import { Location } from "../../types";

export function buildLocation(record: NuforcRecord) {
  let locationRecord = record.location
    .toUpperCase()
    .match(/(.*)?\,(.*)/)
    .map(s => s?.trim());
  locationRecord.shift();
  let location: Location;

  if (locationRecord.length === 1) {
    location = buildLocationLength1(locationRecord, record);
  } else if (locationRecord.length === 2) {
    location = buildLocationLength2(locationRecord);
  } else if (locationRecord.length === 3) {
    location = buildLocationLength3(locationRecord, record);
  } else if (locationRecord.length === 4 && locationRecord[2] === locationRecord[3]) {
    locationRecord.pop();
    location = buildLocationLength3(locationRecord, record);
  } else if (!locationRecord.length) {
    location = { city: "", district: "", country: "" };
  } else {
    location = { city: "", district: "", country: "", other: record.location };
  }

  return {
    city: cleanText(location.city),
    district: cleanText(getFullDistrictName(location.district, location.country)),
    country: cleanText(location.country),
    water: cleanText(location.water),
    other: cleanText(location.other)
  };
}

function buildCountryDistrictByName(name: string) {
  let country = "";
  let district = "";
  let other = "";

  country = getCountryAbbreviationByName(name);

  let nameParts = name.split("/");

  if (nameParts.length === 2) {
    let [countryPart, districtPart] = nameParts;
    if (countryPart === "UK") countryPart = "GB";
    country = getCountryAbbreviationByName(countryPart);
    district = districtPart;
  }

  if (!country) {
    nameParts = name.split(" ");
    country = getCountryAbbreviationByName(nameParts[nameParts.length - 1]);
  }

  if (!country) {
    other = name;
  }

  return { country, district, other };
}

function buildCityCountry(locationRecord: string[], countryRaw?: string) {
  let cityRaw = locationRecord[0]?.trim();
  if (cityRaw.startsWith("Whitestone")) debugger;
  let city = "";
  let country = "";
  let cityParts = cityRaw?.match(/^(.*)\s?\((.*)\)$/);

  if (cityParts && cityParts.length === 3) {
    let cityPartRaw = cityParts[1]?.trim();
    let countryPartRaw = cityParts[2]?.trim();
    // has country in parens - use first part for city name
    city = cityPartRaw;

    if (countryRaw) {
      // country passed, see if matches
      if (
        buildCountryDistrictByName(countryRaw).country !==
        buildCountryDistrictByName(countryPartRaw).country
      ) {
        throw new Error(`Country in parens doesnt match country value\n` + locationRecord);
      }

      country = buildCountryDistrictByName(countryRaw).country;
    } else {
      // no country, use value in parens
      country = countryPartRaw;
    }
  } else {
    city = cityRaw;
  }

  return { city, country };
}

export function buildLocationLength1(locationRecord: string[], record: NuforcRecord) {
  if (waterBodies.has(locationRecord[0])) {
    return { water: locationRecord[0] };
  }

  // e.g. Karnatakaa (Chamarajanagar)(India)
  let locationParts1 = locationRecord[0]?.match(/^(.*)\s?\((.*)\)\s?\((.*)\)$/);

  if (locationParts1 && locationParts1.length === 4) {
    let { country, district } = buildCountryDistrictByName(locationParts1[3]);
    let city = locationParts1[2]?.trim();
    district = district || locationParts1[1]?.trim();
    return { city, district, country };
  }

  // e.g. Berlin (Germany)
  let locationParts2 = locationRecord[0]?.match(/^(.*)\s?\((.*)\)$/);

  if (locationParts2 && locationParts2.length === 3) {
    let { country, district } = buildCountryDistrictByName(locationParts2[2]);
    let city = locationParts2[1]?.trim();

    if (isDistrictOf(country, city)) {
      // district is in city field (happens in e.g. Dunbartionshire, Scotland, GB)
      district = city + ", " + district;
      city = "";
    }

    return { city, district, country };
  }

  let locationParts3 = locationRecord[0].split(",").map(s => s.trim());
  let firstLocationPart = locationParts3[0];

  if (isDistrictOf("US", firstLocationPart)) {
    return { city: "", district: firstLocationPart, country: "US" };
  } else if (getCountryAbbreviationByName(firstLocationPart)) {
    return { city: "", district: "", country: getCountryAbbreviationByName(firstLocationPart) };
  } else {
    return { city: firstLocationPart, district: "", country: "" };
  }
}

export function buildLocationLength2(locationRecord: string[]) {
  let city = locationRecord[0]?.trim();
  let district = locationRecord[1]?.trim();
  let countriesToCheckForDistrict = ["US", "CA", "UK", "AU", "NZ"];

  for (const country of countriesToCheckForDistrict) {
    if (isDistrictOf(country, district)) {
      return { city, district, country };
    }
  }

  let locationParts2 = city?.match(/^(.*)\s?\((.*)\)$/);

  if (locationParts2 && locationParts2.length === 3) {
    let { city, country } = buildCityCountry(locationRecord, locationParts2[2]);
    return { city, district, country };
  }

  return { city, district, country: "" };
}

export function buildLocationLength3(locationRecord: string[], record: NuforcRecord) {
  let isSameDistrictAndCountry = locationRecord[1]?.trim() === locationRecord[2]?.trim();
  if (isSameDistrictAndCountry) return buildLocationLength2(locationRecord);

  let countryRaw = locationRecord[2]?.trim();
  let { city, country } = buildCityCountry(locationRecord, countryRaw);
  let district = locationRecord[1]?.trim();

  return { city, district, country };
}

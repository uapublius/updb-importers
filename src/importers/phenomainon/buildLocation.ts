import {
  cleanText,
  getCountryAbbreviationByName,
  getFullDistrictName,
  isDistrictOf
} from "../../utils";
import { PhenomainonRecord } from "../../sources";
import waterBodies from "../../lib/water-bodies";
import { Location } from "../../types";

export function buildLocation(record: PhenomainonRecord) {
  let locationField = record.Location?.trim() || "";
  let cityCandidate = "";
  let districtCandidate = record.State?.trim() || "";
  let countryCandidate = record.Country?.trim() || "";
  let otherCandidate = "";
  let waterCandidate = "";

  let locationFieldParts = [locationField.toUpperCase()];

  if (locationField) {
    let parts = locationField.toUpperCase().match(/(.*)?\,(.*)/);
    if (parts?.length > 1) {
      parts = parts.map(s => s?.trim());
      parts.shift();
      locationFieldParts = parts;
    }
  }

  let location: Location;
  let locationCandidate;

  if (locationFieldParts.length === 1) {
    locationCandidate = buildLocationLength1(locationFieldParts, record);
  } else if (locationFieldParts.length === 2) {
    locationCandidate = buildLocationLength2(locationFieldParts);
  } else if (locationFieldParts.length === 3) {
    locationCandidate = buildLocationLength3(locationFieldParts, record);
  } else if (locationFieldParts.length === 4 && locationFieldParts[2] === locationFieldParts[3]) {
    locationFieldParts.pop();
    locationCandidate = buildLocationLength3(locationFieldParts, record);
  } else {
    otherCandidate = record.Location;
  }

  if (locationCandidate.city) cityCandidate = locationCandidate.city;
  if (locationCandidate.district) districtCandidate = locationCandidate.district;
  if (locationCandidate.country) countryCandidate = locationCandidate.country;
  if (locationCandidate.water) waterCandidate = locationCandidate.water;
  if (locationCandidate.other) otherCandidate = locationCandidate.other;

  location = {
    city: cityCandidate,
    district: districtCandidate,
    country: countryCandidate,
    water: waterCandidate,
    other: otherCandidate
  };

  return {
    city: cleanText(location.city),
    district: cleanText(getFullDistrictName(location.district, location.country)),
    country: getCountryAbbreviationByName(cleanText(location.country)),
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

export function buildLocationLength1(locationRecord: string[], record: PhenomainonRecord) {
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

  let parts = locationRecord[0].split(",");
  if (parts.length) {
    let locationParts3 = parts.map(s => s.trim());
    let firstLocationPart = locationParts3[0];

    if (isDistrictOf("US", firstLocationPart)) {
      return { district: firstLocationPart, country: "US" };
    } else if (getCountryAbbreviationByName(firstLocationPart)) {
      return { country: getCountryAbbreviationByName(firstLocationPart) };
    } else {
      return { city: firstLocationPart };
    }
  } else {
    return { city: locationRecord[0] };
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

  return { city, district };
}

export function buildLocationLength3(locationRecord: string[], record: PhenomainonRecord) {
  let isSameDistrictAndCountry = locationRecord[1]?.trim() === locationRecord[2]?.trim();
  if (isSameDistrictAndCountry) return buildLocationLength2(locationRecord);

  let countryRaw = locationRecord[2]?.trim();
  let { city, country } = buildCityCountry(locationRecord, countryRaw);
  let district = locationRecord[1]?.trim();

  return { city, district, country };
}

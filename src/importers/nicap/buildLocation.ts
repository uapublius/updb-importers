import waterBodies from "../../lib/water-bodies";
import { Location } from "../../types";
import { NicapRecord } from "../../sources";
import {
  cleanText,
  getCountryAbbreviationByName,
  getCountryForDistrict,
  getFullDistrictName,
  ukCountries
} from "../../utils";

export function buildLocation(record: NicapRecord): Location {
  let city = record.City?.toUpperCase() || "";
  let cityParts = city.split(", ");
  let cityPartsSp = city.split(" ");
  // this field has weird spaces because tabula detects this as the field name
  let stateOrCountry = record["State or      Country"].toUpperCase();
  if (stateOrCountry === "D.C.") stateOrCountry = "WASHINGTON D.C.";

  let countryCode = getCountryAbbreviationByName(stateOrCountry);
  let countryForDistrict = getCountryForDistrict(stateOrCountry);

  let unknownLocations = new Set(["LOCATION UNKNOWN", "NO LOCATION DETAILS"]);
  let isUnknownLocation =
    unknownLocations.has(city.toUpperCase()) && stateOrCountry.toUpperCase() === "UNKNOWN";

  let countryCandidate = "";
  let districtCandidate = "";
  let cityCandidate = "";
  let otherCandidate = "";
  let waterCandidate = "";

  // Unknown/empty locations
  if (isUnknownLocation) {
    otherCandidate = "Unknown";
  } else if (countryForDistrict) {
    // e.g. Chicago, IL or Sydney, NSW
    countryCandidate = countryForDistrict;
    cityCandidate = city;
    districtCandidate = stateOrCountry;
  } else if (countryCode) {
    // e.g. London, UK
    cityCandidate = city;
    countryCandidate = countryCode;
  } else if (waterBodies.has(stateOrCountry.toUpperCase())) {
    // Bodies of water e.g. Atlantic Ocean
    waterCandidate = stateOrCountry;
    otherCandidate = city;
  } else if (waterBodies.has(city.toUpperCase())) {
    // Bodies of water e.g. Atlantic Ocean
    waterCandidate = city;
    otherCandidate = stateOrCountry;
  } else if (stateOrCountry.toUpperCase() === "AT SEA") {
    waterCandidate = stateOrCountry;
    otherCandidate = city;
  } else if (ukCountries.has(stateOrCountry.toUpperCase())) {
    cityCandidate = city;
    districtCandidate = stateOrCountry;
    countryCandidate = "UK";
  } else if (city.endsWith("UNITED STATES")) {
    cityCandidate = city.replace("UNITED STATES", "").trim();
    countryCandidate = "US";
  } else {
    if (cityParts.length > 1) {
      let country = cityParts.pop() || "";
      let countryAbbreviation = getCountryAbbreviationByName(cityParts.pop() || "");
      if (countryAbbreviation) {
        cityParts.push(country);
        let city = cityParts.join(", ");
        cityCandidate = city;
        countryCandidate = countryAbbreviation;
      } else {
        otherCandidate = city + " " + stateOrCountry;
      }
    } else if (cityPartsSp.length > 1) {
      let lastCityPart = cityPartsSp.pop() || "";
      let countryAbbreviation = getCountryAbbreviationByName(lastCityPart);
      if (countryAbbreviation) {
        cityPartsSp.push(lastCityPart);
        cityPartsSp.push("(" + stateOrCountry + ")");
        let city = cityPartsSp.join(" ");
        otherCandidate = city;
        countryCandidate = countryAbbreviation;
      } else {
        otherCandidate = city + " " + stateOrCountry;
      }
    } else {
      // Logger.warn('[NICAP] Unparsed location, city:', city, 'state:', stateOrCountry);
      otherCandidate = city + " " + stateOrCountry;
    }
  }

  let location = {
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

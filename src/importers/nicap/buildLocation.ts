import waterBodies from '../../lib/water-bodies';
import { Location } from '../../types';
import { NicapRecord } from '../../sources';
import { continents, getCountryAbbreviationByName, isDistrictOf, ukCountries } from '../../utils';

export function buildLocation(record: NicapRecord): Location {
  let city = record.City?.toUpperCase() || '';
  // this field has weird spaces because tabula detects this as the field name
  let stateOrCountry = record['State or      Country'].toUpperCase();
  if (stateOrCountry === 'D.C.')
    stateOrCountry = "WASHINGTON D.C.";

  let countryCode = getCountryAbbreviationByName(stateOrCountry);

  let unknownLocations = new Set(["LOCATION UNKNOWN", "NO LOCATION DETAILS"]);
  let isUnknownLocation = unknownLocations.has(city.toUpperCase()) && stateOrCountry.toUpperCase() === "UNKNOWN";

  // Unknown/empty locations
  if (isUnknownLocation) {
    return { other: 'Unknown' };
  }

  let countriesToCheckForDistrict = ['US', 'CA', 'UK', 'AU', 'NZ'];

  // e.g. Chicago, IL or Sydney, NSW
  for (const country of countriesToCheckForDistrict) {
    if (isDistrictOf(country, stateOrCountry)) {
      return { city, district: stateOrCountry, country };
    }
  }

  // e.g. London, UK
  if (countryCode) {
    return { city, country: countryCode };
  }

  // Bodies of water e.g. Atlantic Ocean
  if (waterBodies.has(stateOrCountry.toUpperCase())) {
    // debugger;
    return { other: city, water: stateOrCountry };
  }

  if (waterBodies.has(city.toUpperCase())) {
    // debugger;
    return { other: stateOrCountry, water: city };
  }

  if (stateOrCountry.toUpperCase() === 'AT SEA') {
    // debugger;
    return { other: city, water: stateOrCountry };
  }

  if (ukCountries.has(stateOrCountry.toUpperCase())) {
    return { city, district: stateOrCountry, country: 'UK' };
  }

  if (city.endsWith("UNITED STATES")) {
    city = city.replace("UNITED STATES", "").trim();
    return { city, country: 'US' };
  }

  let cityParts = city.split(', ');

  if (cityParts.length > 1) {
    let country = cityParts.pop() || '';
    let countryAbbreviation = getCountryAbbreviationByName(country);
    if (countryAbbreviation) {
      cityParts.push(country);
      let city = cityParts.join(', ');
      return { city, country: countryAbbreviation };
    }
  }

  cityParts = city.split(' ');

  if (cityParts.length > 1) {
    let lastCityPart = cityParts.pop() || '';
    let countryAbbreviation = getCountryAbbreviationByName(lastCityPart);
    if (countryAbbreviation) {
      cityParts.push(lastCityPart);
      cityParts.push("(" + stateOrCountry + ")");
      let city = cityParts.join(' ');
      return { other: city, country: countryAbbreviation };
    }
    else if (continents.has(lastCityPart.toUpperCase())) {
      return { other: city, continent: lastCityPart };
    }
  }

  if (continents.has(stateOrCountry.toUpperCase())) {
    return { city, continent: stateOrCountry };
  }

  if (city.endsWith('In Space') || stateOrCountry.endsWith('In Space')) {
    if (city === stateOrCountry)
      return { other: city };
    return { other: `${city} ${stateOrCountry}` };
  }

  // console.warn('[NICAP] Malformed location, city:', city, 'state:', stateOrCountry);
  return { city, other: stateOrCountry };
}

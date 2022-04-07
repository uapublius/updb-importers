import fs from 'fs/promises';
import path from 'path';
import { countries } from 'countries-list';
import countries3to2 from 'countries-list/dist/countries3to2.json';
import provinces from 'provinces';

export async function walk(directoryName: string, results: string[] = []) {
  let files = await fs.readdir(directoryName, { withFileTypes: true });

  for (let file of files) {
    let fullPath = path.join(directoryName, file.name);

    if (file.isDirectory()) {
      await walk(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

export function isDistrictOf(country: string, district: string) {
  country = getCountryAbbreviationByName(country);
  return provinces.some(p => (p.name === district || p.short === district || p.alt?.includes(district)) && p.country === country);
}

export let getCountryAbbreviationByName = (name: string = '') => {
  let nameKey = name.toUpperCase() as keyof typeof countries3to2;

  if (name.length === 3 && countries3to2[nameKey] !== undefined) {
    return countries3to2[nameKey].toString();
  }

  // Democracy++
  if (name === "USSR") name = "Russia";
  if (name === "East Germany") name = "Germany";
  if (name === "West Germany") name = "Germany";
  if (name === "Annam") name = "Vietnam";

  if (name === "UK") name = "GB";
  if (name === "Holland") name = "Netherlands";
  if (name === "Rumania") name = "Romania";
  if (name === "Virgin Islands") name = "U.S. Virgin Islands";

  let country = Object.entries(countries).find(([k, c]) => c.name === name || k === name);
  return country?.[0] || '';
};

export let ukCountries = new Set(['ENGLAND', 'SCOTLAND', 'WALES', 'NORTHERN IRELAND']);

export let continents = new Set(['AFRICA', 'EUROPE', 'ANTARCTICA', 'SOUTH AMERICA', 'NORTH AMERICA', 'ASIA', 'AUSTRALIA']);

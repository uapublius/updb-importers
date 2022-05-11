import fs from "fs/promises";
import path from "path";
import { countries } from "countries-list";
import countries3to2 from "countries-list/dist/countries3to2.json";
import provinces from "provinces";
import { decode } from "html-entities";

export let provincesUpperCased = provinces.map(p => {
  if (p.name) p.name = p.name.toUpperCase();
  if (p.alt) p.alt = p.alt.map(a => a.toUpperCase());
  return p;
});

export function getFullDistrictName(district, country) {
  district = district.toUpperCase();

  let found = provincesUpperCased.find(
    p =>
      (p.short === district || p.alt?.includes(district)) &&
      p.country.toUpperCase() === country.toUpperCase()
  );

  if (found) return found.name;

  return district;
}

export async function walk(
  directoryName: string,
  filter = (f: string) => true,
  results: string[] = []
) {
  let files = await fs.readdir(directoryName, { withFileTypes: true });

  for (let file of files) {
    let fullPath = path.join(directoryName, file.name);

    if (file.isDirectory()) {
      await walk(fullPath, filter, results);
    } else {
      if (filter(file.name)) results.push(fullPath);
    }
  }

  return results;
}

export function isDistrictOf(country: string = "", district: string = "") {
  if (district) district = district.toUpperCase();
  country = getCountryAbbreviationByName(country);
  return provincesUpperCased.some(
    p =>
      (p.name === district || p.short === district || p.alt?.includes(district)) &&
      p.country === country
  );
}

export let getCountryAbbreviationByName = (name: string = "") => {
  name = name.toUpperCase();
  let nameKey = name as keyof typeof countries3to2;

  if (name.length === 3 && countries3to2[nameKey] !== undefined) {
    return countries3to2[nameKey].toString().toUpperCase();
  }

  // Democracy++
  if (name === "USSR") name = "RUSSIA";
  if (name === "EAST GERMANY") name = "GERMANY";
  if (name === "WEST GERMANY") name = "GERMANY";
  if (name === "ANNAM") name = "VIETNAM";

  if (name === "USA") name = "US";
  if (name === "UK") name = "GB";
  if (name === "S. AFRICA") name = "SOUTH AFRICA";
  if (name === "HOLLAND") name = "NETHERLANDS";
  if (name === "KOREA") name = "SOUTH KOREA";
  if (name === "UAE") name = "UNITED ARAB EMIRATES";
  if (name === "RUMANIA") name = "ROMANIA";
  if (name === "BOSNIA") name = "BOSNIA AND HERZEGOVINA";
  if (name === "VIRGIN ISLANDS") name = "U.S. VIRGIN ISLANDS";

  let country = Object.entries(countries).find(
    ([k, c]) => c.name?.toUpperCase() === name || k?.toUpperCase() === name
  );
  return country?.[0]?.toUpperCase() || "";
};

export let ukCountries = new Set(["ENGLAND", "SCOTLAND", "WALES", "NORTHERN IRELAND"]);

export let continents = new Set([
  "AFRICA",
  "EUROPE",
  "ANTARCTICA",
  "SOUTH AMERICA",
  "NORTH AMERICA",
  "ASIA",
  "AUSTRALIA"
]);

export function getCountryForDistrict(district: string) {
  let countriesToCheckForDistrict = ["US", "CA", "UK", "AU", "NZ"];

  for (const country of countriesToCheckForDistrict) {
    if (isDistrictOf(country, district)) {
      return country;
    }
  }
}

export function stripUnicodeSpecial(str) {
  let re = [
    /\0-\x1F\x7F-\x9F\xAD\u0378\u0379\u0380-\u0383\u038B\u038D\u03A2\u0530\u0557\u0558\u058B\u058C\u0590\u05C8-\u05CF\u05EB-\u05EE\u05F5-\u0605\u061C\u06DD\u070E\u070F\u074B\u074C\u07B2-\u07BF\u07FB\u07FC\u082E\u082F\u083F\u085C\u085D\u085F\u086B-\u086F\u088F-\u0897\u08E2\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09FF\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A77-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF2-\u0AF8\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B54\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B78-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BFB-\u0BFF\u0C0D\u0C11\u0C29\u0C3A\u0C3B\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5B\u0C5C\u0C5E\u0C5F\u0C64\u0C65\u0C70-\u0C76\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDC\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0CFF\u0D0D\u0D11\u0D45\u0D49\u0D50-\u0D53\u0D64\u0D65\u0D80\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DE5\u0DF0\u0DF1\u0DF5-\u0E00\u0E3B-\u0E3E\u0E5C-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F48\u0F6D-\u0F70\u0F98\u0FBD\u0FCD\u0FDB-\u0FFF\u10C6\u10C8-\u10CC\u10CE\u10CF\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u137D-\u137F\u139A-\u139F\u13F6\u13F7\u13FE\u13FF\u169D-\u169F\u16F9-\u16FF\u1716-\u171E\u1737-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17DE\u17DF\u17EA-\u17EF\u17FA-\u17FF\u180E\u181A-\u181F\u1879-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191F\u192C-\u192F\u193C-\u193F\u1941-\u1943\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19DD\u1A1C\u1A1D\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1A9F\u1AAE\u1AAF\u1ACF-\u1AFF\u1B4D-\u1B4F\u1B7F\u1BF4-\u1BFB\u1C38-\u1C3A\u1C4A-\u1C4C\u1C89-\u1C8F\u1CBB\u1CBC\u1CC8-\u1CCF\u1CFB-\u1CFF\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FC5\u1FD4\u1FD5\u1FDC\u1FF0\u1FF1\u1FF5\u1FFF\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2072\u2073\u208F\u209D-\u209F\u20C1-\u20CF\u20F1-\u20FF\u218C-\u218F\u2427-\u243F\u244B-\u245F\u2B74\u2B75\u2B96\u2CF4-\u2CF8\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D71-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E5E-\u2E7F\u2E9A\u2EF4-\u2EFF\u2FD6-\u2FEF\u2FFC-\u2FFF\u3040\u3097\u3098\u3100-\u3104\u3130\u318F\u31E4-\u31EF\u321F\uA48D-\uA48F\uA4C7-\uA4CF\uA62C-\uA63F\uA6F8-\uA6FF\uA7CB-\uA7CF\uA7D2\uA7D4\uA7DA-\uA7F1\uA82D-\uA82F\uA83A-\uA83F\uA878-\uA87F\uA8C6-\uA8CD\uA8DA-\uA8DF\uA954-\uA95E\uA97D-\uA97F\uA9CE\uA9DA-\uA9DD\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A\uAA5B\uAAC3-\uAADA\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB6C-\uAB6F\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBC3-\uFBD2\uFD90\uFD91\uFDC8-\uFDCE\uFDD0-\uFDEF\uFE1A-\uFE1F\uFE53\uFE67\uFE6C-\uFE6F\uFE75\uFEFD-\uFF00\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFDF\uFFE7\uFFEF-\uFFFB\uFFFC\uFFFD\uFFFE\uFFFF/
  ];
  return str.replace(re, "");
}

export function cleanText(text) {
  text = decode(text);
  text = stripUnicodeSpecial(text);
  text = text.replace(/\n{3,99}/gm, "\n\n");
  text = text.replace(/(\s) /gm, "$1");
  text = text.replace(/�/gm, "1");
  text = text.trim();
  return text;
}

export function trimTextContent(t: Element) {
  return t.textContent?.trim();
}

export function hash(text) {
  let hash = 5381;
  let index = text.length;

  while (index) {
    hash = (hash * 33) ^ text.charCodeAt(--index);
  }

  return (hash >>> 0).toString(36);
}

export function object2array(o) {
  let arr = [];

  for (let idx = 0; idx < Object.keys(o).length; idx++) {
    arr.push(o[idx]);
  }

  return arr;
}

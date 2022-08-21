import { Knex } from "knex";
import Logger from "js-logger";
import provinces from "provinces";
import { Location } from '../../types';

export let provincesUpperCased = provinces.map(p => {
  if (p.name) p.name = p.name.toUpperCase();
  if (p.alt) p.alt = p.alt.map(a => a.toUpperCase());
  return p;
});

export function getDistrictName(district, country) {
  district = district.toUpperCase();

  let found = provincesUpperCased.find(
    p =>
      (p.name === district || p.alt?.includes(district)) &&
      p.country.toUpperCase() === country.toUpperCase()
  );

  return found;
}

export default async function start(
  connection: Knex<any, unknown>,
  connectionGeo: Knex<any, unknown>
) {
  Logger.info("[COUNTRIES] Starting...");

  let locations = await connection("api.location").where({
    // geoname_id: null,
    // city: 'BELOIT',
  }).offset(parseInt(process.env.UPDB_OFFSET) || 0).limit(parseInt(process.env.UPDB_LIMIT) || 10000);

  for (const location of locations) {
    let province = getDistrictName(location.district, location.country);

    // feature classes:
    // A: country, state, region,...
    // H: stream, lake, ...
    // L: parks,area, ...
    // P: city, village,...
    // R: road, railroad
    // S: spot, building, farm
    // T: mountain,hill,rock,...
    // U: undersea
    // V: forest,heath,...

    let geonames;
    let where: Record<string, unknown> = {};

    if (location.city) {
      location.city = location.city.replace(/ \(.*\)$/, '');
      where = {
        ucname: location.city,
        country: location.country,
        fclass: "P"
      };
      if (province) where.admin1 = province.short;
    } else if (location.district) {
      where = {
        ucname: location.district,
        country: location.country,
        fclass: "A"
      };
    } else if (location.country) {
      if (location.water) {
        where = {
          ucname: location.water,
          country: location.country
        };
        console.log("water", where);
      } else if (location.other) {
        where = {
          ucname: location.other,
          country: location.country
        };
        console.log("other", where);
      }
    } else {
      console.log("No country, skipping.", location);
      continue;
    }

    try {
      let nname = where.ucname?.toString() || "zzzz";
      delete where.ucname;
      geonames = await connectionGeo("geoname_aph_pop")
        .select("*")
        .where(where)
        .andWhereRaw('(ucname = ? OR ? = ANY(alts))', [nname, nname]);

      if (geonames.length) {
        await updateLocationWithGeo(connection, location, geonames);
        console.log("✓ Found populated area, applying geo data...", location);
      }
      else {
        // geonames = await connectionGeo("geoname_aph_unpop")
        //   .select("*")
        //   .where(where)
        //   .orWhereRaw('? = ANY(alts)', where.ucname.toString());
        // if (geonames.length) {
        //   console.log("Found unpopulated area", location);
        //   await updateLocationWithGeo(connection, location, geonames);
        // }
        // else {
        //   console.log("Could not find an unpopulated area... skipping", location);
        // }
        console.log("! Could not find populated area, skipping...", location);
      }
    } catch (error) {
      console.log(error.message, location);
    }
  }
}

async function updateLocationWithGeo(connection: Knex<any, unknown>, location: Location, geonames: Record<string, unknown>[]) {
  let geoname;

  if (geonames.length === 1) {
    geoname = geonames[0];
    // console.log("Got single match, applying lat/long");
  } else {
    geoname = geonames.reduce((prev, curr) =>
      prev.population < curr.population ? prev : curr
    );
    // console.log("Multiple candidates, applying lat/long to highest pop");
  }

  await connection("api.location").where("id", location.id).update({
    geoname_id: geoname.id,
    latitude: geoname.latitude,
    longitude: geoname.longitude
  });
}

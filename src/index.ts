import Logger from "js-logger";
import knex from "knex";
import fs from "fs/promises";
import config from "./config.json";
import ImportDocuments from "./importers/documents";
import GeolocateLocations from "./importers/geolocations";
import ImportMufon from "./importers/mufon";
import ImportNicap from "./importers/nicap";
import ImportNuforc from "./importers/nuforc";
import ImportPhenomainon from "./importers/phenomainon";
import ImportUfoDna from "./importers/ufodna";

Logger.useDefaults();

let connection = knex({ client: "pg", connection: config.database.connection });
let connectionGeo = knex({ client: "pg", connection: config.database_geo.connection });

(async () => {
  let log = [];
  Logger.setHandler((messages, context) => {
    for (const message of messages) {
      console.log(message);
      if (context.level.value < 3) {
        log.push(message);
      }
    }
  });

  if (!config.sources.documents.disabled) {
    let connectionDocs = knex({ client: "pg", connection: config.database_docs.connection });
    await ImportDocuments(connectionDocs);
    Logger.info(`[DOCUMENTS] Done.`);
  }

  if (!config.sources.phenomainon.disabled) {
    await ImportPhenomainon(connection);
    Logger.info(`[PHENOMAINON] Done.`);
  }

  if (!config.sources.ufodna.disabled) {
    await ImportUfoDna(connection);
    Logger.info(`[UFODNA] Done.`);
  }

  if (!config.sources.nicap.disabled) {
    await ImportNicap(connection);
    Logger.info(`[NICAP] Done.`);
  }

  if (!config.sources.nuforc.disabled) {
    await ImportNuforc(connection);
    Logger.info(`[NUFORC] Done.`);
  }

  if (!config.sources.mufon.disabled) {
    await ImportMufon(connection);
    Logger.info(`[MUFON] Done.`);
  }

  await fs.writeFile("./out.log", log.join("\n"), { flag: "a+" });

  await GeolocateLocations(connection, connectionGeo);

  Logger.info("Done.");
  process.exit();
})();

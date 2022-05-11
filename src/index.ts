import fs from "fs/promises";
import knex from "knex";
import Logger from "js-logger";
import config from "./config.json";
import ImportMufon from "./importers/mufon";
import ImportNuforc from "./importers/nuforc";
import ImportNicap from "./importers/nicap";
import ImportUfoDna from "./importers/ufodna";
import ImportPhenomainon from "./importers/phenomainon";
import ImportDocuments from "./importers/documents";

Logger.useDefaults();

let connection = knex({ client: "pg", connection: config.database.connection });

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

  Logger.info("Done.");
  process.exit();
})();

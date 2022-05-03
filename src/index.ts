import fs from "fs/promises";
import knex from "knex";
import Logger from "js-logger";
import config from "./config.json";
import ImportMufon from "./importers/mufon";
import ImportNuforc from "./importers/nuforc";
import ImportNicap from "./importers/nicap";
import ImportUfoDna from "./importers/ufodna";
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
    await ImportDocuments(knex({ client: "pg", connection: config.database_docs.connection }));
  }

  if (!config.sources.ufodna.disabled) {
    await ImportUfoDna(connection);
  }

  if (!config.sources.nicap.disabled) {
    await ImportNicap(connection);
  }

  if (!config.sources.nuforc.disabled) {
    await ImportNuforc(connection);
  }

  if (!config.sources.mufon.disabled) {
    await ImportMufon(connection);
    Logger.info(`[MUFON] Done.`);
  }

  await fs.writeFile("./out.log", log.join("\n"), { flag: "a+" });

  Logger.info("Done.");
  process.exit();
})();

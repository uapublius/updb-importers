import fs from 'fs/promises';
import knex from 'knex';
import config from './config.json';
import ImportMufon from './importers/mufon';
import ImportNuforc from './importers/nuforc';
import ImportNicap from './importers/nicap';

let connection = knex({
  client: 'pg',
  connection: config.database.connection
});

(async () => {
  await Promise.all([
    ImportMufon.start(connection),
    ImportNuforc.start(connection),
    ImportNicap.start(connection)
  ]);

  console.log('Done..');
  process.exit();
})();

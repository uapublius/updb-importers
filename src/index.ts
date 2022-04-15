import fs from 'fs/promises';
import knex from 'knex';
import config from './config.json';
import ImportMufon from './importers/mufon';
import ImportNuforc from './importers/nuforc';
import ImportNicap from './importers/nicap';
import ImportUfoDna from './importers/ufodna';

let connection = knex({
  client: 'pg',
  connection: config.database.connection
});

(async () => {
  await ImportNicap(connection);
  await ImportNuforc(connection);

  let failed = await ImportMufon(connection);
  console.log(`[MUFON]  Done. ${failed.length} failed. See logs for details.`);
  await fs.writeFile('failed/failed-mufon.json', JSON.stringify(failed, null, 2));

  await ImportUfoDna(connection);

  console.log('Done.');
  process.exit();
})();

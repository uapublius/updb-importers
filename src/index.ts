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
  await ImportMufon(connection);
  await ImportUfoDna(connection);

  console.log('Done..');
  process.exit();
})();

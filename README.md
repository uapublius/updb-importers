# UPDB Importers

- First init your database from the `sql/` dir.

- The `db/` folder has a postgres dump you can use in your own projects.

  - It was generated with: `pg_dump --file "data/backup.pgbackup" --format=c --blobs --data-only "phenomenon"`.
  - Then use pg_restore to restore it.

- Move src/config.default.json to src/config.json and enter db/path details.
- Consumes raw files generated by [up-scrapers]()
- Extracts and normalizes the data to a format matching the UPDB schema.
- Inserts the records into the postgres database used by [up-db]()
- Update `src/config.json` to point to mirrors before running

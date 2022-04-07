# UPDB Importers

Parses and normalizes sundry UFO databases to a common format.

| Current sources |
| --------------- |
| ✅ NUFORC |
| ✅ MUFON |
| ✅ NICAP |

⚠️ Check the `log/` folder for a listing of records that could not be parsed because of an invalid date or location.

## Database

* The `db/` folder has a postgres dump you can use in your own projects.
* The dump file is stored using git-lfs, since it is so large. To get it:
    - Install [git-lfs](https://git-lfs.github.com) and `git pull`, or
    - [Download it directly](https://github.com/uapublius/updb-importers/raw/main/db/phenomenon.sql.gz) from github
* Then use pg_restore to restore it (create the `phenomenon` database first).
    - `gunzip -c db/phenomenon.sql.gz | psql phenomenon`

## Config

* Move src/config.default.json to src/config.json and enter db/path details.
  - Paths are to the output directories of [updb-scrapers](https://github.com/uapublius/updb-scrapers)

## Contributing

To get started writing your own importer (simplified):
  * Write a function that converts your records into a [`Report`](src/types.ts) and a [`Location`](src/types.ts)
  * Call [`createReport(Location, Report)`](src/report.ts)
  * Check out the [existing importers](src/importers) for the full details.

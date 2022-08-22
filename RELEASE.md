# Release Checklist

- Make sure any new imported locations have been geolocated
- Regenerate report_count_by_location.csv when new data imported & increment localStorage key

## Transfer database

### In updb-importers/db
```
pg_dump phenomenon | gzip > phenomenon.sql.gz
scp -r -P 22000 phenomenon.sql.gz root@updb.app:/tmp
pg_dump phenomenon_docs | gzip > phenomenon_docs.sql.gz
scp -r -P 22000 phenomenon_docs.sql.gz root@updb.app:/tmp
```

### On server
```
su postgres
cd /tmp
dropdb -f phenomenon && createdb phenomenon
gunzip -c phenomenon.sql.gz | psql -v ON_ERROR_STOP=1 phenomenon
dropdb -f phenomenon_docs && createdb phenomenon_docs
gunzip -c phenomenon_docs.sql.gz | psql -v ON_ERROR_STOP=1 phenomenon_docs
```

```
mv phenomenon.sql.gz /var/www/updb.app/server/dist/client/
mv phenomenon_docs.sql.gz /var/www/updb.app/server/dist/client/
```

## Transfer app

### In updp-app/
```
npm run build
rsync --port 22000 -a --delete-after dist/ root@updb.app:/var/www/updb.app/server/dist/
```

- If packages changed, update package.json + npm install

### On server
```
systemctl restart node
rm -rf /var/cache/nginx/*
```

- If schema changed, reload postgrest

## Mirror attachments + db

- Export csv of new attachment urls from database (sort by id desc), and import to archive.org.
  - `rm -rf /var/cache/nginx/*` when all attachments are mirrored
- mv two .sql.gz from `/tmp` to `/var/www/updb.app/server/dist/client/assets/` + have archive.org crawl them
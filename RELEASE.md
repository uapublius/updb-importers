# Release Checklist

## Transfer database

In updb-importers/
```
pg_dump phenomenon | gzip > phenomenon.sql.gz
scp -r -P 22000 phenomenon.sql.gz root@updb.app:/tmp
```

On server
```
su postgres
cd /tmp
dropdb -f phenomenon && createdb phenomenon
gunzip -c phenomenon.sql.gz | psql -v ON_ERROR_STOP=1 phenomenon
```

## Transfer app

In updp-app/
```
npm run build
rsync --port 22000 -a --delete-after dist/ root@updb.app:/var/www/updb.app/server/dist/
```

On server
```
systemctl restart node
rm -rf /var/cache/nginx/*
```
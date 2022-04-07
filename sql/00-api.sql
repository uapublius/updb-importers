--
-- See https://postgrest.org/en/stable/tutorials/tut0.html#step-4-create-database-for-api
--
CREATE SCHEMA api;

SET search_path TO api,
  public;

CREATE role web_anon nologin;

GRANT USAGE ON schema api TO web_anon;

CREATE role authenticator noinherit login PASSWORD 'secret';

GRANT web_anon TO authenticator;

GRANT SELECT ON api.report TO web_anon;

GRANT SELECT ON api.location TO web_anon;

GRANT SELECT ON api.attachment TO web_anon;

GRANT SELECT ON api.source TO web_anon;

GRANT SELECT ON api.report_view TO web_anon;
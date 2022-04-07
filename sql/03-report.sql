-- report ----------------------------------------------
CREATE EXTENSION unaccent;

CREATE TEXT SEARCH CONFIGURATION en (COPY = english);

ALTER TEXT SEARCH CONFIGURATION en ALTER MAPPING FOR hword,
hword_part,
word WITH unaccent,
english_stem;

CREATE TABLE api.report (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source integer REFERENCES api.source(id),
  source_id character varying(255),
  date timestamp without time zone NOT NULL,
  description text,
  location integer REFERENCES api.location(id),
  raw json NOT NULL,
  date_end timestamp without time zone,
  date_detail text,
  ts tsvector GENERATED ALWAYS AS (to_tsvector('en'::regconfig, description)) STORED
);

COMMENT ON COLUMN api.report.date IS 'The date reported, in local time';

COMMENT ON COLUMN api.report.date_end IS 'If the report indicates a span of time, this is the reported end of the event in local time';

COMMENT ON COLUMN api.report.date_detail IS 'Provide additional detail if the date is not exact, e.g. "Spring" or "Late"';

CREATE UNIQUE INDEX report_source_source_id_idx ON api.report(source int4_ops, source_id text_ops);

CREATE INDEX ts_idx ON api.report USING GIN (ts tsvector_ops);

CREATE INDEX report_date_idx ON api.report(date timestamp_ops);
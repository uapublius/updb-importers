-- attachment ----------------------------------------------
CREATE TABLE api.attachment (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url text NOT NULL,
  report integer NOT NULL REFERENCES api.report(id)
);

CREATE UNIQUE INDEX attachment_url_report_idx ON api.attachment(url text_ops, report int4_ops);
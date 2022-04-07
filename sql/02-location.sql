-- location ----------------------------------------------
CREATE TABLE api.location (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    city text NOT NULL DEFAULT ''::text,
    district text NOT NULL DEFAULT ''::text,
    country character varying(2) NOT NULL DEFAULT ''::character varying,
    continent text NOT NULL DEFAULT ''::text,
    water text NOT NULL DEFAULT ''::text,
    other text NOT NULL DEFAULT ''::text
);

COMMENT ON COLUMN api.location.city IS 'City/Town/Village';

COMMENT ON COLUMN api.location.district IS 'State (US)/Province (CA)/Federal District (MX)/County (UK)';

COMMENT ON COLUMN api.location.country IS '2-letter country code';

COMMENT ON COLUMN api.location.continent IS 'If the report is not country specific (e.g. Antartica). This can be left blank if country is provided.';

COMMENT ON COLUMN api.location.water IS 'If the report is on a large body of water (e.g. middle of Lake Michigan, or Indian Ocean). If near a coast, please use nearest city. If a large lake, provide country. If international waters, all other fields can be empty.';

COMMENT ON COLUMN api.location.other IS 'Another location e.g. In orbit';

CREATE UNIQUE INDEX location_city_district_country_idx ON api.location(
    city text_ops,
    district text_ops,
    country text_ops
);
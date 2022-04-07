-- source ----------------------------------------------
CREATE TABLE api.source (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE
);

INSERT INTO api.source (name)
VALUES ('MUFON');

INSERT INTO api.source (name)
VALUES ('NUFORC');

INSERT INTO api.source (name)
VALUES ('NICAP');
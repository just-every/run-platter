-- Additive native records. data_json retains typed fields, exact decimal lexemes,
-- source columns and import evidence; these are not legacy p_clients records.
CREATE TABLE p_companies (
 id TEXT PRIMARY KEY,
 data_json TEXT NOT NULL CHECK(json_valid(data_json) AND json_extract(data_json,'$.id') IS id),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1)
);
CREATE TABLE p_contacts (
 id TEXT PRIMARY KEY,
 company_id TEXT REFERENCES p_companies(id) ON DELETE RESTRICT,
 data_json TEXT NOT NULL CHECK(json_valid(data_json) AND json_extract(data_json,'$.id') IS id
   AND json_extract(data_json,'$.company_id') IS company_id),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1)
);
CREATE INDEX p_contacts_company ON p_contacts(company_id);
CREATE TABLE p_catalog_items (
 id TEXT PRIMARY KEY,
 data_json TEXT NOT NULL CHECK(json_valid(data_json) AND json_extract(data_json,'$.id') IS id),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1)
);
CREATE TABLE p_import_business_revisions (
 kind TEXT NOT NULL CHECK(kind IN ('companies','contacts','catalog')),
 target_id TEXT NOT NULL,
 revision TEXT NOT NULL,
 PRIMARY KEY(kind,target_id)
);

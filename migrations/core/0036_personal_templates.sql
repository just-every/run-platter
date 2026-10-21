-- Personal proposal content is independent of the proposal it was saved from.
CREATE TABLE p_personal_templates (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES oa_operators(id),
 name TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version >= 1),
 snapshot TEXT NOT NULL,
 pdf_enabled INTEGER NOT NULL CHECK(pdf_enabled IN (0,1)),
 expiry TEXT NOT NULL,
 suggestion_sections TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX p_personal_templates_owner ON p_personal_templates(owner_id,updated_at);

ALTER TABLE p_document_moveins ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'documents';
ALTER TABLE p_document_moveins ADD COLUMN review_json TEXT NOT NULL DEFAULT '{}';
-- Bindings are business custody, never recipient or sending authority.
CREATE TABLE p_imported_document_contacts (
 document_id TEXT PRIMARY KEY REFERENCES p_imported_documents(id) ON DELETE RESTRICT,
 contact_id TEXT NOT NULL REFERENCES p_contacts(id) ON DELETE RESTRICT
);
-- Exact original business outputs fence every bounded undo batch together.
CREATE TABLE p_document_business_outputs (
 kind TEXT NOT NULL CHECK(kind IN ('companies','contacts')), target_id TEXT NOT NULL,
 movein_id TEXT NOT NULL REFERENCES p_document_moveins(id), data_json TEXT NOT NULL,
 revision TEXT NOT NULL, PRIMARY KEY(kind,target_id)
);

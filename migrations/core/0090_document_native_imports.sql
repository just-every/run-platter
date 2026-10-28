-- Exact native rows owned by a reviewed move-in, guarded again before undo.
CREATE TABLE p_document_native_imports (
 id TEXT PRIMARY KEY,
 rows_json TEXT NOT NULL CHECK(json_valid(rows_json)),
 revision TEXT NOT NULL
);
ALTER TABLE p_document_moveins ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE p_document_moveins ADD COLUMN mapping_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE p_proposal_folders ADD COLUMN parent_id TEXT REFERENCES p_proposal_folders(id);
CREATE TABLE p_imported_document_folders (
 document_id TEXT NOT NULL REFERENCES p_imported_documents(id),
 folder_id TEXT NOT NULL REFERENCES p_proposal_folders(id),
 PRIMARY KEY(document_id,folder_id)
);

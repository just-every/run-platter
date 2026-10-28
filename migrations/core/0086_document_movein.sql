CREATE TABLE p_document_moveins (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, label TEXT NOT NULL,
 job_id TEXT, fingerprint TEXT, choices_json TEXT NOT NULL DEFAULT '{}', report_json TEXT
);
CREATE TABLE p_document_uploads (
 movein_id TEXT NOT NULL REFERENCES p_document_moveins(id),
 sha256 TEXT NOT NULL, filename TEXT NOT NULL, size INTEGER NOT NULL,
 received INTEGER NOT NULL DEFAULT 0, complete INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(movein_id,sha256)
);
CREATE TABLE p_document_upload_chunks (
 movein_id TEXT NOT NULL, sha256 TEXT NOT NULL, position INTEGER NOT NULL,
 base64 TEXT NOT NULL, size INTEGER NOT NULL,
 PRIMARY KEY(movein_id,sha256,position),
 FOREIGN KEY(movein_id,sha256) REFERENCES p_document_uploads(movein_id,sha256)
);
CREATE TABLE p_imported_documents (
 id TEXT PRIMARY KEY, data_json TEXT NOT NULL,
 revision TEXT NOT NULL
);
-- A later reissue keeps its original alive until that dependency is removed.
CREATE TABLE p_imported_document_links (
 document_id TEXT NOT NULL REFERENCES p_imported_documents(id),
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 PRIMARY KEY(document_id,proposal_id)
);

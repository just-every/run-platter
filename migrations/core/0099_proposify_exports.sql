ALTER TABLE p_document_moveins ADD COLUMN provider TEXT NOT NULL DEFAULT 'generic';
ALTER TABLE p_document_moveins ADD COLUMN configuration_json TEXT NOT NULL DEFAULT '{}';

-- Reviewed fixed-page outputs retain lineage, without importing execution authority.
CREATE TABLE p_proposify_applications (
 id TEXT PRIMARY KEY,
 movein_id TEXT NOT NULL REFERENCES p_document_moveins(id),
 document_id TEXT NOT NULL,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 template_id TEXT NOT NULL,
 fingerprint TEXT NOT NULL UNIQUE,
 source_sha256 TEXT NOT NULL,
 previous_document TEXT NOT NULL,
 applied_document TEXT NOT NULL,
 applied_version INTEGER NOT NULL,
 applied_revision INTEGER NOT NULL,
 template_snapshot TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 reversed_at INTEGER,
 UNIQUE(document_id,proposal_id)
);

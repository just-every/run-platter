-- Exported folder trees retain private owner custody and participate in import undo.
ALTER TABLE p_proposal_folders ADD COLUMN parent_id TEXT REFERENCES p_proposal_folders(id);
ALTER TABLE p_proposal_folders ADD COLUMN owner_id TEXT;
ALTER TABLE p_proposal_folders ADD COLUMN movein_id TEXT REFERENCES p_document_moveins(id);
CREATE TABLE p_pandadoc_folder_trees (
 id TEXT PRIMARY KEY REFERENCES p_document_moveins(id),
 value_json TEXT NOT NULL,
 revision TEXT NOT NULL
);
-- Explicit new drafts keep their original and never inherit invitation authority.
CREATE TABLE p_document_reissues (
 document_id TEXT PRIMARY KEY REFERENCES p_imported_documents(id),
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 fingerprint TEXT NOT NULL,
 created_at INTEGER NOT NULL
);

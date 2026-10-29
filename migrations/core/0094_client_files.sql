-- Immutable custody has no executable invitation or verification capability.
CREATE TABLE p_client_files (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL,
 invitation_hash TEXT NOT NULL,
 field_id TEXT NOT NULL,
 file_id TEXT PRIMARY KEY REFERENCES p_attachment_files(id) ON DELETE RESTRICT,
 created_at INTEGER NOT NULL
);
CREATE INDEX p_client_files_offer ON p_client_files(proposal_id,revision,invitation_hash,field_id);
CREATE TRIGGER p_client_file_immutable BEFORE UPDATE ON p_client_files
 BEGIN SELECT RAISE(ABORT,'Client file custody is immutable'); END;

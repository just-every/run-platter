-- Business history contains no invitation credentials.
CREATE TABLE p_signer_replacements (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL, old_recipient TEXT NOT NULL, new_recipient TEXT NOT NULL,
 actor_id TEXT NOT NULL, actor_email TEXT NOT NULL, replaced_at INTEGER NOT NULL,
 reason TEXT NOT NULL, signing_position INTEGER NOT NULL CHECK(signing_position>0),
 required_method TEXT NOT NULL
);
-- Revoked capabilities are installation-local and never restored from archives.
CREATE TABLE p_replaced_links (
 token TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL
);
ALTER TABLE p_shares ADD COLUMN signing_position INTEGER NOT NULL DEFAULT 1 CHECK(signing_position>0);

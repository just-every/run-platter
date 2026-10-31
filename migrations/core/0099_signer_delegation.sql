-- Delegation facts are retained business history; authority stays installation-local.
CREATE TABLE p_signer_delegations (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 old_recipient TEXT NOT NULL,
 new_recipient TEXT NOT NULL,
 delegate_name TEXT NOT NULL,
 delegated_at INTEGER NOT NULL,
 signing_position INTEGER NOT NULL CHECK(signing_position>0),
 required_method TEXT NOT NULL,
 undone_at INTEGER,
 undone_by TEXT
);
CREATE TABLE p_delegation_authority (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 owner_id TEXT NOT NULL,
 authorized_at INTEGER NOT NULL
);
ALTER TABLE p_shares ADD COLUMN verification_required INTEGER NOT NULL DEFAULT 0 CHECK(verification_required IN (0,1));
ALTER TABLE p_shares ADD COLUMN delegation_id TEXT;

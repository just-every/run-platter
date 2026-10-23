ALTER TABLE p_agent_keys ADD COLUMN discovery_consent_at INTEGER;
CREATE TABLE p_discovery_drafts (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 sources TEXT NOT NULL,
 citations TEXT NOT NULL,
 unmatched TEXT NOT NULL,
 catalog_snapshot TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(proposal_id,revision)
);

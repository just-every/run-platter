-- Reviews confer no authority after restore. Applied provenance is business history.
CREATE TABLE p_crm_draft_reviews (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL,
 actor_version INTEGER NOT NULL, connection_version INTEGER NOT NULL,
 account_id TEXT NOT NULL, client_json TEXT, source_json TEXT NOT NULL, content_json TEXT NOT NULL,
 digest TEXT NOT NULL, created_at INTEGER NOT NULL, applied_proposal_id TEXT
);
CREATE TABLE p_crm_draft_sources (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), provider TEXT NOT NULL,
 account_id TEXT NOT NULL, connection_version INTEGER NOT NULL,
 deal_id TEXT NOT NULL, company_id TEXT NOT NULL, contact_id TEXT NOT NULL,
 source_json TEXT NOT NULL, digest TEXT NOT NULL, reviewed_by TEXT NOT NULL, reviewed_at INTEGER NOT NULL
);

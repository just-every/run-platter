-- Retained mappings never grant restored provider execution authority.
CREATE TABLE p_invoice_authority (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), authority TEXT NOT NULL,
 account_id TEXT NOT NULL, version INTEGER NOT NULL, selected_by TEXT NOT NULL, selected_at INTEGER NOT NULL
);
CREATE TABLE p_xero_reviews (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, actor_version INTEGER NOT NULL, operator_version INTEGER NOT NULL,
 connection_version INTEGER NOT NULL, authority_version INTEGER NOT NULL, account_id TEXT NOT NULL,
 accepted_digest TEXT NOT NULL, source_json TEXT NOT NULL, digest TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE p_xero_contacts (
 account_id TEXT NOT NULL, client_id TEXT NOT NULL REFERENCES p_clients(id),
 contact_id TEXT, status TEXT NOT NULL, request_json TEXT NOT NULL,
 PRIMARY KEY(account_id,client_id), UNIQUE(account_id,contact_id)
);
CREATE TABLE p_xero_jobs (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 account_id TEXT NOT NULL, connection_version INTEGER NOT NULL, authority_version INTEGER NOT NULL,
 actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, actor_version INTEGER NOT NULL, operator_version INTEGER NOT NULL,
 accepted_digest TEXT NOT NULL, request_json TEXT NOT NULL, contact_json TEXT NOT NULL,
 status TEXT NOT NULL, reason TEXT, invoice_id TEXT, created_at INTEGER NOT NULL, completed_at INTEGER,
 UNIQUE(account_id,invoice_id)
);
CREATE TABLE p_xero_execution (proposal_id TEXT PRIMARY KEY REFERENCES p_xero_jobs(proposal_id));

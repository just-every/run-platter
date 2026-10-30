-- Retained accounting requests are business history. Execution grants stay local.
CREATE TABLE p_accounting_settings (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), version INTEGER NOT NULL,
 authority TEXT NOT NULL CHECK(authority='quickbooks'), account_id TEXT NOT NULL,
 connection_version INTEGER NOT NULL, authorized_by TEXT NOT NULL, authorized_at INTEGER NOT NULL
);
CREATE TABLE p_accounting_authority (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), version INTEGER NOT NULL,
 operator_version INTEGER NOT NULL, member_version INTEGER NOT NULL
);
CREATE TABLE p_accounting_reviews (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL, actor_id TEXT NOT NULL,
 digest TEXT NOT NULL, plan TEXT NOT NULL, expires_at INTEGER NOT NULL, consumed_at INTEGER
);
CREATE TABLE p_accounting_jobs (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), review_id TEXT NOT NULL UNIQUE,
 account_id TEXT NOT NULL, client_id TEXT NOT NULL, revision INTEGER NOT NULL,
 settings_version INTEGER NOT NULL, connection_version INTEGER NOT NULL,
 authorized_by TEXT NOT NULL, actor_role TEXT NOT NULL, operator_version INTEGER NOT NULL,
 member_version INTEGER NOT NULL, plan TEXT NOT NULL, authorized_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','running','complete','held')),
 reason TEXT, provider_id TEXT, started_at INTEGER, completed_at INTEGER
);
CREATE TABLE p_accounting_job_authority (proposal_id TEXT PRIMARY KEY REFERENCES p_accounting_jobs(proposal_id));
CREATE TABLE p_accounting_customers (
 account_id TEXT NOT NULL, client_id TEXT NOT NULL, provider_id TEXT, name TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('reserved','writing','complete','uncertain')),
 PRIMARY KEY(account_id,client_id), UNIQUE(account_id,provider_id)
);
CREATE TABLE p_accounting_requests (
 proposal_id TEXT NOT NULL REFERENCES p_accounting_jobs(proposal_id), kind TEXT NOT NULL,
 request_id TEXT NOT NULL UNIQUE, body TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('writing','confirmed','uncertain')),
 provider_id TEXT, requested_at INTEGER NOT NULL, PRIMARY KEY(proposal_id,kind)
);

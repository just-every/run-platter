-- Exact reviewed writes are single use; receipts retain history without authority.
CREATE TABLE p_crm_provider_reviews (
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, actor_version INTEGER NOT NULL,
 connection_version INTEGER NOT NULL, account_id TEXT NOT NULL,
 proposal_version INTEGER NOT NULL, revision INTEGER NOT NULL,
 plan_json TEXT NOT NULL, source_json TEXT NOT NULL, digest TEXT NOT NULL,
 created_at INTEGER NOT NULL, consumed_at INTEGER
);
CREATE TABLE p_crm_provider_attempts (
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, review_id TEXT NOT NULL,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 account_id TEXT NOT NULL, deal_id TEXT NOT NULL, operation_key TEXT NOT NULL,
 request_json TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('sending','confirmed','uncertain')),
 provider_id TEXT, attempted_by TEXT NOT NULL, attempted_at INTEGER NOT NULL, confirmed_at INTEGER,
 UNIQUE(provider,account_id,deal_id,operation_key)
);
CREATE TABLE p_crm_provider_consents (
 id TEXT PRIMARY KEY, provider TEXT NOT NULL, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL, account_id TEXT NOT NULL, deal_id TEXT NOT NULL,
 actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, connection_version INTEGER NOT NULL,
 source_json TEXT NOT NULL, plan_json TEXT NOT NULL, digest TEXT NOT NULL, authorized_at INTEGER NOT NULL
);

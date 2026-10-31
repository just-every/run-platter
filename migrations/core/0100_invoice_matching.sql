-- Retained requests lock the verified company. Reconnection does not change it.
CREATE TABLE p_accounting_company (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 provider TEXT NOT NULL CHECK(provider='quickbooks'), account_id TEXT NOT NULL,
 requested_by TEXT NOT NULL, requested_at INTEGER NOT NULL
);
-- Reviews are short-lived local authority and are excluded from archives.
CREATE TABLE p_invoice_match_reviews (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 deposit_id TEXT NOT NULL REFERENCES p_invoices(id), revision INTEGER NOT NULL,
 actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, actor_version INTEGER NOT NULL,
 account_id TEXT NOT NULL, connection_version INTEGER NOT NULL,
 customer_id TEXT NOT NULL, external_id TEXT NOT NULL, deposit_cents INTEGER NOT NULL,
 currency TEXT NOT NULL, acceptance_digest TEXT NOT NULL, source_json TEXT NOT NULL,
 digest TEXT NOT NULL, created_at INTEGER NOT NULL, applied_at INTEGER
);
-- Immutable business evidence; one external invoice cannot serve two deposits.
CREATE TABLE p_invoice_matches (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL UNIQUE REFERENCES p_proposals(id),
 deposit_id TEXT NOT NULL UNIQUE REFERENCES p_invoices(id), revision INTEGER NOT NULL,
 provider TEXT NOT NULL CHECK(provider='quickbooks'), account_id TEXT NOT NULL,
 connection_version INTEGER NOT NULL, customer_id TEXT NOT NULL, external_id TEXT NOT NULL,
 deposit_cents INTEGER NOT NULL, currency TEXT NOT NULL, acceptance_digest TEXT NOT NULL,
 source_json TEXT NOT NULL, digest TEXT NOT NULL, reviewed_by TEXT NOT NULL,
 reviewed_at INTEGER NOT NULL, matched_by TEXT NOT NULL, matched_at INTEGER NOT NULL,
 UNIQUE(provider,account_id,external_id)
);
CREATE TABLE p_invoice_inspections (
 id TEXT PRIMARY KEY, match_id TEXT NOT NULL REFERENCES p_invoice_matches(id), sequence INTEGER NOT NULL,
 connection_version INTEGER NOT NULL, source_json TEXT NOT NULL, digest TEXT NOT NULL,
 mismatches_json TEXT NOT NULL, inspected_by TEXT NOT NULL, inspected_at INTEGER NOT NULL,
 UNIQUE(match_id,sequence)
);

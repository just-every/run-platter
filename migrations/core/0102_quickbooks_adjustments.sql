-- Source-bound accounting reflections never authorize a processor charge or refund.
CREATE TABLE p_accounting_adjustments (
 source_key TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_accounting_jobs(proposal_id),
 kind TEXT NOT NULL, request_id TEXT NOT NULL UNIQUE, plan TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('writing','confirmed','uncertain')),
 provider_id TEXT, requested_at INTEGER NOT NULL
);

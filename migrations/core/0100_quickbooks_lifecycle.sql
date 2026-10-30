-- Provider observations and payment postings are retained business history.
CREATE TABLE p_accounting_observations (
 proposal_id TEXT PRIMARY KEY REFERENCES p_accounting_jobs(proposal_id),
 provider_id TEXT NOT NULL, total_cents INTEGER NOT NULL, balance_cents INTEGER NOT NULL,
 observed_at INTEGER NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL
);
CREATE TABLE p_accounting_postings (
 payment_id TEXT PRIMARY KEY REFERENCES p_payment_records(id),
 proposal_id TEXT NOT NULL REFERENCES p_accounting_jobs(proposal_id),
 request_id TEXT NOT NULL UNIQUE, plan TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('writing','confirmed','uncertain')),
 provider_id TEXT, requested_at INTEGER NOT NULL
);

-- Each immutable accepted schedule row has one durable invoice claim.
CREATE TABLE p_accounting_amounts (
 proposal_id TEXT NOT NULL REFERENCES p_accounting_jobs(proposal_id),
 amount_index INTEGER NOT NULL CHECK(amount_index>0),
 row_json TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
 event_at INTEGER, event_by TEXT, status TEXT NOT NULL CHECK(status IN ('scheduled','running','complete','held')),
 request_id TEXT UNIQUE, request_body TEXT, issued_on TEXT, due_on TEXT,
 provider_id TEXT UNIQUE, started_at INTEGER, completed_at INTEGER, reason TEXT,
 PRIMARY KEY(proposal_id,amount_index)
);
CREATE TABLE p_accounting_amount_observations (
 proposal_id TEXT NOT NULL, amount_index INTEGER NOT NULL,
 provider_id TEXT NOT NULL, total_cents INTEGER NOT NULL, balance_cents INTEGER NOT NULL,
 observed_at INTEGER NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL,
 PRIMARY KEY(proposal_id,amount_index),
 FOREIGN KEY(proposal_id,amount_index) REFERENCES p_accounting_amounts(proposal_id,amount_index)
);

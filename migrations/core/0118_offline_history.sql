-- Completion is a business fact, not authorization to charge or send invoices.
CREATE TABLE p_payment_milestone_events (
 request_id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 row_index INTEGER NOT NULL,
 agreement_hash TEXT NOT NULL,
 row_hash TEXT NOT NULL,
 completed_on TEXT NOT NULL,
 note TEXT NOT NULL,
 completed_by TEXT NOT NULL REFERENCES oa_operators(id),
 completed_at INTEGER NOT NULL,
 UNIQUE(proposal_id,revision,row_index)
);
CREATE TABLE p_offline_invoice_requests (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 row_index INTEGER NOT NULL,
 review_json TEXT NOT NULL,
 review_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('prepared','reserved','confirmed','needs_review')),
 prepared_by TEXT NOT NULL REFERENCES oa_operators(id),
 prepared_at INTEGER NOT NULL,
 completed_at INTEGER
);
CREATE UNIQUE INDEX p_offline_invoice_creation_once ON p_offline_invoice_requests(proposal_id,revision,row_index) WHERE status!='prepared';
CREATE TABLE p_offline_invoice_issue_authority (
 request_id TEXT PRIMARY KEY REFERENCES p_offline_invoice_requests(id)
);
CREATE TABLE p_offline_invoice_publications (
 id TEXT PRIMARY KEY,
 invoice_id TEXT NOT NULL REFERENCES p_offline_invoices(id),
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
 authorized_by TEXT NOT NULL REFERENCES oa_operators(id),
 authorized_at INTEGER NOT NULL
);
CREATE TABLE p_offline_invoice_visibility (
 invoice_id TEXT PRIMARY KEY REFERENCES p_offline_invoices(id)
);

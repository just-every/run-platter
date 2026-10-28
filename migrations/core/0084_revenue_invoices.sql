CREATE TABLE p_revenue_invoices (
 account_id TEXT NOT NULL,
 invoice_id TEXT NOT NULL,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 currency TEXT NOT NULL,
 issued_on TEXT NOT NULL,
 due_on TEXT NOT NULL,
 total_cents INTEGER NOT NULL CHECK(total_cents>=0),
 balance_cents INTEGER NOT NULL CHECK(balance_cents>=0 AND balance_cents<=total_cents),
 sync_token INTEGER NOT NULL,
 observed_at INTEGER NOT NULL,
 recorded_by TEXT NOT NULL REFERENCES oa_operators(id),
 version INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(account_id,invoice_id)
);
CREATE INDEX p_revenue_invoice_proposal ON p_revenue_invoices(proposal_id);

-- Provider evidence is retained; permission to write is installation-local.
CREATE TABLE p_offline_invoices (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 row_index INTEGER NOT NULL,
 agreement_hash TEXT NOT NULL,
 row_hash TEXT NOT NULL,
 realm_id TEXT NOT NULL,
 provider_invoice TEXT NOT NULL,
 customer_id TEXT NOT NULL,
 document_number TEXT NOT NULL,
 currency TEXT NOT NULL,
 total_cents INTEGER NOT NULL,
 balance_cents INTEGER NOT NULL,
 due_on TEXT NOT NULL,
 remittance TEXT NOT NULL,
 invoice_json TEXT NOT NULL,
 observed_at INTEGER NOT NULL,
 linked_by TEXT NOT NULL REFERENCES oa_operators(id),
 UNIQUE(proposal_id,revision,row_index),
 UNIQUE(realm_id,provider_invoice)
);
CREATE TABLE p_offline_invoice_authority (
 invoice_id TEXT PRIMARY KEY REFERENCES p_offline_invoices(id),
 connection_version INTEGER NOT NULL
);
CREATE TABLE p_offline_accounting (
 allocation_id TEXT PRIMARY KEY REFERENCES p_payment_allocations(id),
 invoice_id TEXT NOT NULL REFERENCES p_offline_invoices(id),
 request_id TEXT NOT NULL UNIQUE,
 method_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('reserved','confirmed','needs_review')),
 request_json TEXT NOT NULL,
 provider_payment TEXT,
 response_json TEXT,
 requested_by TEXT NOT NULL REFERENCES oa_operators(id),
 requested_at INTEGER NOT NULL,
 completed_at INTEGER
);
CREATE UNIQUE INDEX p_offline_accounting_busy ON p_offline_accounting(invoice_id) WHERE status IN ('reserved','needs_review');

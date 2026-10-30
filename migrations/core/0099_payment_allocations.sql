-- Request identities are retained business history, never execution authority.
ALTER TABLE p_payment_records ADD COLUMN request_id TEXT;
CREATE UNIQUE INDEX p_payment_record_requests ON p_payment_records(request_id) WHERE request_id IS NOT NULL;
CREATE TABLE p_payment_allocations (
 id TEXT PRIMARY KEY,
 payment_id TEXT NOT NULL REFERENCES p_payment_records(id),
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 currency TEXT NOT NULL,
 agreement_hash TEXT NOT NULL,
 row_index INTEGER NOT NULL CHECK(row_index>=0),
 row_hash TEXT NOT NULL,
 row_json TEXT NOT NULL,
 cents INTEGER NOT NULL CHECK(cents>0),
 request_json TEXT NOT NULL,
 allocated_by TEXT NOT NULL REFERENCES oa_operators(id),
 allocated_at INTEGER NOT NULL
);
CREATE INDEX p_payment_allocation_rows ON p_payment_allocations(proposal_id,revision,row_index);
CREATE INDEX p_payment_allocation_receipts ON p_payment_allocations(payment_id);

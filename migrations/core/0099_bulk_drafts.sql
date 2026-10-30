-- Reviewed source and completed rows are history. Execution consent stays local.
CREATE TABLE p_bulk_batches (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, request_id TEXT NOT NULL,
 template_id TEXT NOT NULL, template_version INTEGER NOT NULL,
 csv TEXT NOT NULL, csv_hash TEXT NOT NULL, digest TEXT NOT NULL,
 source_json TEXT NOT NULL, created_at INTEGER NOT NULL,
 UNIQUE(actor_id,request_id)
);
CREATE TABLE p_bulk_rows (
 batch_id TEXT NOT NULL REFERENCES p_bulk_batches(id) ON DELETE CASCADE,
 ordinal INTEGER NOT NULL, row_id TEXT NOT NULL UNIQUE,
 client_id TEXT REFERENCES p_clients(id),
 input_json TEXT NOT NULL, client_json TEXT, content_json TEXT,
 exception TEXT, proposal_id TEXT UNIQUE REFERENCES p_proposals(id),
 completed_at INTEGER, PRIMARY KEY(batch_id,ordinal)
);
CREATE TABLE p_bulk_authority (
 batch_id TEXT PRIMARY KEY REFERENCES p_bulk_batches(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL, actor_version INTEGER NOT NULL, reviewed_digest TEXT NOT NULL
);
-- An unused client can still be erased after preview; its capture must vanish too.
CREATE TRIGGER p_bulk_client_erasure BEFORE DELETE ON p_clients BEGIN
 DELETE FROM p_bulk_batches WHERE id IN (SELECT batch_id FROM p_bulk_rows WHERE client_id=OLD.id);
END;

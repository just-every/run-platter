-- Digests and opaque references are custody, never executable authority or raw content.
CREATE TABLE p_agent_receipt_sources (
 receipt_id TEXT NOT NULL REFERENCES p_agent_receipts(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('context','client','proposal','template','starter-template','payment','agreement','analytics')),
 source_id TEXT NOT NULL, source_version TEXT NOT NULL, digest TEXT NOT NULL,
 client_id TEXT REFERENCES p_clients(id) ON DELETE CASCADE,
 PRIMARY KEY(receipt_id,kind,source_id,source_version,digest)
);

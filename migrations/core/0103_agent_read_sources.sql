-- Preserve every historical receipt while identifying read revisions and attached source files.
CREATE TABLE p_agent_receipt_records_next (
 receipt_id TEXT NOT NULL REFERENCES p_agent_receipts(id) ON DELETE CASCADE,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 relation TEXT NOT NULL DEFAULT 'returned' CHECK(relation IN ('returned','produced','read')),
 snapshot_digest TEXT,
 PRIMARY KEY(receipt_id,proposal_id,revision)
);
INSERT INTO p_agent_receipt_records_next SELECT receipt_id,proposal_id,revision,relation,snapshot_digest FROM p_agent_receipt_records;
DROP TABLE p_agent_receipt_records;
ALTER TABLE p_agent_receipt_records_next RENAME TO p_agent_receipt_records;
CREATE TABLE p_agent_receipt_sources_next (
 receipt_id TEXT NOT NULL REFERENCES p_agent_receipts(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('context','client','proposal','template','starter-template','payment','agreement','analytics','attachment')),
 source_id TEXT NOT NULL, source_version TEXT NOT NULL, digest TEXT NOT NULL,
 client_id TEXT REFERENCES p_clients(id) ON DELETE CASCADE,
 PRIMARY KEY(receipt_id,kind,source_id,source_version,digest)
);
INSERT INTO p_agent_receipt_sources_next SELECT receipt_id,kind,source_id,source_version,digest,client_id FROM p_agent_receipt_sources;
DROP TABLE p_agent_receipt_sources;
ALTER TABLE p_agent_receipt_sources_next RENAME TO p_agent_receipt_sources;

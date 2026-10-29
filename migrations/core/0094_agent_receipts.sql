ALTER TABLE p_agent_keys ADD COLUMN paused_at INTEGER;
ALTER TABLE p_agent_keys ADD COLUMN ledger_consent_at INTEGER;
ALTER TABLE p_agent_keys ADD COLUMN control_version INTEGER NOT NULL DEFAULT 0;
-- Receipt history has no foreign key to execution credentials, which never leave an installation.
CREATE TABLE p_agent_receipts (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, key_id TEXT NOT NULL,
 transport TEXT NOT NULL CHECK(transport IN ('legacy','mcp','rest')),
 action TEXT NOT NULL, started_at INTEGER NOT NULL, completed_at INTEGER,
 status TEXT NOT NULL CHECK(status IN ('pending','succeeded','refused','failed')),
 http_status INTEGER, input_digest TEXT NOT NULL, output_digest TEXT,
 model TEXT NOT NULL DEFAULT 'not recorded'
);
CREATE INDEX p_agent_receipts_owner_time ON p_agent_receipts(owner_id,started_at,id);
CREATE TABLE p_agent_receipt_records (
 receipt_id TEXT NOT NULL REFERENCES p_agent_receipts(id) ON DELETE CASCADE,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 PRIMARY KEY(receipt_id,proposal_id,revision)
);

ALTER TABLE p_agent_keys ADD COLUMN paused_at INTEGER;
-- Credentials stay local; opaque activity references remain business history.
CREATE TABLE p_agent_activity (
 id TEXT PRIMARY KEY,
 key_id TEXT NOT NULL,
 action TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 output_hash TEXT NOT NULL,
 input_refs TEXT NOT NULL,
 output_refs TEXT NOT NULL,
 proposal_id TEXT,
 revision INTEGER,
 model TEXT,
 occurred_at INTEGER NOT NULL
);
CREATE INDEX p_agent_activity_key_time ON p_agent_activity(key_id,occurred_at,id);

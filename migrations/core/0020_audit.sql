CREATE TABLE p_audit (
 id TEXT PRIMARY KEY,
 actor_id TEXT NOT NULL,
 actor_role TEXT NOT NULL,
 action TEXT NOT NULL,
 subject TEXT NOT NULL,
 occurred_at INTEGER NOT NULL
);
CREATE INDEX p_audit_time ON p_audit(occurred_at, id);

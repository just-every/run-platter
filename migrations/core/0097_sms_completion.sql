-- Extend the retained text timeline without changing existing attempts.
CREATE TABLE p_sms_runs_new (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 phone TEXT NOT NULL, time_zone TEXT NOT NULL, actor_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('invitation','manual','scheduled','completion')),
 slot TEXT NOT NULL, settings_version INTEGER, message TEXT NOT NULL, queued_at INTEGER NOT NULL, due_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','sending','accepted','delivered','failed','held','cancelled')),
 provider_id TEXT UNIQUE, request_id TEXT NOT NULL UNIQUE, assent_id TEXT,
 UNIQUE(proposal_id,revision,kind,slot)
);
INSERT INTO p_sms_runs_new SELECT * FROM p_sms_runs;
DROP TABLE p_sms_runs;
ALTER TABLE p_sms_runs_new RENAME TO p_sms_runs;
CREATE TABLE p_sms_completion_authority (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 assent_id TEXT NOT NULL REFERENCES p_sms_assents(id)
);

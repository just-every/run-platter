-- Rules reference existing destination consent and never grant provider authority.
CREATE TABLE p_automation_rules (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, archive_version INTEGER NOT NULL,
 route_id TEXT NOT NULL REFERENCES p_notification_routes(id),
 authorized_by TEXT NOT NULL REFERENCES oa_operators(id), operator_version INTEGER NOT NULL,
 member_version INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE p_automation_authority (rule_id TEXT PRIMARY KEY REFERENCES p_automation_rules(id));
CREATE TABLE p_automation_runs (
 id TEXT PRIMARY KEY, rule_id TEXT NOT NULL REFERENCES p_automation_rules(id),
 proposal_id TEXT NOT NULL REFERENCES p_acceptances(proposal_id), revision INTEGER NOT NULL,
 created_at INTEGER NOT NULL, UNIQUE(rule_id,proposal_id,revision)
);
CREATE TABLE p_automation_run_authority (run_id TEXT PRIMARY KEY REFERENCES p_automation_runs(id));
CREATE TABLE p_automation_steps (
 run_id TEXT NOT NULL REFERENCES p_automation_runs(id),
 kind TEXT NOT NULL CHECK(kind IN ('archive','notification')), child_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','running','success','failed','uncertain','held','local')),
 reason TEXT, PRIMARY KEY(run_id,kind)
);
CREATE TABLE p_notification_attempts (
 id TEXT PRIMARY KEY, outbox_id TEXT NOT NULL,
 started_at INTEGER NOT NULL, completed_at INTEGER,
 outcome TEXT NOT NULL CHECK(outcome IN ('sending','success','failed','uncertain','withheld')),
 reason TEXT
);

CREATE TABLE p_handoff_settings (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), version INTEGER NOT NULL,
 account_id TEXT NOT NULL, connection_version INTEGER NOT NULL,
 workspace_id TEXT NOT NULL, team_id TEXT NOT NULL,
 authorized_by TEXT NOT NULL, authorized_at INTEGER NOT NULL
);
CREATE TABLE p_handoff_authority (
 singleton INTEGER PRIMARY KEY REFERENCES p_handoff_settings(singleton),
 version INTEGER NOT NULL, operator_version INTEGER NOT NULL, member_version INTEGER NOT NULL
);
CREATE TABLE p_handoff_jobs (
 proposal_id TEXT PRIMARY KEY REFERENCES p_acceptances(proposal_id), revision INTEGER NOT NULL,
 settings_version INTEGER NOT NULL, account_id TEXT NOT NULL, workspace_id TEXT NOT NULL, team_id TEXT NOT NULL,
 title TEXT NOT NULL, accepted_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','running','held','complete')),
 project_id TEXT, reason TEXT, started_at INTEGER, completed_at INTEGER
);
CREATE TABLE p_handoff_job_authority (
 proposal_id TEXT PRIMARY KEY REFERENCES p_handoff_jobs(proposal_id)
);
CREATE TABLE p_handoff_writes (
 proposal_id TEXT NOT NULL REFERENCES p_handoff_jobs(proposal_id), position INTEGER NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('project','task')), request TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('writing','uncertain','complete')), provider_id TEXT,
 PRIMARY KEY(proposal_id,position)
);

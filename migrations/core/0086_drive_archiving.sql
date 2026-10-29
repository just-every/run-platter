CREATE TABLE p_archive_settings (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), version INTEGER NOT NULL,
 account_id TEXT NOT NULL, connection_version INTEGER NOT NULL,
 root_folder TEXT NOT NULL, pattern TEXT NOT NULL, authorized_by TEXT NOT NULL,
 authorized_at INTEGER NOT NULL
);
CREATE TABLE p_archive_authority (
 singleton INTEGER PRIMARY KEY REFERENCES p_archive_settings(singleton),
 version INTEGER NOT NULL, operator_version INTEGER NOT NULL, member_version INTEGER NOT NULL
);
CREATE TABLE p_archive_jobs (
 proposal_id TEXT PRIMARY KEY REFERENCES p_acceptances(proposal_id), revision INTEGER NOT NULL,
 settings_version INTEGER NOT NULL, account_id TEXT NOT NULL, root_folder TEXT NOT NULL,
 pattern TEXT NOT NULL, client_id TEXT NOT NULL REFERENCES p_clients(id), client_name TEXT NOT NULL,
 title TEXT NOT NULL, accepted_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','running','held','complete','reconciling')),
 reason TEXT, started_at INTEGER, completed_at INTEGER
);
CREATE TABLE p_archive_job_authority (
 proposal_id TEXT PRIMARY KEY REFERENCES p_archive_jobs(proposal_id)
);
CREATE TABLE p_archive_folders (
 account_id TEXT NOT NULL, root_folder TEXT NOT NULL, client_id TEXT NOT NULL REFERENCES p_clients(id),
 provider_id TEXT NOT NULL, name TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('reserved','writing','uncertain','complete')),
 PRIMARY KEY(account_id,root_folder,client_id)
);
CREATE TABLE p_archive_files (
 proposal_id TEXT NOT NULL REFERENCES p_archive_jobs(proposal_id),
 kind TEXT NOT NULL CHECK(kind IN ('agreement','certificate')),
 provider_id TEXT NOT NULL, folder_id TEXT NOT NULL, name TEXT NOT NULL, sha256 TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('reserved','writing','uncertain','complete')),
 PRIMARY KEY(proposal_id,kind)
);

-- Preserve historical outcome rows; new records use an additive table.
CREATE TABLE p_outcome_records (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('declined','lost','won')),
 actor_id TEXT NOT NULL,
 actor_role TEXT NOT NULL CHECK(actor_role IN ('owner','admin','manager','sales','client')),
 actor_email TEXT NOT NULL,
 occurred_at INTEGER NOT NULL,
 reason TEXT NOT NULL,
 PRIMARY KEY(proposal_id,revision)
);
CREATE TABLE p_outcome_settings(singleton INTEGER PRIMARY KEY CHECK(singleton=1),version INTEGER NOT NULL,reasons TEXT NOT NULL);
CREATE TABLE p_crm_outcome_bindings (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), revision INTEGER NOT NULL, version INTEGER NOT NULL,
 account_id TEXT NOT NULL, connection_version INTEGER NOT NULL, deal_id TEXT NOT NULL,
 pipeline_id TEXT NOT NULL, won_stage TEXT NOT NULL, lost_stage TEXT NOT NULL,
 actor_id TEXT NOT NULL, configured_at INTEGER NOT NULL
);
-- Execution authority never leaves this installation in an archive.
CREATE TABLE p_crm_outcome_authority(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),binding_version INTEGER NOT NULL);
CREATE TABLE p_crm_outcome_attempts (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),revision INTEGER NOT NULL,
 kind TEXT NOT NULL,account_id TEXT NOT NULL,deal_id TEXT NOT NULL,stage_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('sending','confirmed','uncertain','withheld')),
 attempted_at INTEGER NOT NULL,confirmed_at INTEGER,
 PRIMARY KEY(proposal_id,revision)
);

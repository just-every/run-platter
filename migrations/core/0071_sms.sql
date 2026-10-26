-- Consent and link-free business history survive restore; execution authority does not.
CREATE TABLE p_sms_consent (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 phone TEXT NOT NULL, time_zone TEXT NOT NULL, evidence TEXT NOT NULL,
 actor_id TEXT NOT NULL, consented_at INTEGER NOT NULL
);
CREATE TABLE p_sms_authority (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 share_hash TEXT NOT NULL, actor_id TEXT NOT NULL, member_version INTEGER NOT NULL,
 consented_at INTEGER NOT NULL
);
CREATE TABLE p_sms_optouts (phone TEXT PRIMARY KEY, stopped_at INTEGER NOT NULL);
CREATE TABLE p_sms_runs (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 phone TEXT NOT NULL, time_zone TEXT NOT NULL, actor_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('invitation','manual','scheduled')),
 slot TEXT NOT NULL, settings_version INTEGER, message TEXT NOT NULL, queued_at INTEGER NOT NULL, due_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','sending','accepted','delivered','failed','held','cancelled')),
 provider_id TEXT UNIQUE, request_id TEXT NOT NULL UNIQUE,
 UNIQUE(proposal_id,revision,kind,slot)
);

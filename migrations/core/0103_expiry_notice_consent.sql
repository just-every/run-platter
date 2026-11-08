-- Historical settings carry no inferred sender authorization.
DELETE FROM p_sender_notice_authority;
ALTER TABLE p_sender_notice_authority ADD COLUMN consent_id TEXT;

CREATE TABLE p_sender_notice_events (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 settings_version INTEGER NOT NULL,
 actor_id TEXT NOT NULL REFERENCES oa_operators(id),
 actor_role TEXT NOT NULL,
 actor_version INTEGER NOT NULL,
 member_version INTEGER NOT NULL,
 owner_id TEXT NOT NULL REFERENCES oa_operators(id),
 enabled INTEGER NOT NULL,
 lead_days INTEGER NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('saved','authorized','revoked')),
 occurred_at INTEGER NOT NULL
);

ALTER TABLE p_connections ADD COLUMN broken_at INTEGER;
CREATE TABLE p_mailbox_oauth(
 state_hash TEXT PRIMARY KEY,operator_id TEXT NOT NULL REFERENCES oa_operators(id),
 provider TEXT NOT NULL,mailbox_email TEXT,connection_version INTEGER NOT NULL,
 sealed TEXT NOT NULL,expires_at INTEGER NOT NULL,consumed_at INTEGER
);
CREATE TABLE p_mail_attributions(
 mail_id TEXT PRIMARY KEY,proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 actor_id TEXT NOT NULL REFERENCES oa_operators(id),route TEXT NOT NULL,
 sender_address TEXT NOT NULL,outcome TEXT NOT NULL,fallback INTEGER NOT NULL,
 occurred_at INTEGER NOT NULL
);
ALTER TABLE p_mail ADD COLUMN requires_approval INTEGER NOT NULL DEFAULT 0;
ALTER TABLE p_mail ADD COLUMN proposal_revision INTEGER;
ALTER TABLE p_mail ADD COLUMN held_reason TEXT;

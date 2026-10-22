ALTER TABLE p_mail ADD COLUMN reply_consent INTEGER NOT NULL DEFAULT 0;
CREATE TABLE p_mail_reply_keys(
 keyhash TEXT PRIMARY KEY,mail_id TEXT NOT NULL UNIQUE,proposal_id TEXT NOT NULL,
 revision INTEGER NOT NULL,share_hash TEXT NOT NULL,recipient TEXT NOT NULL,
 used_at INTEGER
);
CREATE TABLE p_mail_replies(
 id TEXT PRIMARY KEY,proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,client_id TEXT NOT NULL REFERENCES p_clients(id),
 client_email TEXT NOT NULL,text TEXT NOT NULL,received_at INTEGER NOT NULL,
 source_key TEXT NOT NULL UNIQUE
);

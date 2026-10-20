-- Transport capabilities are excluded from portable business archives.
CREATE TABLE p_question_reply_keys (
 id TEXT PRIMARY KEY,
 keyhash TEXT NOT NULL UNIQUE CHECK(length(keyhash)=64),
 question_id TEXT NOT NULL REFERENCES p_questions(id),
 owner_id TEXT NOT NULL REFERENCES oa_operators(id),
 owner_version INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 used_at INTEGER
);
CREATE UNIQUE INDEX p_question_reply_unspent ON p_question_reply_keys(question_id,owner_id) WHERE used_at IS NULL;
-- AES-GCM envelope only; plaintext reply capabilities must never be persisted.
ALTER TABLE p_mail ADD COLUMN reply_to TEXT;

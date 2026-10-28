-- Preserve the original invitation and verification state while allowing one
-- independently verified invitation per configured recipient slot.
CREATE TABLE p_shares_next (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 token TEXT NOT NULL UNIQUE, code_hash TEXT, code_expires INTEGER,
 code_attempts INTEGER NOT NULL DEFAULT 0, code_generation INTEGER NOT NULL DEFAULT 0,
 code_sent_at INTEGER, session_hash TEXT, session_expires INTEGER, recipient TEXT,
 code_method TEXT NOT NULL DEFAULT 'mailbox code',
 session_method TEXT NOT NULL DEFAULT 'mailbox code', session_verified_at INTEGER,
 signing_position INTEGER NOT NULL DEFAULT 1 CHECK(signing_position>0),
 slot_id TEXT NOT NULL DEFAULT 'client', PRIMARY KEY(proposal_id,slot_id)
);
INSERT INTO p_shares_next(proposal_id,revision,token,code_hash,code_expires,code_attempts,code_generation,code_sent_at,session_hash,session_expires,recipient,code_method,session_method,session_verified_at,signing_position)
 SELECT proposal_id,revision,token,code_hash,code_expires,code_attempts,code_generation,code_sent_at,session_hash,session_expires,recipient,code_method,session_method,session_verified_at,signing_position FROM p_shares;
DROP TABLE p_shares;
ALTER TABLE p_shares_next RENAME TO p_shares;
ALTER TABLE p_proposals ADD COLUMN recipient_plan TEXT NOT NULL DEFAULT '[]';
CREATE TABLE p_recipient_signatures (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 slot_id TEXT NOT NULL, role TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
 signed_at INTEGER NOT NULL, method TEXT NOT NULL, verified_at INTEGER,
 consent TEXT NOT NULL, snapshot TEXT NOT NULL,
 PRIMARY KEY(proposal_id,revision,slot_id)
);
CREATE TRIGGER p_frozen_recipient_signature BEFORE UPDATE ON p_recipient_signatures
 BEGIN SELECT RAISE(ABORT,'Signatures are immutable'); END;
CREATE TABLE p_void_signatures (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 voided_at INTEGER NOT NULL, reason TEXT NOT NULL, PRIMARY KEY(proposal_id,revision)
);

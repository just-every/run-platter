-- Legacy consent has no complete assent and cannot authorize any text.
ALTER TABLE p_sms_authority ADD COLUMN assent_id TEXT;
ALTER TABLE p_sms_runs ADD COLUMN assent_id TEXT;
ALTER TABLE p_sms_optouts ADD COLUMN source TEXT NOT NULL DEFAULT 'recipient';
CREATE TABLE p_sms_assents (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 invitation_hash TEXT NOT NULL, recipient TEXT NOT NULL, phone TEXT NOT NULL, firm TEXT NOT NULL,
 purposes TEXT NOT NULL, disclosure TEXT NOT NULL, assented_at INTEGER NOT NULL,
 method TEXT NOT NULL, evidence TEXT NOT NULL, time_zone TEXT NOT NULL,
 recorded_by TEXT NOT NULL, recorded_at INTEGER NOT NULL
);
CREATE TABLE p_sms_revocations (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), assent_id TEXT,
 actor_id TEXT NOT NULL, revoked_at INTEGER NOT NULL
);
CREATE TABLE p_sms_code_runs (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 invitation_hash TEXT NOT NULL, assent_id TEXT NOT NULL REFERENCES p_sms_assents(id),
 generation INTEGER NOT NULL, queued_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','sending','accepted','held','failed','cancelled')),
 provider_id TEXT, UNIQUE(proposal_id,invitation_hash,generation)
);
CREATE TRIGGER p_frozen_sms_assent BEFORE UPDATE ON p_sms_assents BEGIN SELECT RAISE(ABORT,'SMS assent is immutable'); END;
CREATE TRIGGER p_frozen_sms_revocation BEFORE UPDATE ON p_sms_revocations BEGIN SELECT RAISE(ABORT,'SMS revocation is immutable'); END;

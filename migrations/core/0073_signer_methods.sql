CREATE TABLE p_signer_methods (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 method TEXT NOT NULL CHECK(method IN ('mailbox code','SMS code')),
 configured_by TEXT NOT NULL, configured_at INTEGER NOT NULL
);
ALTER TABLE p_shares ADD COLUMN code_method TEXT NOT NULL DEFAULT 'mailbox code';
ALTER TABLE p_shares ADD COLUMN session_method TEXT NOT NULL DEFAULT 'mailbox code';
ALTER TABLE p_shares ADD COLUMN session_verified_at INTEGER;
CREATE TABLE p_signature_facts (
 proposal_id TEXT PRIMARY KEY REFERENCES p_acceptances(proposal_id), revision INTEGER NOT NULL,
 method TEXT NOT NULL CHECK(method IN ('mailbox code','SMS code')), verified_at INTEGER
);
CREATE TABLE p_agreement_artifacts (
 proposal_id TEXT PRIMARY KEY REFERENCES p_acceptances(proposal_id), revision INTEGER NOT NULL,
 document BLOB NOT NULL, certificate BLOB NOT NULL, facts TEXT NOT NULL
);

CREATE TRIGGER p_frozen_signature_facts BEFORE UPDATE ON p_signature_facts BEGIN SELECT RAISE(ABORT,'Signature facts are immutable'); END;
CREATE TRIGGER p_frozen_agreement_artifacts BEFORE UPDATE ON p_agreement_artifacts BEGIN SELECT RAISE(ABORT,'Agreement artifacts are immutable'); END;

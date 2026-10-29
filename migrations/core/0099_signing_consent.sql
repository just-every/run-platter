-- Disclosures and client requests are business history, never invitation authority.
-- Existing offers and historical signatures are deliberately not backfilled.
CREATE TABLE p_signing_disclosures (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 version TEXT NOT NULL,
 disclosure TEXT NOT NULL,
 consent TEXT NOT NULL,
 issued_at INTEGER NOT NULL,
 PRIMARY KEY(proposal_id,revision)
);
CREATE TABLE p_signing_requests (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 disclosure_version TEXT NOT NULL,
 requested_at INTEGER NOT NULL,
 recipient TEXT NOT NULL,
 contact TEXT NOT NULL,
 paper_requested INTEGER NOT NULL CHECK(paper_requested=1),
 PRIMARY KEY(proposal_id,revision)
);
CREATE TRIGGER p_frozen_signing_disclosure BEFORE UPDATE ON p_signing_disclosures BEGIN SELECT RAISE(ABORT,'Signing disclosures are immutable'); END;
CREATE TRIGGER p_frozen_signing_request BEFORE UPDATE ON p_signing_requests BEGIN SELECT RAISE(ABORT,'Signing requests are immutable'); END;

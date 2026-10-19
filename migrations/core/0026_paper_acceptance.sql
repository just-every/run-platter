-- Acceptance signed outside Platter: the owner's attested upload of the client's signed copy.
-- The acceptance itself stays in p_acceptances, so deposits and reports treat it like any acceptance.
CREATE TABLE p_paper_acceptances (
 proposal_id TEXT PRIMARY KEY REFERENCES p_acceptances(proposal_id) ON DELETE RESTRICT,
 file_id TEXT NOT NULL REFERENCES p_attachment_files(id) ON DELETE RESTRICT,
 signed_on TEXT NOT NULL CHECK(length(signed_on) = 10),
 attested_by TEXT NOT NULL,
 attested_at INTEGER NOT NULL
);
CREATE TRIGGER p_paper_acceptance_immutable BEFORE UPDATE ON p_paper_acceptances
 BEGIN SELECT RAISE(ABORT,'Acceptance is immutable'); END;

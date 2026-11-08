-- Preserve historical references while retaining each configured party's destination.
ALTER TABLE p_completion_mail RENAME TO p_completion_mail_legacy;
CREATE TABLE p_completion_mail (
 mail_id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_acceptances(proposal_id),
 revision INTEGER NOT NULL, party TEXT NOT NULL, recipient TEXT,
 UNIQUE(proposal_id,revision,party)
);
INSERT INTO p_completion_mail(mail_id,proposal_id,revision,party)
 SELECT mail_id,proposal_id,revision,party FROM p_completion_mail_legacy;
DROP TABLE p_completion_mail_legacy;

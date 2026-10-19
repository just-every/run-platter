-- Unsent negotiations never mutate the live offer or its invitation.
ALTER TABLE p_proposals ADD COLUMN previous_sent_revision INTEGER;
CREATE TABLE p_negotiations (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 snapshot TEXT NOT NULL,
 prepared_by TEXT NOT NULL,
 prepared_at INTEGER NOT NULL,
 approved_by TEXT,
 approved_at INTEGER
);

CREATE TABLE p_electronic_requests (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL,
 slot_id TEXT NOT NULL,
 recipient TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('withdraw','paper','resume')),
 language TEXT NOT NULL CHECK(language IN ('en','es','fr','de','pt')),
 disclosure TEXT NOT NULL,
 requested_at INTEGER NOT NULL
);
CREATE INDEX p_electronic_requests_current ON p_electronic_requests(proposal_id,revision,slot_id,sequence);
CREATE TRIGGER p_frozen_electronic_requests BEFORE UPDATE ON p_electronic_requests BEGIN SELECT RAISE(ABORT,'Electronic records requests are immutable'); END;

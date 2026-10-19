ALTER TABLE p_proposals ADD COLUMN terms TEXT NOT NULL DEFAULT '';
CREATE TABLE p_suggestion_sections (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 section TEXT NOT NULL CHECK(section IN ('scope','terms')),
 PRIMARY KEY(proposal_id,revision,section)
);
CREATE TABLE p_suggestions (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 section TEXT NOT NULL CHECK(section IN ('scope','terms')),
 original TEXT NOT NULL,
 replacement TEXT NOT NULL,
 client_id TEXT NOT NULL REFERENCES p_clients(id),
 created_at INTEGER NOT NULL,
 decision TEXT CHECK(decision IN ('accepted','rejected')),
 decided_by TEXT,
 decided_at INTEGER,
 resulting_revision INTEGER
);

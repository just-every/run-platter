-- Questions belong to the exact invited client and immutable sent revision.
CREATE TABLE p_questions (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 client_id TEXT NOT NULL REFERENCES p_clients(id),
 client_email TEXT NOT NULL,
 section TEXT NOT NULL CHECK(section IN ('scope','pricing','terms')),
 text TEXT NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 10000),
 created_at INTEGER NOT NULL,
 FOREIGN KEY(proposal_id,revision) REFERENCES p_revisions(proposal_id,revision)
);
CREATE INDEX p_questions_revision ON p_questions(proposal_id,revision,created_at,id);
CREATE TABLE p_question_answers (
 id TEXT PRIMARY KEY,
 question_id TEXT NOT NULL REFERENCES p_questions(id),
 text TEXT NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND 10000),
 owner_id TEXT NOT NULL REFERENCES oa_operators(id),
 owner_email TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('app','email')),
 source_key TEXT NOT NULL UNIQUE,
 created_at INTEGER NOT NULL
);
CREATE INDEX p_question_answers_question ON p_question_answers(question_id,created_at,id);

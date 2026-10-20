-- FOLLOW-002: sales actions are separate from SEND-002 sender corrections.
CREATE TABLE p_followups (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 action TEXT NOT NULL,
 due_date TEXT NOT NULL,
 closed_at INTEGER,
 resolution TEXT,
 actor_id TEXT NOT NULL REFERENCES oa_operators(id),
 updated_at INTEGER NOT NULL
);
CREATE TABLE p_followup_actions (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('scheduled','completed','dismissed')),
 action TEXT NOT NULL,
 due_date TEXT NOT NULL,
 actor_id TEXT NOT NULL REFERENCES oa_operators(id),
 occurred_at INTEGER NOT NULL
);

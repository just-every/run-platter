-- SEND-010: business history travels; invitation tombstones stay local.
CREATE TABLE p_withdrawals (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 actor_id TEXT NOT NULL,
 actor_email TEXT NOT NULL,
 withdrawn_at INTEGER NOT NULL,
 reason TEXT NOT NULL,
 notice INTEGER NOT NULL CHECK(notice IN (0,1)),
 UNIQUE(proposal_id,revision)
);
CREATE TABLE p_withdrawn_links (
 token TEXT PRIMARY KEY,
 contact_email TEXT NOT NULL
);

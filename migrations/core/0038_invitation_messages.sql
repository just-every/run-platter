CREATE TABLE p_invitation_messages (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 recipient TEXT NOT NULL,
 subject TEXT NOT NULL,
 message TEXT NOT NULL,
 queued_at INTEGER NOT NULL,
 actor_id TEXT NOT NULL
);
CREATE INDEX p_invitation_messages_proposal ON p_invitation_messages(proposal_id, queued_at, id);

-- FOLLOW-005: business outcomes travel with the revision; link tombstones do not.
CREATE TABLE p_outcomes (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('declined','lost')),
 actor_id TEXT NOT NULL,
 actor_role TEXT NOT NULL CHECK(actor_role IN ('owner','client')),
 actor_email TEXT NOT NULL,
 occurred_at INTEGER NOT NULL,
 reason TEXT NOT NULL,
 PRIMARY KEY(proposal_id,revision)
);

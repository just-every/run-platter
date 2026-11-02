-- Business attribution is separate from native preparer identity and authority.
CREATE TABLE p_agent_preparations (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 agent_id TEXT NOT NULL,
 agent_name TEXT NOT NULL,
 sponsor_id TEXT NOT NULL REFERENCES oa_operators(id),
 sponsor_name TEXT NOT NULL,
 label TEXT NOT NULL,
 operation_id TEXT NOT NULL,
 PRIMARY KEY(proposal_id,revision)
);

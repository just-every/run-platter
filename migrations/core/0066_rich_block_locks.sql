CREATE TABLE p_template_block_locks(template_id TEXT NOT NULL REFERENCES p_personal_templates(id),section TEXT NOT NULL CHECK(section GLOB 'block:*'),PRIMARY KEY(template_id,section));
CREATE TABLE p_proposal_block_locks(proposal_id TEXT NOT NULL REFERENCES p_proposals(id),section TEXT NOT NULL CHECK(section GLOB 'block:*'),PRIMARY KEY(proposal_id,section));

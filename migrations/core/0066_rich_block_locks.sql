CREATE TABLE p_template_locks_next(template_id TEXT NOT NULL REFERENCES p_personal_templates(id),section TEXT NOT NULL CHECK(section IN ('title','scope','terms','pricing','deposit') OR section GLOB 'block:*'),PRIMARY KEY(template_id,section));
INSERT INTO p_template_locks_next SELECT * FROM p_template_locks;
DROP TABLE p_template_locks;
ALTER TABLE p_template_locks_next RENAME TO p_template_locks;
CREATE TABLE p_proposal_locks_next(proposal_id TEXT NOT NULL REFERENCES p_proposals(id),section TEXT NOT NULL CHECK(section IN ('title','scope','terms','pricing','deposit') OR section GLOB 'block:*'),PRIMARY KEY(proposal_id,section));
INSERT INTO p_proposal_locks_next SELECT * FROM p_proposal_locks;
DROP TABLE p_proposal_locks;
ALTER TABLE p_proposal_locks_next RENAME TO p_proposal_locks;

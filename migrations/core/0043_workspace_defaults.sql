CREATE TABLE p_workspace_defaults(singleton INTEGER PRIMARY KEY CHECK(singleton=1),settings TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE p_proposal_defaults(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),settings TEXT NOT NULL);
CREATE TABLE p_template_defaults(template_id TEXT PRIMARY KEY REFERENCES p_personal_templates(id),settings TEXT NOT NULL);

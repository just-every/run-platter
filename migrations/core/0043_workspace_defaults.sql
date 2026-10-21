CREATE TABLE p_workspace_defaults(singleton INTEGER PRIMARY KEY CHECK(singleton=1),reminder_days TEXT NOT NULL,expiry_days INTEGER,payment_methods TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE p_proposal_defaults(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),reminder_days TEXT NOT NULL,payment_methods TEXT NOT NULL);
CREATE TABLE p_template_defaults(template_id TEXT PRIMARY KEY REFERENCES p_personal_templates(id),reminder_days TEXT NOT NULL,payment_methods TEXT NOT NULL);

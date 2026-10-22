CREATE TABLE p_template_sources(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),template_id TEXT NOT NULL,template_version INTEGER NOT NULL CHECK(template_version>0));
ALTER TABLE p_approval_rules ADD COLUMN templates TEXT NOT NULL DEFAULT '[]';

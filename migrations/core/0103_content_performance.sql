-- Prospective attribution is frozen when a revision is first sent, never backfilled.
ALTER TABLE p_template_sources ADD COLUMN template_name TEXT;
CREATE TABLE p_content_origins(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),library_known INTEGER NOT NULL CHECK(library_known IN (0,1)));
CREATE TABLE p_template_content_sources(template_id TEXT PRIMARY KEY REFERENCES p_personal_templates(id),library_known INTEGER NOT NULL CHECK(library_known IN (0,1)),library_uses TEXT NOT NULL);
CREATE TABLE p_content_offers(proposal_id TEXT NOT NULL REFERENCES p_proposals(id),revision INTEGER NOT NULL,template TEXT,packages TEXT NOT NULL,library_items TEXT NOT NULL,library_known INTEGER NOT NULL CHECK(library_known IN (0,1)),PRIMARY KEY(proposal_id,revision));

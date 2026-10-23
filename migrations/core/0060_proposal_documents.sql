-- Additive content; historical offers keep their original form.
ALTER TABLE p_proposals ADD COLUMN document TEXT NOT NULL DEFAULT '{}';
-- Media bytes use immutable chunk storage, with a separate consented display namespace.
CREATE TABLE p_document_media (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 file_id TEXT NOT NULL REFERENCES p_attachment_files(id),
 PRIMARY KEY(proposal_id,file_id)
);
CREATE TABLE p_template_document_media (
 template_id TEXT NOT NULL REFERENCES p_personal_templates(id),
 file_id TEXT NOT NULL REFERENCES p_attachment_files(id),
 PRIMARY KEY(template_id,file_id)
);
ALTER TABLE p_questions ADD COLUMN block_id TEXT;
ALTER TABLE p_questions ADD COLUMN block_title TEXT;
CREATE TABLE p_block_suggestion_sections (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 section TEXT NOT NULL CHECK(section GLOB 'block:*'), PRIMARY KEY(proposal_id,revision,section)
);
CREATE TABLE p_block_suggestions (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 section TEXT NOT NULL CHECK(section GLOB 'block:*'), original TEXT NOT NULL, replacement TEXT NOT NULL,
 client_id TEXT NOT NULL REFERENCES p_clients(id), created_at INTEGER NOT NULL,
 decision TEXT CHECK(decision IN ('accepted','rejected')), decided_by TEXT, decided_at INTEGER, resulting_revision INTEGER
);

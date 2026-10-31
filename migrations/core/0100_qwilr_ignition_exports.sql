-- Export history conveys no provider or payment execution authority.
ALTER TABLE p_document_moveins ADD COLUMN source_provider TEXT NOT NULL DEFAULT 'generic';
ALTER TABLE p_document_moveins ADD COLUMN mapping_json TEXT NOT NULL DEFAULT '{}';
CREATE TABLE p_imported_source_facts (
 id TEXT PRIMARY KEY, data_json TEXT NOT NULL, revision TEXT NOT NULL
);
CREATE TABLE p_imported_source_dependencies (
 fact_id TEXT NOT NULL REFERENCES p_imported_source_facts(id),
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 PRIMARY KEY(fact_id,proposal_id)
);

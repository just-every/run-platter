-- Originals and preparation provenance are private business history.
-- Key consent is installation-local and is excluded from portability.
CREATE TABLE p_draft_sources (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, version INTEGER NOT NULL
);
CREATE TABLE p_draft_source_versions (
 source_id TEXT NOT NULL REFERENCES p_draft_sources(id), version INTEGER NOT NULL,
 title TEXT NOT NULL, original TEXT NOT NULL, sha256 TEXT NOT NULL,
 line_count INTEGER NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(source_id,version)
);
CREATE TRIGGER p_draft_original_immutable BEFORE UPDATE ON p_draft_source_versions
BEGIN SELECT RAISE(ABORT,'Source originals are immutable'); END;
CREATE TABLE p_draft_source_consent (
 key_id TEXT NOT NULL REFERENCES p_agent_keys(id), source_id TEXT NOT NULL,
 source_version INTEGER NOT NULL, consented_at INTEGER NOT NULL,
 PRIMARY KEY(key_id,source_id)
);
CREATE TABLE p_draft_provenance (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 source_id TEXT NOT NULL, source_version INTEGER NOT NULL, source_sha256 TEXT NOT NULL,
 references_json TEXT NOT NULL, catalog_json TEXT NOT NULL,
 key_id TEXT NOT NULL, prepared_at INTEGER NOT NULL
);

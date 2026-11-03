-- Reviewed exported content retains sources and an insert-only undo journal.
ALTER TABLE p_document_moveins ADD COLUMN kind TEXT NOT NULL DEFAULT 'documents';
CREATE TABLE p_pandadoc_moves (
 id TEXT PRIMARY KEY REFERENCES p_document_moveins(id),
 fingerprint TEXT NOT NULL, report_json TEXT NOT NULL, outputs_json TEXT NOT NULL,
 sources_json TEXT NOT NULL, undone INTEGER NOT NULL DEFAULT 0 CHECK(undone IN (0,1))
);
-- A source is claimed once, including after undo, so replay cannot recreate content.
CREATE TABLE p_pandadoc_sources (
 sha256 TEXT NOT NULL, mode TEXT NOT NULL, movein_id TEXT NOT NULL REFERENCES p_pandadoc_moves(id),
 PRIMARY KEY(sha256,mode)
);

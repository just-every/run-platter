-- File versions travel with product archives; replacing a default only moves a pointer.
CREATE TABLE p_attachment_files (
 id TEXT PRIMARY KEY,
 filename TEXT NOT NULL,
 media_type TEXT NOT NULL,
 size INTEGER NOT NULL CHECK(size >= 0),
 sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
 created_at INTEGER NOT NULL
);
CREATE TABLE p_attachment_chunks (
 file_id TEXT NOT NULL REFERENCES p_attachment_files(id) ON DELETE RESTRICT,
 part INTEGER NOT NULL CHECK(part >= 0),
 bytes_base64 TEXT NOT NULL,
 PRIMARY KEY(file_id,part)
);
CREATE TABLE p_vendor_documents (
 kind TEXT PRIMARY KEY CHECK(kind IN ('w9','insurance')),
 file_id TEXT NOT NULL REFERENCES p_attachment_files(id) ON DELETE RESTRICT,
 updated_at INTEGER NOT NULL
);
CREATE TRIGGER p_attachment_file_immutable BEFORE UPDATE ON p_attachment_files
 BEGIN SELECT RAISE(ABORT,'Attachment versions are immutable'); END;
CREATE TRIGGER p_attachment_chunk_immutable BEFORE UPDATE ON p_attachment_chunks
 BEGIN SELECT RAISE(ABORT,'Attachment bytes are immutable'); END;
ALTER TABLE p_proposals ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]';

-- Rich items retain validated originals independently of their source proposal.
ALTER TABLE p_library_items ADD COLUMN rich_kind TEXT CHECK(rich_kind IN ('image','video','pricing'));
ALTER TABLE p_library_items ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
CREATE TABLE p_library_media (
 item_id TEXT NOT NULL REFERENCES p_library_items(id),
 file_id TEXT NOT NULL REFERENCES p_attachment_files(id),
 PRIMARY KEY(item_id,file_id)
);

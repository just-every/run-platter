-- Analytics lineage carries no linked-edit or library-usage authority.
ALTER TABLE p_content_origins ADD COLUMN library_uses TEXT NOT NULL DEFAULT '[]';

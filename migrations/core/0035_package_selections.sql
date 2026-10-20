-- Preserve the exact optional-item selection on the unsigned PDF timeline.
ALTER TABLE p_pdf_downloads ADD COLUMN selection TEXT NOT NULL DEFAULT '[]';

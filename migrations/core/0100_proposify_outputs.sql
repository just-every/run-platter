-- Reviewed open-document reissues and library copies keep their original custody.
ALTER TABLE p_proposify_applications ADD COLUMN output_kind TEXT NOT NULL DEFAULT 'template';
ALTER TABLE p_proposify_applications ADD COLUMN library_id TEXT;

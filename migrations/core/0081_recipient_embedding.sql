-- Framing consent belongs to a live invitation and is never restored.
ALTER TABLE p_shares ADD COLUMN embed_origin TEXT;

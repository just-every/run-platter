-- Explicit imported-contact selection is bound to the reviewed erasure digest.
ALTER TABLE p_privacy_reviews ADD COLUMN contact_id TEXT;
ALTER TABLE p_privacy_reviews ADD COLUMN documents_json TEXT NOT NULL DEFAULT '[]';

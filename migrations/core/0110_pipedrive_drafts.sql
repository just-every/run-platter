-- Bind each reviewed capture to its provider; restored reviews remain excluded.
ALTER TABLE p_crm_draft_reviews ADD COLUMN provider TEXT NOT NULL DEFAULT 'hubspot';

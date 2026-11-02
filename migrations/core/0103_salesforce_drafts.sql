-- Bind each pending review to its own provider; applied provenance remains independent history.
ALTER TABLE p_crm_draft_reviews ADD COLUMN provider TEXT NOT NULL DEFAULT 'hubspot' CHECK(provider IN ('hubspot','salesforce'));

-- Provider-bound write history survives archives; executable reviews do not.
ALTER TABLE p_crm_sync_reviews ADD COLUMN provider TEXT NOT NULL DEFAULT 'hubspot';
ALTER TABLE p_crm_sync_attempts ADD COLUMN provider TEXT NOT NULL DEFAULT 'hubspot';
ALTER TABLE p_crm_sync_consents ADD COLUMN provider TEXT NOT NULL DEFAULT 'hubspot';

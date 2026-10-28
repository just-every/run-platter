-- Existing agreements retain unknown language; only new browser decisions record it.
CREATE TABLE p_client_locales (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id) ON DELETE CASCADE,
 locale TEXT NOT NULL CHECK(locale IN ('en','es'))
);
ALTER TABLE p_signature_facts ADD COLUMN language TEXT CHECK(language IN ('en','es'));
ALTER TABLE p_withdrawn_links ADD COLUMN client_locale TEXT NOT NULL DEFAULT 'en' CHECK(client_locale IN ('en','es'));

-- Existing agreements retain unknown language; only new browser decisions record it.
ALTER TABLE p_proposals ADD COLUMN client_locale TEXT NOT NULL DEFAULT 'en' CHECK(client_locale IN ('en','es'));
ALTER TABLE p_signature_facts ADD COLUMN language TEXT CHECK(language IN ('en','es'));
ALTER TABLE p_withdrawn_links ADD COLUMN client_locale TEXT NOT NULL DEFAULT 'en' CHECK(client_locale IN ('en','es'));

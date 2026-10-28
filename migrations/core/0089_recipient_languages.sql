-- Extend language custody without changing previously published migrations.
CREATE TABLE p_client_locales_next (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id) ON DELETE CASCADE,
 locale TEXT NOT NULL CHECK(locale IN ('en','es','fr','de','pt','auto'))
);
INSERT INTO p_client_locales_next SELECT * FROM p_client_locales;
DROP TABLE p_client_locales;
ALTER TABLE p_client_locales_next RENAME TO p_client_locales;
CREATE TABLE p_signature_facts_next (
 proposal_id TEXT PRIMARY KEY REFERENCES p_acceptances(proposal_id), revision INTEGER NOT NULL,
 method TEXT NOT NULL CHECK(method IN ('mailbox code','SMS code')), verified_at INTEGER,
 language TEXT CHECK(language IN ('en','es','fr','de','pt'))
);
INSERT INTO p_signature_facts_next SELECT * FROM p_signature_facts;
DROP TABLE p_signature_facts;
ALTER TABLE p_signature_facts_next RENAME TO p_signature_facts;
CREATE TRIGGER p_frozen_signature_facts BEFORE UPDATE ON p_signature_facts BEGIN SELECT RAISE(ABORT,'Signature facts are immutable'); END;
CREATE TABLE p_withdrawn_links_next (
 token TEXT PRIMARY KEY, contact_email TEXT NOT NULL,
 client_locale TEXT NOT NULL DEFAULT 'en' CHECK(client_locale IN ('en','es','fr','de','pt'))
);
INSERT INTO p_withdrawn_links_next SELECT * FROM p_withdrawn_links;
DROP TABLE p_withdrawn_links;
ALTER TABLE p_withdrawn_links_next RENAME TO p_withdrawn_links;
CREATE TABLE p_recipient_locales (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id) ON DELETE CASCADE,
 slot_id TEXT NOT NULL,
 locale TEXT NOT NULL CHECK(locale IN ('en','es','fr','de','pt','auto')),
 PRIMARY KEY(proposal_id,slot_id)
);
-- This binding conveys invitation context and never travels in product archives.
CREATE TABLE p_invitation_languages (
 token TEXT PRIMARY KEY REFERENCES p_shares(token) ON DELETE CASCADE,
 locale TEXT NOT NULL CHECK(locale IN ('en','es','fr','de','pt'))
);

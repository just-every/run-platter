-- Retired invitation preferences are local tombstones, never signing facts.
ALTER TABLE p_replaced_links ADD COLUMN client_locale TEXT CHECK(client_locale IN ('en','es','fr','de','pt'));

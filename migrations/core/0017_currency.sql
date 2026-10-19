-- Defaults preserve first-release records and archives without rewriting frozen data.
ALTER TABLE p_proposals ADD COLUMN currency TEXT NOT NULL DEFAULT 'AUD' CHECK(currency IN ('AUD','USD'));
ALTER TABLE p_revisions ADD COLUMN currency TEXT NOT NULL DEFAULT 'AUD' CHECK(currency IN ('AUD','USD'));
ALTER TABLE p_acceptances ADD COLUMN currency TEXT NOT NULL DEFAULT 'AUD' CHECK(currency IN ('AUD','USD'));
ALTER TABLE p_invoices ADD COLUMN currency TEXT NOT NULL DEFAULT 'AUD' CHECK(currency IN ('AUD','USD'));

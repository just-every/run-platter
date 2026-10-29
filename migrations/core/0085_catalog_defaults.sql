ALTER TABLE p_priced_catalog ADD COLUMN default_recurrence TEXT NOT NULL DEFAULT 'one-off' CHECK(default_recurrence IN ('one-off','weekly','monthly','quarterly','annual'));
ALTER TABLE p_priced_catalog ADD COLUMN taxable INTEGER NOT NULL DEFAULT 0 CHECK(taxable IN (0,1));
ALTER TABLE p_priced_catalog ADD COLUMN tax_code TEXT NOT NULL DEFAULT '';
ALTER TABLE p_priced_catalog ADD COLUMN income_account TEXT NOT NULL DEFAULT '';
ALTER TABLE p_priced_catalog ADD COLUMN source_id TEXT;
ALTER TABLE p_priced_catalog ADD COLUMN source_version INTEGER;
CREATE UNIQUE INDEX p_priced_catalog_source ON p_priced_catalog(source_id) WHERE source_id IS NOT NULL;

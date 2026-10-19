-- Existing preparer strings do not establish a durable sales-owner identity.
ALTER TABLE p_proposals ADD COLUMN sales_owner_id TEXT REFERENCES oa_operators(id);
ALTER TABLE p_proposals ADD COLUMN sales_owner_name TEXT;

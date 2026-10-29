-- A successful draft records the exact immutable revision it produced, not only its response id.
ALTER TABLE p_agent_receipt_records ADD COLUMN relation TEXT NOT NULL DEFAULT 'returned' CHECK(relation IN ('returned','produced'));
ALTER TABLE p_agent_receipt_records ADD COLUMN snapshot_digest TEXT;

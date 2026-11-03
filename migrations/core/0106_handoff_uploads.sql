-- Existing grants remain limited to mailbox-verified completions.
ALTER TABLE p_handoff_settings ADD COLUMN include_uploads INTEGER NOT NULL DEFAULT 0 CHECK(include_uploads IN (0,1));

-- Existing authorizations retain their original completion boundary after upgrade.
ALTER TABLE p_handoff_authority ADD COLUMN completion_scope INTEGER NOT NULL DEFAULT 0 CHECK(completion_scope IN (0,1));

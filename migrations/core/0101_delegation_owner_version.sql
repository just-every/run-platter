-- Older grants carry no authority across a native identity-version change.
ALTER TABLE p_delegation_authority ADD COLUMN owner_version INTEGER;

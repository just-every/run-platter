-- Retain prospective decision facts. Older decisions deliberately remain unrecorded.
ALTER TABLE p_approval_decisions ADD COLUMN actor_role TEXT;
ALTER TABLE p_approval_decisions ADD COLUMN actor_name TEXT;
ALTER TABLE p_approval_decisions ADD COLUMN basis TEXT CHECK(basis IS NULL OR json_valid(basis));

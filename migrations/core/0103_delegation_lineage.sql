-- Retain the preceding transfer so owner undo can unwind unsigned delegations.
-- Historical facts remain unchanged when their predecessor was not recorded.
ALTER TABLE p_signer_delegations ADD COLUMN previous_delegation_id TEXT;

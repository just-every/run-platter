-- Preserve the delegated recipient slot independently of its mutable mailbox.
ALTER TABLE p_signer_delegations ADD COLUMN slot_id TEXT NOT NULL DEFAULT 'client';

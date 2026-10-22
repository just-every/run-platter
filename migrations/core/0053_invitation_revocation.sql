-- Add credential binding fields without rewriting archived account data.
-- Native cancellation is authoritative; the admission flow checks its ledger.
ALTER TABLE p_member_invitations ADD COLUMN revoked_at INTEGER;
ALTER TABLE p_member_invitations ADD COLUMN token_id TEXT;
ALTER TABLE p_member_invitations ADD COLUMN token_binding_pending INTEGER NOT NULL DEFAULT 0;

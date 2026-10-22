-- Invitation credentials never travel in an archive. Native cancellation and
-- the product revocation are atomic, using only excluded credential tables.
ALTER TABLE p_member_invitations ADD COLUMN revoked_at INTEGER;
ALTER TABLE p_member_invitations ADD COLUMN token_id TEXT;
ALTER TABLE p_member_invitations ADD COLUMN token_binding_pending INTEGER NOT NULL DEFAULT 0;
CREATE TRIGGER p_member_invitation_cancel AFTER INSERT ON oa_invitation_cancellations
BEGIN
 UPDATE p_member_invitations SET revoked_at=unixepoch()*1000
 WHERE status='pending' AND token_id IN (SELECT id FROM oa_tokens WHERE operator_id=NEW.operator_id);
END;
CREATE TRIGGER p_member_invitation_recancel AFTER UPDATE ON oa_invitation_cancellations
BEGIN
 UPDATE p_member_invitations SET revoked_at=unixepoch()*1000
 WHERE status='pending' AND token_id IN (SELECT id FROM oa_tokens WHERE operator_id=NEW.operator_id);
END;

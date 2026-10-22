-- End the product grant in the same transaction as native cancellation.
ALTER TABLE p_member_invitations ADD COLUMN revoked_at INTEGER;
CREATE TRIGGER p_member_invitation_cancel AFTER UPDATE OF status ON oa_operators
WHEN OLD.status='invited' AND NEW.status='inactive'
BEGIN
 UPDATE p_member_invitations SET revoked_at=unixepoch()*1000 WHERE email=NEW.email AND status='pending';
END;

-- A pending grant binds the exact native invitation capability. Reissuing the
-- product grant clears this id before native issuance, so the old link cannot
-- claim the replacement role during the issuance window.
ALTER TABLE p_member_invitations ADD COLUMN token_id TEXT;
UPDATE p_member_invitations SET token_id=(
 SELECT t.id FROM oa_tokens t JOIN oa_operators o ON o.id=t.operator_id
 WHERE o.email=p_member_invitations.email AND t.kind='invite'
 AND t.revoked_at IS NULL AND t.consumed_at IS NULL ORDER BY t.created_at DESC,t.id DESC LIMIT 1
) WHERE status='pending';
CREATE TRIGGER p_member_invitation_token AFTER INSERT ON oa_tokens
WHEN NEW.kind='invite'
BEGIN
 UPDATE p_member_invitations SET token_id=NEW.id
 WHERE email=(SELECT email FROM oa_operators WHERE id=NEW.operator_id)
 AND issuer_id=NEW.issuer_id AND status='pending' AND revoked_at IS NULL AND token_id IS NULL;
END;

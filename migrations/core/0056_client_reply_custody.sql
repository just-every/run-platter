-- Historical replies have no provider authentication receipt; never infer one.
ALTER TABLE p_mail_replies ADD COLUMN claimed_from TEXT;
ALTER TABLE p_mail_replies ADD COLUMN spf_result TEXT NOT NULL DEFAULT 'unavailable';
ALTER TABLE p_mail_replies ADD COLUMN dkim_result TEXT NOT NULL DEFAULT 'unavailable';
-- One durable in-app owner notice per invitation; no reply body or capability.
CREATE TABLE p_mail_reply_cap_notices(
 mail_id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL, created_at INTEGER NOT NULL
);
-- A matching claimed From never identifies the verified client in the audit log.
UPDATE p_audit SET actor_role='email',actor_id='email-reply' WHERE action='mail.client-reply';

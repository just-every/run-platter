-- Test-to-self quotas are checked atomically with the durable audit and outbox writes.
CREATE INDEX p_audit_test_mail_quota ON p_audit(actor_id,subject,action,occurred_at);

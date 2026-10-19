-- Additive migration. Never drop existing delivery receipts or state.
CREATE TABLE IF NOT EXISTS rer_mail_event_receipts (
  provider TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  event_namespace TEXT NOT NULL,
  event_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  event_json TEXT NOT NULL,
  commit_token TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  conflict INTEGER NOT NULL DEFAULT 0 CONSTRAINT rer_mail_event_identity_conflict CHECK (conflict = 0),
  PRIMARY KEY (provider, tenant_id, event_namespace, event_id)
);
CREATE TABLE IF NOT EXISTS rer_mail_event_states (
  provider TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  event_namespace TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  terminal INTEGER NOT NULL CHECK (terminal IN (0, 1)),
  PRIMARY KEY (provider, tenant_id, event_namespace, provider_message_id, recipient)
);

ALTER TABLE p_mail ADD COLUMN provider TEXT;
ALTER TABLE p_mail ADD COLUMN provider_message_id TEXT;
ALTER TABLE p_mail ADD COLUMN sender_id TEXT;
ALTER TABLE p_shares ADD COLUMN recipient TEXT;
CREATE UNIQUE INDEX p_mail_provider_identity ON p_mail(provider,provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE TABLE p_delivery_events (
 provider TEXT NOT NULL,event_id TEXT NOT NULL,mail_id TEXT NOT NULL REFERENCES p_mail(id),
 provider_message_id TEXT NOT NULL,recipient TEXT NOT NULL,status TEXT,occurred_at INTEGER NOT NULL,
 PRIMARY KEY(provider,event_id)
);
CREATE TABLE p_bounce_notices (
 id TEXT PRIMARY KEY,proposal_id TEXT NOT NULL REFERENCES p_proposals(id),recipient TEXT NOT NULL,sender_id TEXT NOT NULL,created_at INTEGER NOT NULL,
 read_at INTEGER,closed_at INTEGER,action TEXT
);
-- Local transport links never travel in the business archive.
CREATE TABLE p_bounce_notice_transport (
 notice_id TEXT PRIMARY KEY,original_mail_id TEXT UNIQUE,correction_mail_id TEXT
);
-- Projection and the sender's durable workflow commit with the signed receipt.
CREATE TRIGGER p_delivery_receipt AFTER INSERT ON rer_mail_event_receipts BEGIN
 INSERT INTO p_delivery_events(provider,event_id,mail_id,provider_message_id,recipient,status,occurred_at)
 SELECT NEW.provider,NEW.event_id,m.id,json_extract(NEW.event_json,'$.providerMessageId'),m.recipient,
 json_extract(NEW.event_json,'$.status'),json_extract(NEW.event_json,'$.occurredAt') FROM p_mail m
 WHERE m.provider=NEW.provider AND ((NEW.provider='resend' AND m.provider_message_id=json_extract(NEW.event_json,'$.providerMessageId'))
 OR (NEW.provider='sendgrid' AND m.id=json_extract(NEW.event_json,'$.deliveryId')))
 AND m.recipient=json_extract(NEW.event_json,'$.recipients[0]');
 INSERT INTO p_bounce_notice_transport(notice_id,original_mail_id)
 SELECT lower(hex(randomblob(16))),e.mail_id FROM p_delivery_events e JOIN p_mail m ON m.id=e.mail_id
 WHERE e.provider=NEW.provider AND e.event_id=NEW.event_id AND e.status='bounced' AND m.sender_id IS NOT NULL
 ON CONFLICT(original_mail_id) DO NOTHING;
 INSERT INTO p_bounce_notices(id,proposal_id,recipient,sender_id,created_at)
 SELECT t.notice_id,m.proposal_id,m.recipient,m.sender_id,e.occurred_at FROM p_delivery_events e JOIN p_mail m ON m.id=e.mail_id
 JOIN p_bounce_notice_transport t ON t.original_mail_id=m.id
 WHERE e.provider=NEW.provider AND e.event_id=NEW.event_id AND e.status='bounced' AND m.sender_id IS NOT NULL
 ON CONFLICT(id) DO NOTHING;
 UPDATE p_bounce_notices SET closed_at=json_extract(NEW.event_json,'$.occurredAt')
 WHERE closed_at IS NULL AND id IN (SELECT t.notice_id FROM p_bounce_notice_transport t JOIN p_delivery_events e
 ON e.mail_id=t.correction_mail_id WHERE e.provider=NEW.provider AND e.event_id=NEW.event_id AND e.status IN ('accepted','delivered'));
END;

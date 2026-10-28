-- Immutable machine scopes use the existing live owner-bound credential guard.
CREATE TABLE p_rest_keys(key_id TEXT PRIMARY KEY REFERENCES p_agent_keys(id),scopes TEXT NOT NULL);
CREATE TRIGGER p_rest_scopes_immutable BEFORE UPDATE ON p_rest_keys BEGIN SELECT RAISE(ABORT,'Issue a replacement key to change scopes'); END;
CREATE TABLE p_webhooks(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,owner_version INTEGER NOT NULL,url TEXT NOT NULL,created_at INTEGER NOT NULL,revoked_at INTEGER);
CREATE TABLE p_webhook_secrets(webhook_id TEXT PRIMARY KEY REFERENCES p_webhooks(id),sealed TEXT NOT NULL);
CREATE TABLE p_webhook_events(id TEXT PRIMARY KEY,type TEXT NOT NULL,proposal_id TEXT NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,occurred_at INTEGER NOT NULL);
CREATE TABLE p_webhook_deliveries(id TEXT PRIMARY KEY,webhook_id TEXT NOT NULL REFERENCES p_webhooks(id),event_id TEXT NOT NULL REFERENCES p_webhook_events(id),attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',http_status INTEGER,lease_until INTEGER,UNIQUE(webhook_id,event_id));
CREATE TRIGGER p_webhook_created AFTER INSERT ON p_proposals BEGIN
 INSERT INTO p_webhook_events VALUES(lower(hex(randomblob(16))),'proposal.created',NEW.id,NEW.revision,NEW.status,CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
CREATE TRIGGER p_webhook_changed AFTER UPDATE OF status,revision ON p_proposals WHEN NEW.status!=OLD.status OR NEW.revision!=OLD.revision BEGIN
 INSERT INTO p_webhook_events VALUES(lower(hex(randomblob(16))),CASE WHEN NEW.status='accepted' THEN 'proposal.signed' WHEN NEW.status='sent' THEN 'proposal.sent' WHEN NEW.status='approved' THEN 'proposal.approved' ELSE 'proposal.revised' END,NEW.id,NEW.revision,NEW.status,CAST(unixepoch('subsec')*1000 AS INTEGER));
END;
CREATE TRIGGER p_webhook_withdrawn AFTER INSERT ON p_withdrawals BEGIN
 INSERT INTO p_webhook_events VALUES(lower(hex(randomblob(16))),'proposal.withdrawn',NEW.proposal_id,NEW.revision,'withdrawn',NEW.withdrawn_at);
END;
CREATE TRIGGER p_webhook_declined AFTER INSERT ON p_outcome_records BEGIN
 INSERT INTO p_webhook_events VALUES(lower(hex(randomblob(16))),CASE WHEN NEW.kind='declined' THEN 'proposal.declined' WHEN NEW.kind='won' THEN 'proposal.won' ELSE 'proposal.lost' END,NEW.proposal_id,NEW.revision,NEW.kind,NEW.occurred_at);
END;
CREATE INDEX p_webhook_due ON p_webhook_deliveries(status,next_at);

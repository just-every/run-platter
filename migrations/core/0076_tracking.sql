CREATE TABLE p_tracking_settings(singleton INTEGER PRIMARY KEY CHECK(singleton=1), retention_days INTEGER NOT NULL DEFAULT 90 CHECK(retention_days BETWEEN 1 AND 365), quiet_minutes INTEGER NOT NULL DEFAULT 30 CHECK(quiet_minutes BETWEEN 1 AND 1440));
INSERT INTO p_tracking_settings(singleton) VALUES(1);
CREATE TABLE p_tracking_authority(singleton INTEGER PRIMARY KEY CHECK(singleton=1), alerts INTEGER NOT NULL CHECK(alerts IN (0,1)), authorized_at INTEGER NOT NULL);
CREATE TABLE p_views(id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL, recipient TEXT NOT NULL, verified INTEGER NOT NULL, viewed_at INTEGER NOT NULL, city TEXT, region TEXT, country TEXT, device TEXT NOT NULL);
CREATE INDEX p_views_proposal_time ON p_views(proposal_id,viewed_at);
CREATE TABLE p_tracking_alerts(id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), recipient TEXT NOT NULL, sender_id TEXT, alerted_at INTEGER NOT NULL, kind TEXT NOT NULL);
CREATE TABLE p_tracking_holds(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), reason TEXT NOT NULL, held_at INTEGER NOT NULL);
CREATE INDEX p_tracking_alerts_quiet ON p_tracking_alerts(proposal_id,recipient,alerted_at);

CREATE TABLE p_watchers (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL, operator_id TEXT NOT NULL REFERENCES oa_operators(id),
 email_enabled INTEGER NOT NULL CHECK(email_enabled IN (0,1)),
 slack_route TEXT REFERENCES p_notification_routes(id), events TEXT NOT NULL,
 cursors TEXT NOT NULL, version INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(proposal_id,operator_id)
);
CREATE TABLE p_watcher_authority (
 watcher_id TEXT PRIMARY KEY REFERENCES p_watchers(id), version INTEGER NOT NULL,
 member_version INTEGER NOT NULL
);
ALTER TABLE p_notification_outbox ADD COLUMN watcher_id TEXT REFERENCES p_watchers(id);

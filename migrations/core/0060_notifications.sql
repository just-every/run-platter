-- Explicit notification consent is local authority, never restored.
CREATE TABLE p_approval_requests (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 plan TEXT NOT NULL, step TEXT NOT NULL, approver_id TEXT NOT NULL REFERENCES oa_operators(id),
 requester_id TEXT NOT NULL REFERENCES oa_operators(id), requested_at INTEGER NOT NULL, remind_at INTEGER NOT NULL,
 reminded_at INTEGER, UNIQUE(proposal_id,revision,plan,step,approver_id)
);
CREATE TABLE p_notification_routes (
 id TEXT PRIMARY KEY, event TEXT NOT NULL CHECK(event IN ('approval','signed','followup')),
 provider TEXT NOT NULL CHECK(provider IN ('slack','teams')), kind TEXT NOT NULL CHECK(kind IN ('channel','direct')),
 destination TEXT NOT NULL, operator_id TEXT REFERENCES oa_operators(id), recipient_email TEXT, connection_version INTEGER NOT NULL,
 configured_by TEXT NOT NULL REFERENCES oa_operators(id), created_at INTEGER NOT NULL
);
CREATE TABLE p_notification_authority (request_id TEXT PRIMARY KEY REFERENCES p_approval_requests(id));
CREATE TABLE p_notification_route_authority (route_id TEXT PRIMARY KEY REFERENCES p_notification_routes(id));
CREATE TABLE p_notification_outbox (
 id TEXT PRIMARY KEY, event_key TEXT NOT NULL, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 request_id TEXT REFERENCES p_approval_requests(id), route_id TEXT REFERENCES p_notification_routes(id),
 recipient TEXT, subject TEXT NOT NULL, body TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','sending','sent','local','withheld','uncertain')),
 created_at INTEGER NOT NULL, UNIQUE(event_key,route_id), UNIQUE(event_key,recipient)
);

CREATE TABLE p_sender_notice_defaults (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), enabled INTEGER NOT NULL DEFAULT 1,
 lead_days INTEGER NOT NULL DEFAULT 3, renewal_enabled INTEGER NOT NULL DEFAULT 1,
 renewal_days INTEGER NOT NULL DEFAULT 30, version INTEGER NOT NULL DEFAULT 0
);
INSERT INTO p_sender_notice_defaults(singleton) VALUES(1);
CREATE TABLE p_sender_notice_settings (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), enabled INTEGER NOT NULL,
 lead_days INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE p_sender_notice_authority (proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id));
CREATE TABLE p_sender_notice_runs (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 deadline_at INTEGER NOT NULL, notice_date TEXT NOT NULL, owner_id TEXT NOT NULL REFERENCES oa_operators(id),
 settings_version INTEGER NOT NULL, occurred_at INTEGER NOT NULL
);

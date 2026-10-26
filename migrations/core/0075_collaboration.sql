CREATE TABLE p_internal_threads (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 block_id TEXT NOT NULL, block_title TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('comment','assignment')),
 text TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES oa_operators(id), recipient_id TEXT REFERENCES oa_operators(id),
 due_date TEXT, created_at INTEGER NOT NULL, resolved_at INTEGER, resolved_by TEXT REFERENCES oa_operators(id), version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE p_collaboration_events (
 id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES p_internal_threads(id), proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL, actor_id TEXT NOT NULL REFERENCES oa_operators(id), recipient_id TEXT NOT NULL REFERENCES oa_operators(id), created_at INTEGER NOT NULL
);
CREATE TABLE p_collaboration_authority (event_id TEXT PRIMARY KEY REFERENCES p_collaboration_events(id));
CREATE TABLE p_collaboration_routes (route_id TEXT PRIMARY KEY REFERENCES p_notification_routes(id), configured_by TEXT NOT NULL REFERENCES oa_operators(id), created_at INTEGER NOT NULL);

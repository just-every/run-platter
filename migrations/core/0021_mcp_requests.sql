-- Retained business requests; the key identifier is provenance, never a credential.
-- No FK to p_agent_keys: credentials stay local when business archives travel.
CREATE TABLE p_send_requests (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL CHECK(revision > 0),
 requested_version INTEGER NOT NULL CHECK(requested_version > 0),
 owner_id TEXT NOT NULL REFERENCES oa_operators(id),
 agent_key_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','dismissed','fulfilled')),
 requested_at INTEGER NOT NULL,
 resolved_at INTEGER,
 resolved_by TEXT,
 CHECK((status='pending' AND resolved_at IS NULL AND resolved_by IS NULL) OR
       (status<>'pending' AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL))
);
CREATE UNIQUE INDEX p_send_request_active ON p_send_requests(proposal_id,revision,agent_key_id) WHERE status='pending';
CREATE INDEX p_send_requests_owner ON p_send_requests(owner_id,status,requested_at);

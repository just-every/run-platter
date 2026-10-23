-- Scoped machine credentials reuse the existing owner-version and revocation fence.
CREATE TABLE p_api_key_scopes (
 key_id TEXT PRIMARY KEY REFERENCES p_agent_keys(id) ON DELETE CASCADE,
 scopes TEXT NOT NULL
);

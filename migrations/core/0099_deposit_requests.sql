-- Request facts survive archives; the current owner's execution grant does not.
CREATE TABLE p_deposit_requests (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_acceptances(proposal_id) ON DELETE CASCADE,
 revision INTEGER NOT NULL, accepted_at INTEGER NOT NULL,
 recipient TEXT NOT NULL, deposit_cents INTEGER NOT NULL CHECK(deposit_cents>0),
 currency TEXT NOT NULL, authorized_by TEXT NOT NULL, authorized_at INTEGER NOT NULL,
 mail_id TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL, provider TEXT, provider_message_id TEXT, updated_at INTEGER NOT NULL,
 UNIQUE(proposal_id,revision)
);
CREATE TABLE p_deposit_request_authority (
 request_id TEXT PRIMARY KEY REFERENCES p_deposit_requests(id) ON DELETE CASCADE,
 owner_id TEXT NOT NULL, owner_version INTEGER NOT NULL,
 client_id TEXT NOT NULL, client_email TEXT NOT NULL,
 invitation_hash TEXT NOT NULL, acceptance_hash TEXT NOT NULL
);

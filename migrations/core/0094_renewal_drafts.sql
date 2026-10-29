CREATE TABLE p_renewals (
 proposal_id TEXT PRIMARY KEY REFERENCES p_acceptances(proposal_id),
 revision INTEGER NOT NULL, version INTEGER NOT NULL,
 lead_days INTEGER NOT NULL CHECK(lead_days=45), ends_on TEXT NOT NULL, due_on TEXT NOT NULL,
 increase_kind TEXT NOT NULL CHECK(increase_kind IN ('percent','fixed')),
 increase_value INTEGER NOT NULL CHECK(increase_value>=0),
 authorized_by TEXT NOT NULL, authorized_at INTEGER NOT NULL,
 draft_id TEXT UNIQUE REFERENCES p_proposals(id), drafted_at INTEGER
);
CREATE TABLE p_renewal_authority (
 proposal_id TEXT PRIMARY KEY REFERENCES p_renewals(proposal_id),
 version INTEGER NOT NULL, operator_version INTEGER NOT NULL
);

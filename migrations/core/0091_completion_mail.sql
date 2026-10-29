-- Retained artifact references are history; outbox rows and execution grants stay local.
CREATE TABLE p_completion_mail (
 mail_id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_acceptances(proposal_id),
 revision INTEGER NOT NULL, party TEXT NOT NULL CHECK(party IN ('client','firm')),
 UNIQUE(proposal_id,revision,party)
);
CREATE TABLE p_completion_authority (
 proposal_id TEXT PRIMARY KEY REFERENCES p_acceptances(proposal_id), revision INTEGER NOT NULL,
 owner_id TEXT NOT NULL, owner_version INTEGER NOT NULL, firm_email TEXT NOT NULL,
 client_id TEXT NOT NULL, client_email TEXT NOT NULL, recipient TEXT NOT NULL
);

-- Reviewed public projections create drafts only. Execution grants stay local.
CREATE TABLE p_public_forms (
 id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES p_personal_templates(id),
 template_version INTEGER NOT NULL, template_snapshot TEXT NOT NULL,
 projection TEXT NOT NULL, delivery TEXT NOT NULL, digest TEXT NOT NULL,
 owner_id TEXT NOT NULL REFERENCES oa_operators(id), owner_version INTEGER NOT NULL,
 submission_cap INTEGER NOT NULL CHECK(submission_cap BETWEEN 1 AND 10000),
 submitted_count INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL, disabled_at INTEGER
);
CREATE TABLE p_public_form_reviews (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, owner_version INTEGER NOT NULL,
 template_id TEXT NOT NULL, template_version INTEGER NOT NULL, template_snapshot TEXT NOT NULL,
 projection TEXT NOT NULL, delivery TEXT NOT NULL, digest TEXT NOT NULL,
 submission_cap INTEGER NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL,
 published_id TEXT
);
CREATE TABLE p_public_form_authority (form_id TEXT PRIMARY KEY REFERENCES p_public_forms(id), owner_version INTEGER NOT NULL);
CREATE TABLE p_public_intake_challenges (
 token_hash TEXT PRIMARY KEY, form_id TEXT NOT NULL REFERENCES p_public_forms(id),
 payload TEXT NOT NULL, mailbox TEXT NOT NULL, code_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
 consumed_at INTEGER
);
CREATE INDEX p_public_intake_mailbox ON p_public_intake_challenges(form_id,mailbox,created_at);
CREATE TABLE p_public_intake_mail (
 id TEXT PRIMARY KEY, challenge_hash TEXT NOT NULL, recipient TEXT NOT NULL,
 subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE p_public_submissions (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), form_id TEXT NOT NULL REFERENCES p_public_forms(id),
 challenge_hash TEXT NOT NULL UNIQUE, template_version INTEGER NOT NULL, digest TEXT NOT NULL,
 visitor TEXT NOT NULL, selection TEXT NOT NULL, submitted_at INTEGER NOT NULL
);

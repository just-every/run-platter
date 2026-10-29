-- Portable notice choices are separate from local execution grants.
ALTER TABLE p_sender_notice_settings ADD COLUMN email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(email_enabled IN (0,1));
ALTER TABLE p_sender_notice_settings ADD COLUMN slack_route TEXT REFERENCES p_notification_routes(id);
ALTER TABLE p_sender_notice_events ADD COLUMN kind TEXT NOT NULL DEFAULT 'expiry' CHECK(kind IN ('expiry','renewal'));
ALTER TABLE p_sender_notice_events ADD COLUMN email_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE p_sender_notice_events ADD COLUMN slack_route TEXT;
ALTER TABLE p_sender_notice_runs ADD COLUMN kind TEXT NOT NULL DEFAULT 'expiry' CHECK(kind IN ('expiry','renewal'));
ALTER TABLE p_sender_notice_runs ADD COLUMN term_end TEXT;
ALTER TABLE p_sender_notice_runs ADD COLUMN time_zone TEXT;

CREATE TABLE p_renewal_notice_settings (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1)), lead_days INTEGER NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 email_enabled INTEGER NOT NULL DEFAULT 1 CHECK(email_enabled IN (0,1)),
 slack_route TEXT REFERENCES p_notification_routes(id)
);
CREATE TABLE p_renewal_notice_authority (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),
 consent_id TEXT NOT NULL REFERENCES p_sender_notice_events(id)
);
CREATE TABLE p_renewal_followups (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id), term_end TEXT NOT NULL,
 renews_on TEXT NOT NULL, due_date TEXT NOT NULL, action TEXT NOT NULL,
 closed_at INTEGER, resolution TEXT,
 actor_id TEXT NOT NULL REFERENCES oa_operators(id), updated_at INTEGER NOT NULL,
 PRIMARY KEY(proposal_id,term_end)
);
CREATE TABLE p_template_notice_defaults (
 template_id TEXT PRIMARY KEY REFERENCES p_personal_templates(id),
 source TEXT NOT NULL CHECK(source IN ('inherit','override')), settings TEXT NOT NULL
);

-- Legacy settings remain inert until the sender explicitly saves and authorizes them.
ALTER TABLE p_sender_notice_settings ADD COLUMN renewal_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE p_sender_notice_settings ADD COLUMN renewal_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE p_sender_notice_events ADD COLUMN renewal_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE p_sender_notice_events ADD COLUMN renewal_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE p_sender_notice_runs ADD COLUMN kind TEXT NOT NULL DEFAULT 'expiry' CHECK(kind IN ('expiry','renewal'));
CREATE TABLE p_template_sender_notices (
 template_id TEXT PRIMARY KEY REFERENCES p_personal_templates(id),
 source TEXT NOT NULL DEFAULT 'override' CHECK(source IN ('inherit','override')),
 enabled INTEGER NOT NULL, lead_days INTEGER NOT NULL,
 renewal_enabled INTEGER NOT NULL, renewal_days INTEGER NOT NULL
);

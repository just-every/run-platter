CREATE TABLE p_reminder_templates(id TEXT PRIMARY KEY,name TEXT NOT NULL,subject TEXT NOT NULL,message TEXT NOT NULL,locked INTEGER NOT NULL DEFAULT 0,is_default INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,updated_by TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE UNIQUE INDEX p_reminder_template_default ON p_reminder_templates(is_default) WHERE is_default=1;
CREATE TABLE p_template_reminder_messages(template_id TEXT PRIMARY KEY REFERENCES p_personal_templates(id),message_id TEXT REFERENCES p_reminder_templates(id));

-- Delivery settings are retained business facts; execution authority stays excluded.
CREATE TABLE p_delivery_changes(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,proposal_id TEXT NOT NULL REFERENCES p_proposals(id),revision INTEGER NOT NULL,actor_id TEXT NOT NULL,actor_email TEXT NOT NULL,action TEXT NOT NULL,settings TEXT NOT NULL,occurred_at INTEGER NOT NULL);
ALTER TABLE p_personal_templates ADD COLUMN delivery_sources TEXT NOT NULL DEFAULT '{"reminders":"override","expiry":"override","warning":"override"}';

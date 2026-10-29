-- Existing destinations gain no additional events without fresh explicit consent.
ALTER TABLE p_notification_routes ADD COLUMN lifecycle_events TEXT NOT NULL DEFAULT '[]';
ALTER TABLE p_notification_routes ADD COLUMN lifecycle_cursor INTEGER NOT NULL DEFAULT 0;

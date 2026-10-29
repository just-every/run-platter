-- A Teams channel retains its verified parent team separately from its destination.
ALTER TABLE p_notification_routes ADD COLUMN team_id TEXT;

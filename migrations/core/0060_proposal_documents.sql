-- Additive content; historical offers keep their original form.
ALTER TABLE p_proposals ADD COLUMN document TEXT NOT NULL DEFAULT '{}';

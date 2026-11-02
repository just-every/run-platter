-- The request is business history; retain names without credentials or grants.
-- Older requests keep absent attribution rather than infer it after a restore.
ALTER TABLE p_send_requests ADD COLUMN prepared_by TEXT;

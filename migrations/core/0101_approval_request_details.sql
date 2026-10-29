-- Business history survives export; notification authority remains local.
ALTER TABLE p_approval_requests ADD COLUMN trigger_snapshot TEXT;
ALTER TABLE p_approval_requests ADD COLUMN revoked_at INTEGER;
ALTER TABLE p_approval_requests ADD COLUMN revoked_by TEXT;

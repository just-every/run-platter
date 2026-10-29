-- Schedule history travels in archives. Execution grants and mail stay local.
CREATE TABLE p_report_authority (
 schedule_id TEXT PRIMARY KEY REFERENCES p_report_schedules(id) ON DELETE CASCADE,
 operator_version INTEGER NOT NULL,
 member_version INTEGER NOT NULL,
 authorized_at INTEGER NOT NULL
);
ALTER TABLE p_report_mail ADD COLUMN stopped_reason TEXT;

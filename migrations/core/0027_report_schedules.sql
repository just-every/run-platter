-- REPORT-005: scheduled report email. Hours are in the installation's time zone (UTC until set);
-- next_run_at is the UTC instant, and a run claims it once.
CREATE TABLE p_installation_settings (
 singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
 time_zone TEXT NOT NULL
);
CREATE TABLE p_report_schedules (
 id TEXT PRIMARY KEY,
 report TEXT NOT NULL CHECK(report IN ('pipeline')),
 filters TEXT NOT NULL,
 cadence TEXT NOT NULL CHECK(cadence IN ('daily','weekly')),
 weekday INTEGER CHECK(weekday BETWEEN 0 AND 6),
 hour INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),
 recipients TEXT NOT NULL,
 owner_id TEXT NOT NULL REFERENCES oa_operators(id),
 created_at INTEGER NOT NULL,
 next_run_at INTEGER NOT NULL,
 last_run_at INTEGER
);
CREATE TABLE p_report_runs (
 id TEXT PRIMARY KEY,
 schedule_id TEXT NOT NULL REFERENCES p_report_schedules(id) ON DELETE CASCADE,
 ran_at INTEGER NOT NULL,
 row_count INTEGER NOT NULL,
 skipped TEXT NOT NULL
);
CREATE TABLE p_report_mail (
 id TEXT PRIMARY KEY,
 run_id TEXT NOT NULL REFERENCES p_report_runs(id) ON DELETE CASCADE,
 recipient TEXT NOT NULL,
 subject TEXT NOT NULL,
 body TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','local','sending','accepted','uncertain')),
 created_at INTEGER NOT NULL,
 provider_message_id TEXT
);

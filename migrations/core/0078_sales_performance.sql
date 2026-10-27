-- Explicit client segments support internal performance reports and historical price comparisons.
ALTER TABLE p_clients ADD COLUMN segment TEXT NOT NULL DEFAULT '';
ALTER TABLE p_report_schedules ADD COLUMN report_view TEXT NOT NULL DEFAULT 'pipeline' CHECK(report_view IN ('pipeline','sales-performance'));

-- SEND-004. Business expiry and reopen requests are retained; transport remains in p_mail.
-- A sent proposal keeps its existing status CHECK; expiry is derived from its deadline.
CREATE TABLE p_expiry (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),
 mode TEXT NOT NULL CHECK(mode IN ('never','days','date')),
 period_days INTEGER CHECK(period_days BETWEEN 1 AND 36500),
 expires_on TEXT,
 time_zone TEXT NOT NULL DEFAULT 'UTC',
 sent_at INTEGER,
 deadline_at INTEGER,
 warning_days INTEGER CHECK(warning_days BETWEEN 0 AND 36500),
 warning_sent_at INTEGER,
 owner_id TEXT REFERENCES oa_operators(id),
 CHECK((mode='never' AND period_days IS NULL AND expires_on IS NULL AND deadline_at IS NULL)
    OR (mode='days' AND period_days IS NOT NULL)
    OR (mode='date' AND period_days IS NULL AND expires_on IS NOT NULL))
);
-- Existing offers had no expiry; retain their original send time when known.
INSERT INTO p_expiry(proposal_id,mode,sent_at,owner_id)
 SELECT p.id,'never',COALESCE((SELECT MIN(m.created_at) FROM p_mail m WHERE m.proposal_id=p.id),p.created_at),
 (SELECT id FROM oa_operators o WHERE o.email=p.approved_by AND o.role='owner' LIMIT 1)
 FROM p_proposals p WHERE p.status IN ('sent','accepted');
CREATE INDEX p_expiry_due ON p_expiry(deadline_at) WHERE deadline_at IS NOT NULL;
CREATE TABLE p_reopen_requests (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 deadline_at INTEGER NOT NULL,
 requested_at INTEGER NOT NULL,
 resolved_at INTEGER,
 resolution TEXT CHECK(resolution IN ('extended','removed','reissued')),
 UNIQUE(proposal_id,revision,deadline_at)
);
-- Only the trusted CronController's scheduledTime advances this installation clock.
-- Local/exported business records contain no invitation token or mail transport id.
CREATE TABLE p_expiry_clock (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 observed_at INTEGER NOT NULL
);

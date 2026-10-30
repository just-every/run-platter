-- Delivery facts survive restore, without an executable outbox or grant.
CREATE TABLE p_deposit_request_events (
 request_id TEXT NOT NULL REFERENCES p_deposit_requests(id) ON DELETE CASCADE,
 status TEXT NOT NULL,
 occurred_at INTEGER NOT NULL,
 provider TEXT,
 provider_message_id TEXT,
 PRIMARY KEY(request_id,status)
);
-- Keep the last recorded fact for existing requests; do not invent past steps.
INSERT INTO p_deposit_request_events(request_id,status,occurred_at,provider,provider_message_id)
 SELECT id,status,updated_at,provider,provider_message_id FROM p_deposit_requests;

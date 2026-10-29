-- Provider opt-in receipts are history, never consent or sending authority.
CREATE TABLE p_sms_provider_optins (
 id TEXT PRIMARY KEY, phone TEXT NOT NULL, transport_hash TEXT NOT NULL, received_at INTEGER NOT NULL
);
CREATE TABLE p_sms_reenable_eligibility (
 phone TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES p_sms_provider_optins(id), stopped_at INTEGER NOT NULL
);
CREATE TABLE p_sms_reenable_history (
 id TEXT PRIMARY KEY, phone TEXT NOT NULL, proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 assent_id TEXT NOT NULL REFERENCES p_sms_assents(id), actor_id TEXT NOT NULL,
 provider_event_id TEXT NOT NULL REFERENCES p_sms_provider_optins(id), stopped_at INTEGER NOT NULL,
 source TEXT NOT NULL, reenabled_at INTEGER NOT NULL
);
CREATE TRIGGER p_frozen_sms_provider_optin BEFORE UPDATE ON p_sms_provider_optins BEGIN SELECT RAISE(ABORT,'Provider opt-in history is immutable'); END;
CREATE TRIGGER p_frozen_sms_reenable BEFORE UPDATE ON p_sms_reenable_history BEGIN SELECT RAISE(ABORT,'SMS re-enablement history is immutable'); END;

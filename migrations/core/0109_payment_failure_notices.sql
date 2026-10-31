-- Failure receipts and delivery outcomes are history. The execution grant stays local.
CREATE TABLE p_payment_failure_authority (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL UNIQUE REFERENCES p_proposals(id),
 revision INTEGER NOT NULL, intent_id TEXT NOT NULL REFERENCES p_collection_intents(id),
 account_id TEXT NOT NULL, connection_version INTEGER NOT NULL,
 owner_id TEXT NOT NULL, owner_version INTEGER NOT NULL, firm_email TEXT NOT NULL,
 client_id TEXT NOT NULL, recipient TEXT NOT NULL, share_token TEXT NOT NULL,
 authorized_at INTEGER NOT NULL
);
CREATE TABLE p_payment_failure_settings (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id), revision INTEGER NOT NULL,
 version INTEGER NOT NULL, enabled INTEGER NOT NULL, owner_id TEXT NOT NULL, changed_at INTEGER NOT NULL
);
CREATE TABLE p_payment_failures (
 id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES p_acceptances(proposal_id),
 revision INTEGER NOT NULL, intent_id TEXT NOT NULL, account_id TEXT NOT NULL,
 provider_attempt TEXT NOT NULL, authority_id TEXT NOT NULL, cents INTEGER NOT NULL,
 currency TEXT NOT NULL, reason TEXT NOT NULL CHECK(reason IN ('card_declined','insufficient_funds','expired_card','incorrect_cvc','processing_error','payment_failed')),
 attempted_at INTEGER NOT NULL, observed_at INTEGER NOT NULL,
 UNIQUE(account_id,provider_attempt)
);
CREATE TABLE p_payment_failure_deliveries (
 mail_id TEXT PRIMARY KEY, failure_id TEXT NOT NULL REFERENCES p_payment_failures(id),
 party TEXT NOT NULL CHECK(party IN ('client','firm')), status TEXT NOT NULL,
 updated_at INTEGER NOT NULL, UNIQUE(failure_id,party)
);

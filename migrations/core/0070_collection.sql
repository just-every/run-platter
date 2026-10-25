-- Collection is opt-in: absence of a policy preserves existing signing.
CREATE TABLE p_collection_policy (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),
 completion TEXT NOT NULL CHECK(completion IN ('required','due'))
);

-- Reserve one deposit before provider calls and retain it through uncertain outcomes.
-- Provider client secrets are response-only and must never be written here.
CREATE TABLE p_collection_intents (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL CHECK(revision>0),
 account_id TEXT NOT NULL,
 provider_intent TEXT UNIQUE,
 provider_mandate TEXT,
 cents INTEGER NOT NULL CHECK(cents>0),
 deposit_cents INTEGER NOT NULL CHECK(deposit_cents>0),
 fee_cents INTEGER NOT NULL DEFAULT 0 CHECK(fee_cents>=0),
 billing_state TEXT NOT NULL DEFAULT '',
 currency TEXT NOT NULL,
 method TEXT NOT NULL CHECK(method IN ('card','ach','apple_pay','google_pay')),
 status TEXT NOT NULL,
 authorization TEXT NOT NULL,
 authorized_at INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(proposal_id,revision)
);

CREATE TABLE p_collection_fees (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 bps INTEGER NOT NULL CHECK(bps>=0 AND bps<=300),
 allowed_states TEXT NOT NULL,
 prohibited_states TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1
);

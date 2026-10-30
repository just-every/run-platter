-- Preserve every existing receipt while allowing a native PayPal receipt.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE p_payment_records_saved AS SELECT rowid AS saved_rowid,id,proposal_id,revision,currency,cents,method,provider_charge,reference,received_on,recorded_by,recorded_at,version FROM p_payment_records;
DROP TABLE p_payment_records;
CREATE TABLE p_payment_records(id TEXT PRIMARY KEY,proposal_id TEXT NOT NULL REFERENCES p_proposals(id),revision INTEGER NOT NULL,currency TEXT NOT NULL,cents INTEGER NOT NULL CHECK(cents>0),method TEXT NOT NULL CHECK(method IN ('stripe','paypal','check','wire','ach_credit')),provider_charge TEXT UNIQUE,reference TEXT NOT NULL,received_on TEXT,recorded_by TEXT NOT NULL REFERENCES oa_operators(id),recorded_at INTEGER NOT NULL,version INTEGER NOT NULL DEFAULT 1);
INSERT INTO p_payment_records(rowid,id,proposal_id,revision,currency,cents,method,provider_charge,reference,received_on,recorded_by,recorded_at,version) SELECT saved_rowid,id,proposal_id,revision,currency,cents,method,provider_charge,reference,received_on,recorded_by,recorded_at,version FROM p_payment_records_saved;
DROP TABLE p_payment_records_saved;
CREATE TABLE p_paypal_selection(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),merchant_id TEXT NOT NULL,connection_version INTEGER NOT NULL);
-- Selection history is portable. Execution grants and invitation bindings are local.
CREATE TABLE p_paypal_authority(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),merchant_id TEXT NOT NULL,connection_version INTEGER NOT NULL,actor_id TEXT NOT NULL,actor_version INTEGER NOT NULL,actor_role TEXT NOT NULL,member_version INTEGER NOT NULL);
CREATE TABLE p_paypal_deposits(
 id TEXT PRIMARY KEY,proposal_id TEXT NOT NULL REFERENCES p_proposals(id),revision INTEGER NOT NULL,
 merchant_id TEXT NOT NULL,connection_version INTEGER NOT NULL,order_id TEXT UNIQUE,capture_id TEXT UNIQUE,
 cents INTEGER NOT NULL CHECK(cents>0),currency TEXT NOT NULL CHECK(currency='USD'),status TEXT NOT NULL,
 authorization TEXT NOT NULL,create_request TEXT NOT NULL UNIQUE,capture_request TEXT UNIQUE,authorized_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(proposal_id,revision)
);
CREATE TABLE p_paypal_transport(deposit_id TEXT PRIMARY KEY REFERENCES p_paypal_deposits(id),share_token TEXT NOT NULL,session_hash TEXT NOT NULL);
CREATE TABLE p_paypal_events(id TEXT PRIMARY KEY,deposit_id TEXT NOT NULL REFERENCES p_paypal_deposits(id),merchant_id TEXT NOT NULL,event_hash TEXT NOT NULL,status TEXT NOT NULL,received_at INTEGER NOT NULL);

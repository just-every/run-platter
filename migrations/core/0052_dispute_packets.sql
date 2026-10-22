-- Prepared bytes and explicit human authorization precede any provider submission.
CREATE TABLE p_dispute_packets(
 id TEXT PRIMARY KEY,dispute_id TEXT NOT NULL REFERENCES p_disputes(id),
 dispute_version INTEGER NOT NULL,cents INTEGER NOT NULL,currency TEXT NOT NULL,deadline INTEGER NOT NULL,
 note TEXT NOT NULL,document_hash TEXT NOT NULL,prepared_by TEXT NOT NULL REFERENCES oa_operators(id),prepared_at INTEGER NOT NULL
);
CREATE TABLE p_dispute_packet_parts(packet_id TEXT NOT NULL REFERENCES p_dispute_packets(id),part INTEGER NOT NULL,base64 TEXT NOT NULL,PRIMARY KEY(packet_id,part));
CREATE TABLE p_dispute_authorizations(
 packet_id TEXT PRIMARY KEY REFERENCES p_dispute_packets(id),document_hash TEXT NOT NULL,
 dispute_id TEXT NOT NULL REFERENCES p_disputes(id),cents INTEGER NOT NULL,currency TEXT NOT NULL,deadline INTEGER NOT NULL,
 authorized_by TEXT NOT NULL REFERENCES oa_operators(id),authorized_at INTEGER NOT NULL
);
ALTER TABLE p_dispute_submissions ADD COLUMN packet_id TEXT REFERENCES p_dispute_packets(id);
CREATE UNIQUE INDEX p_dispute_submission_packet ON p_dispute_submissions(packet_id);

-- Explicit imported-contact selection is bound to the reviewed erasure digest.
ALTER TABLE p_privacy_reviews ADD COLUMN contact_id TEXT;
ALTER TABLE p_privacy_reviews ADD COLUMN documents_json TEXT NOT NULL DEFAULT '[]';
-- Exact erased source bytes cannot be uploaded again, including pending copies.
CREATE TABLE p_privacy_erased_uploads (
 sha256 TEXT PRIMARY KEY, receipt_id TEXT NOT NULL REFERENCES p_privacy_receipts(id)
);

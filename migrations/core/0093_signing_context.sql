-- Null preserves the absence of historical signing-request evidence.
ALTER TABLE p_signature_facts ADD COLUMN context TEXT;

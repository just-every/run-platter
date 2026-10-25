-- Optional offer terms. No legacy record or frozen snapshot is rewritten.
ALTER TABLE p_proposals ADD COLUMN payment_terms TEXT;

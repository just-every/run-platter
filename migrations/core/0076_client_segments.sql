-- Explicit client segmentation; legacy clients remain unclassified.
ALTER TABLE p_clients ADD COLUMN segment TEXT NOT NULL DEFAULT 'Not recorded';

-- Keep replay identities and completed row receipts after captured data is erased.
ALTER TABLE p_bulk_batches ADD COLUMN erased_at INTEGER;
DROP TRIGGER p_bulk_client_erasure;
CREATE TRIGGER p_bulk_client_erasure BEFORE DELETE ON p_clients BEGIN
 DELETE FROM p_bulk_authority WHERE batch_id IN (SELECT batch_id FROM p_bulk_bindings WHERE client_id=OLD.id);
 UPDATE p_bulk_rows SET client_id=NULL,input_json='{}',client_json=NULL,content_json=NULL,exception='Batch erased'
  WHERE batch_id IN (SELECT batch_id FROM p_bulk_bindings WHERE client_id=OLD.id);
 UPDATE p_bulk_batches SET csv='',csv_hash='',digest='',source_json='[]',erased_at=unixepoch()*1000
  WHERE id IN (SELECT batch_id FROM p_bulk_bindings WHERE client_id=OLD.id);
 DELETE FROM p_bulk_bindings WHERE batch_id IN (SELECT batch_id FROM p_bulk_bindings WHERE client_id=OLD.id);
END;

-- A separately promoted price still owes its retained source and original journal.
CREATE TRIGGER p_imported_catalog_priced_dependency BEFORE DELETE ON p_catalog_items
WHEN EXISTS(SELECT 1 FROM p_priced_catalog WHERE source_id=OLD.id)
BEGIN
 SELECT RAISE(ABORT,'IMPORT_CATALOG_DEPENDENCY_CONFLICT');
END;

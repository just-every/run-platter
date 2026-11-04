-- Undoing an unused imported template also removes its retained versions.
-- Existing proposal and import guards still refuse deleting templates in use.
CREATE TRIGGER p_template_learning_version_delete BEFORE DELETE ON p_personal_templates
 BEGIN DELETE FROM p_template_learning_versions WHERE template_id=OLD.id; END;

-- Undoing an unused imported template also removes its retained versions.
-- Existing proposal and import guards still refuse deleting templates in use.
DROP TRIGGER p_template_learning_version_insert;
DROP TRIGGER p_template_learning_version_update;
DROP TRIGGER p_template_learning_version_immutable;
ALTER TABLE p_template_learning_versions RENAME TO p_template_learning_versions_previous;
CREATE TABLE p_template_learning_versions (
 template_id TEXT NOT NULL REFERENCES p_personal_templates(id) ON DELETE CASCADE,
 version INTEGER NOT NULL,
 name TEXT NOT NULL,
 snapshot TEXT NOT NULL,
 PRIMARY KEY(template_id,version)
);
INSERT INTO p_template_learning_versions SELECT * FROM p_template_learning_versions_previous;
DROP TABLE p_template_learning_versions_previous;
CREATE TRIGGER p_template_learning_version_insert AFTER INSERT ON p_personal_templates
 BEGIN INSERT INTO p_template_learning_versions VALUES(NEW.id,NEW.version,NEW.name,NEW.snapshot); END;
CREATE TRIGGER p_template_learning_version_update AFTER UPDATE ON p_personal_templates WHEN NEW.version<>OLD.version
 BEGIN INSERT INTO p_template_learning_versions VALUES(NEW.id,NEW.version,NEW.name,NEW.snapshot); END;
CREATE TRIGGER p_template_learning_version_immutable BEFORE UPDATE ON p_template_learning_versions
 BEGIN SELECT RAISE(ABORT,'Template version is immutable'); END;

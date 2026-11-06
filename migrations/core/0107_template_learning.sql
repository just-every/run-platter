-- Template learning retains content and descriptive results, never execution authority.
CREATE TABLE p_template_learning_versions (
 template_id TEXT NOT NULL REFERENCES p_personal_templates(id),
 version INTEGER NOT NULL,
 name TEXT NOT NULL,
 snapshot TEXT NOT NULL,
 PRIMARY KEY(template_id,version)
);
INSERT INTO p_template_learning_versions SELECT id,version,name,snapshot FROM p_personal_templates;
CREATE TRIGGER p_template_learning_version_insert AFTER INSERT ON p_personal_templates
 BEGIN INSERT INTO p_template_learning_versions VALUES(NEW.id,NEW.version,NEW.name,NEW.snapshot); END;
CREATE TRIGGER p_template_learning_version_update AFTER UPDATE ON p_personal_templates WHEN NEW.version<>OLD.version
 BEGIN INSERT INTO p_template_learning_versions VALUES(NEW.id,NEW.version,NEW.name,NEW.snapshot); END;
CREATE TRIGGER p_template_learning_version_immutable BEFORE UPDATE ON p_template_learning_versions
 BEGIN SELECT RAISE(ABORT,'Template version is immutable'); END;
CREATE TABLE p_template_learning_reports (
 id TEXT PRIMARY KEY,
 created_by TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 result TEXT NOT NULL
);
CREATE TRIGGER p_template_learning_report_immutable BEFORE UPDATE ON p_template_learning_reports
 BEGIN SELECT RAISE(ABORT,'Learning result is immutable'); END;
CREATE TABLE p_template_learning_sources (
 report_id TEXT NOT NULL REFERENCES p_template_learning_reports(id) ON DELETE CASCADE,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 cohort INTEGER NOT NULL CHECK(cohort IN (0,1)),
 basis TEXT NOT NULL CHECK(basis IN ('signed','recorded-won','lost','declined')),
 decided_at INTEGER NOT NULL,
 snapshot_hash TEXT NOT NULL,
 PRIMARY KEY(report_id,proposal_id)
);
CREATE TRIGGER p_template_learning_source_immutable BEFORE UPDATE ON p_template_learning_sources
 BEGIN SELECT RAISE(ABORT,'Learning source is immutable'); END;

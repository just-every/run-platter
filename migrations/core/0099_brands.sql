CREATE TABLE p_brands(id TEXT PRIMARY KEY,name TEXT NOT NULL,kit TEXT NOT NULL DEFAULT '{}',version INTEGER NOT NULL DEFAULT 1,updated_by TEXT REFERENCES oa_operators(id),updated_at INTEGER NOT NULL);
INSERT INTO p_brands(id,name,updated_at) VALUES('default','Default brand',0);
CREATE TABLE p_brand_members(brand_id TEXT NOT NULL REFERENCES p_brands(id),operator_id TEXT NOT NULL REFERENCES oa_operators(id),PRIMARY KEY(brand_id,operator_id));
INSERT INTO p_brand_members SELECT 'default',id FROM oa_operators WHERE status='active';
CREATE TRIGGER p_brand_new_person AFTER INSERT ON oa_operators WHEN NEW.status='active' BEGIN
 INSERT INTO p_brand_members VALUES('default',NEW.id);
END;
CREATE TRIGGER p_brand_confirm_person AFTER UPDATE OF status ON oa_operators WHEN NEW.status='active' AND OLD.status='invited' BEGIN
 INSERT OR IGNORE INTO p_brand_members VALUES('default',NEW.id);
END;
CREATE TABLE p_brand_choices(operator_id TEXT PRIMARY KEY REFERENCES oa_operators(id),brand_id TEXT NOT NULL REFERENCES p_brands(id));
ALTER TABLE p_clients ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'default' REFERENCES p_brands(id);
ALTER TABLE p_proposals ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'default' REFERENCES p_brands(id);
ALTER TABLE p_personal_templates ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'default' REFERENCES p_brands(id);
ALTER TABLE p_library_items ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'default' REFERENCES p_brands(id);
ALTER TABLE p_priced_catalog ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'default' REFERENCES p_brands(id);
ALTER TABLE p_resource_folders ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'default' REFERENCES p_brands(id);
ALTER TABLE p_proposal_folders ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'default' REFERENCES p_brands(id);
CREATE TRIGGER p_proposal_brand AFTER INSERT ON p_proposals BEGIN
 UPDATE p_proposals SET brand_id=(SELECT brand_id FROM p_clients WHERE id=NEW.client_id) WHERE id=NEW.id;
END;

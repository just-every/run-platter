CREATE TABLE p_resource_folders(id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('template','library')),name TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,updated_by TEXT NOT NULL REFERENCES oa_operators(id),updated_at INTEGER NOT NULL);
CREATE TABLE p_folder_teams(folder_id TEXT NOT NULL REFERENCES p_resource_folders(id),team_id TEXT NOT NULL REFERENCES p_teams(id),PRIMARY KEY(folder_id,team_id));
ALTER TABLE p_personal_templates ADD COLUMN shared INTEGER NOT NULL DEFAULT 0 CHECK(shared IN (0,1));
ALTER TABLE p_personal_templates ADD COLUMN folder_id TEXT REFERENCES p_resource_folders(id);
ALTER TABLE p_library_items ADD COLUMN folder_id TEXT REFERENCES p_resource_folders(id);

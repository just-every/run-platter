CREATE TABLE p_proposal_folders(id TEXT PRIMARY KEY,name TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,updated_by TEXT NOT NULL REFERENCES oa_operators(id),updated_at INTEGER NOT NULL);
CREATE TABLE p_proposal_folder_teams(folder_id TEXT NOT NULL REFERENCES p_proposal_folders(id),team_id TEXT NOT NULL REFERENCES p_teams(id),PRIMARY KEY(folder_id,team_id));
CREATE TABLE p_proposal_filing(proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),folder_id TEXT REFERENCES p_proposal_folders(id),version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE p_attachment_search(file_id TEXT PRIMARY KEY REFERENCES p_attachment_files(id),content TEXT NOT NULL);

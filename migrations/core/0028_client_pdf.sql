CREATE TABLE p_pdf_settings (
 proposal_id TEXT PRIMARY KEY REFERENCES p_proposals(id),
 enabled INTEGER NOT NULL CHECK(enabled IN (0,1))
);
CREATE TABLE p_pdf_downloads (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 option_id TEXT NOT NULL,
 client_id TEXT NOT NULL REFERENCES p_clients(id),
 downloaded_at INTEGER NOT NULL
);

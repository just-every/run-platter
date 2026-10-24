-- Provenance is separate from recipient content and survives archival custody.
CREATE TABLE p_library_uses (
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 block_id TEXT NOT NULL,
 item_id TEXT NOT NULL REFERENCES p_library_items(id),
 linked INTEGER NOT NULL CHECK(linked IN (0,1)),
 item_version INTEGER NOT NULL,
 title TEXT NOT NULL,
 content TEXT NOT NULL,
 kind TEXT NOT NULL,
 PRIMARY KEY(proposal_id,block_id)
);
CREATE INDEX p_library_uses_item ON p_library_uses(item_id);

CREATE TABLE p_imported_library (
 item_id TEXT PRIMARY KEY REFERENCES p_library_items(id),
 document TEXT NOT NULL CHECK(json_valid(document)),
 options TEXT NOT NULL CHECK(json_valid(options))
);

CREATE TABLE p_archive_dispatch_lock (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1), token TEXT NOT NULL, expires_at INTEGER NOT NULL
);

-- Owner-configured jurisdiction rates are business records; revision snapshots carry the rates used.
CREATE TABLE p_tax_settings (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 rates TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1
);

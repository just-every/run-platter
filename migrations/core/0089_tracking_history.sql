-- Preserve historical snapshots while allowing a later return to the same choice.
ALTER TABLE p_tracking_choices RENAME TO p_tracking_choice_snapshots;
CREATE TABLE p_tracking_choices(
 view_id TEXT NOT NULL REFERENCES p_views(id) ON DELETE CASCADE,
 sequence INTEGER NOT NULL,
 option_id TEXT NOT NULL,
 items TEXT NOT NULL,
 observed_at INTEGER NOT NULL,
 PRIMARY KEY(view_id,sequence)
);
INSERT INTO p_tracking_choices(view_id,sequence,option_id,items,observed_at)
 SELECT view_id,ROW_NUMBER() OVER(PARTITION BY view_id ORDER BY observed_at,rowid),option_id,items,observed_at
 FROM p_tracking_choice_snapshots;
DROP TABLE p_tracking_choice_snapshots;
CREATE TABLE p_tracking_attachment_opens(
 id TEXT PRIMARY KEY,
 view_id TEXT NOT NULL REFERENCES p_views(id) ON DELETE CASCADE,
 file_id TEXT NOT NULL,
 filename TEXT NOT NULL,
 opened_at INTEGER NOT NULL
);

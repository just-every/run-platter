-- Personal Teams choices are business history; execution grants remain local.
ALTER TABLE p_watchers ADD COLUMN teams_route TEXT REFERENCES p_notification_routes(id);

-- Retain only a verified failed charge identity, never card details or raw errors.
CREATE TABLE p_collection_failures (
 id TEXT PRIMARY KEY,
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL,
 collection_id TEXT NOT NULL REFERENCES p_collection_intents(id),
 provider_charge TEXT NOT NULL,
 observed_at INTEGER NOT NULL,
 UNIQUE(collection_id,provider_charge)
);

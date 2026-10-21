-- Product roles are additive to Base admission roles. Native owners remain owners.
CREATE TABLE p_members (
 operator_id TEXT PRIMARY KEY REFERENCES oa_operators(id),
 role TEXT NOT NULL CHECK(role IN ('admin','manager','sales','content_editor','viewer','billing')),
 time_zone TEXT NOT NULL DEFAULT 'UTC', version INTEGER NOT NULL DEFAULT 1
);
-- Existing native members resolve to sales with no team until explicitly configured.
-- No data backfill: first-release archives can restore through this additive schema.
CREATE TABLE p_teams(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE);
CREATE TABLE p_team_members(team_id TEXT NOT NULL REFERENCES p_teams(id),operator_id TEXT NOT NULL REFERENCES oa_operators(id),PRIMARY KEY(team_id,operator_id));
CREATE TABLE p_collaborators(proposal_id TEXT NOT NULL REFERENCES p_proposals(id),operator_id TEXT NOT NULL REFERENCES oa_operators(id),PRIMARY KEY(proposal_id,operator_id));

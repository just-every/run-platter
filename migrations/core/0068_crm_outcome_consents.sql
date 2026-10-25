-- Consent history is portable; execution authority remains installation-local.
CREATE TABLE p_crm_outcome_consents (
 audit_id TEXT PRIMARY KEY REFERENCES p_audit(id),
 proposal_id TEXT NOT NULL REFERENCES p_proposals(id),
 revision INTEGER NOT NULL, binding_version INTEGER NOT NULL,
 account_id TEXT NOT NULL, connection_version INTEGER NOT NULL,
 deal_id TEXT NOT NULL, pipeline_id TEXT NOT NULL,
 won_stage TEXT NOT NULL, lost_stage TEXT NOT NULL,
 UNIQUE(proposal_id,binding_version)
);

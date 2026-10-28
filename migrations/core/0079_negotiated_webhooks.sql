-- Negotiated drafts live beside the frozen sent offer. Retain each event in the
-- same transaction as its revision or approval, without replaying prior history.
CREATE TRIGGER p_webhook_negotiated_created AFTER INSERT ON p_negotiations BEGIN
 INSERT INTO p_webhook_events VALUES(lower(hex(randomblob(16))),'proposal.revised',NEW.proposal_id,NEW.revision,'draft',NEW.prepared_at);
END;
CREATE TRIGGER p_webhook_negotiated_revised AFTER UPDATE OF revision ON p_negotiations WHEN NEW.revision!=OLD.revision BEGIN
 INSERT INTO p_webhook_events VALUES(lower(hex(randomblob(16))),'proposal.revised',NEW.proposal_id,NEW.revision,'draft',NEW.prepared_at);
END;
CREATE TRIGGER p_webhook_negotiated_approved AFTER UPDATE OF approved_by,approved_at ON p_negotiations WHEN NEW.approved_by IS NOT NULL AND NEW.approved_at IS NOT NULL AND OLD.approved_by IS NULL BEGIN
 INSERT INTO p_webhook_events VALUES(lower(hex(randomblob(16))),'proposal.approved',NEW.proposal_id,NEW.revision,'approved',NEW.approved_at);
END;

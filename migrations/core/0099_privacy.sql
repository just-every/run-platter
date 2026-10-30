-- Reviews stay local. Receipts, holds and erased-contact fences are business custody.
CREATE TABLE p_privacy_reviews (
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES p_clients(id),
 actor_id TEXT NOT NULL, digest TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE p_privacy_holds (
 client_id TEXT NOT NULL REFERENCES p_clients(id), kind TEXT NOT NULL CHECK(kind IN ('retention','legal')),
 reason TEXT NOT NULL, held_by TEXT NOT NULL, held_at INTEGER NOT NULL,
 PRIMARY KEY(client_id,kind)
);
CREATE TABLE p_privacy_receipts (
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES p_clients(id),
 operator_id TEXT NOT NULL, erased_at INTEGER NOT NULL, receipt_json TEXT NOT NULL
);
CREATE TABLE p_erased_clients (
 client_id TEXT PRIMARY KEY REFERENCES p_clients(id), receipt_id TEXT NOT NULL REFERENCES p_privacy_receipts(id)
);
-- A copied or restored contact never confers new drafting or invitation authority.
CREATE TRIGGER p_privacy_no_new_proposal BEFORE INSERT ON p_proposals
 WHEN EXISTS(SELECT 1 FROM p_erased_clients WHERE client_id=NEW.client_id)
 BEGIN SELECT RAISE(ABORT,'Contact was erased'); END;
CREATE TRIGGER p_privacy_no_new_share BEFORE INSERT ON p_shares
 WHEN EXISTS(SELECT 1 FROM p_proposals p JOIN p_erased_clients e ON e.client_id=p.client_id WHERE p.id=NEW.proposal_id)
 BEGIN SELECT RAISE(ABORT,'Contact was erased'); END;

-- Late client work cannot reintroduce erased engagement or outbound messages.
CREATE TRIGGER p_privacy_no_new_view BEFORE INSERT ON p_views
 WHEN EXISTS(SELECT 1 FROM p_proposals p JOIN p_erased_clients e ON e.client_id=p.client_id WHERE p.id=NEW.proposal_id)
 BEGIN SELECT RAISE(ABORT,'Contact was erased'); END;
CREATE TRIGGER p_privacy_no_new_challenge BEFORE INSERT ON p_tracking_challenges
 WHEN EXISTS(SELECT 1 FROM p_proposals p JOIN p_erased_clients e ON e.client_id=p.client_id WHERE p.id=NEW.proposal_id)
 BEGIN SELECT RAISE(ABORT,'Contact was erased'); END;
CREATE TRIGGER p_privacy_no_new_stakeholder BEFORE INSERT ON p_tracking_stakeholders
 WHEN EXISTS(SELECT 1 FROM p_proposals p JOIN p_erased_clients e ON e.client_id=p.client_id WHERE p.id=NEW.proposal_id)
 BEGIN SELECT RAISE(ABORT,'Contact was erased'); END;
CREATE TRIGGER p_privacy_no_new_mail BEFORE INSERT ON p_mail
 WHEN EXISTS(SELECT 1 FROM p_proposals p JOIN p_erased_clients e ON e.client_id=p.client_id WHERE p.id=NEW.proposal_id)
 BEGIN SELECT RAISE(ABORT,'Contact was erased'); END;

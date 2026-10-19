import type { Bindings } from '../auth.server'
import { commit, exact, need, secret, snapshot, type Actor } from './model'
import { dispatchMail, proposalMail, queueMail } from './mail'

export async function pendingNegotiation(db: D1Database, id: string) {
 return db.prepare('SELECT * FROM p_negotiations WHERE proposal_id=?').bind(id).first<any>()
}
export function negotiatedView(offer: any, pending: any) {
 return pending ? { ...offer, ...JSON.parse(pending.snapshot), status: pending.approved_by ? 'approved' : 'draft', prepared_by: pending.prepared_by, approved_by: pending.approved_by, approved_at: pending.approved_at, negotiating: true, sentRevision: offer.revision } : offer
}

export async function negotiationCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>, offer: any, fields?: any) {
 const db = env.DB, at = Date.now(), pending = await pendingNegotiation(db, offer.id)
 exact(offer, input)
 need(offer.status === 'sent', 'Only an unsigned sent offer can be negotiated', 409)
 const guard = { sql: "EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='sent')", values: [offer.id, offer.version] }
 if (name === 'proposal.negotiate' || name === 'proposal.revise') {
  need(actor.role !== 'agent', 'A person starts or edits a negotiated revision', 403)
  need(name === 'proposal.negotiate' ? !pending : pending, 'Reload the negotiated revision before editing', 409)
  need(fields.client_id === offer.client_id, 'A negotiated revision keeps the same client')
  const latest = await db.prepare('SELECT MAX(revision) AS revision FROM p_revisions WHERE proposal_id=?').bind(offer.id).first<any>()
  const revision = latest.revision + 1, saved = JSON.stringify(snapshot({ ...offer, ...fields, revision }))
  await commit(db, actor, [
   db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(offer.id),
   db.prepare('INSERT INTO p_negotiations(proposal_id,revision,snapshot,prepared_by,prepared_at) VALUES(?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,prepared_by=excluded.prepared_by,prepared_at=excluded.prepared_at,approved_by=NULL,approved_at=NULL').bind(offer.id, revision, saved, actor.email, at),
   db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(offer.id, revision, saved, actor.email, at, offer.currency),
  ], false, guard)
  return { id: offer.id, revision, version: offer.version + 1 }
 }
 need(actor.role === 'owner', 'Only the owner approves prices and sends proposals', 403)
 need(pending, 'No negotiated revision is waiting', 409)
 if (name === 'proposal.approve') {
  need(!pending.approved_by && pending.revision === Number(input.revision), 'Approve the current draft revision', 409)
  await commit(db, actor, [
   db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(offer.id),
   db.prepare('UPDATE p_negotiations SET approved_by=?,approved_at=? WHERE proposal_id=?').bind(actor.email, at, offer.id),
   db.prepare('INSERT INTO p_approvals(id,proposal_id,revision,actor_id,approved_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), offer.id, pending.revision, actor.id, at),
  ], true, guard)
  return { approved: true }
 }
 need(pending.approved_by, 'Approve this revision before sending', 409)
 const next = JSON.parse(pending.snapshot), token = secret(), shareUrl = env.AUTH_ORIGIN + '/p/' + token
 const client = await db.prepare('SELECT email FROM p_clients WHERE id=?').bind(offer.client_id).first<any>()
 await commit(db, actor, [
  db.prepare("UPDATE p_proposals SET title=?,scope=?,terms=?,attachments=?,options=?,deposit_bps=?,revision=?,previous_sent_revision=?,prepared_by=?,approved_by=?,approved_at=?,version=version+1 WHERE id=?").bind(next.title, next.scope, next.terms??'', JSON.stringify(next.attachments??[]), JSON.stringify(next.options), next.deposit_bps, next.revision, offer.revision, pending.prepared_by, pending.approved_by, pending.approved_at, offer.id),
  db.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(offer.id),
  db.prepare('INSERT INTO p_shares(proposal_id,revision,token) VALUES(?,?,?)').bind(offer.id, next.revision, token),
  db.prepare('DELETE FROM p_negotiations WHERE proposal_id=?').bind(offer.id),
  queueMail(env, offer.id, client.email, ...proposalMail(next.title, shareUrl)),
 ], true, guard)
 await dispatchMail(env, offer.id)
 return { shareUrl }
}

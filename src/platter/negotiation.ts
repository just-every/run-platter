import { freezeContentOffer } from './reports/content-performance'
import { recipientInvitations, voidSignatureStatement } from './recipients'
import { assertDiscountDates, discountDeadline } from './discounts'
import { detachChangedLibraryCopies } from './library-links'
import { documentOf } from './documents/blocks'
import { copyCosts, patchCosts } from './internal-pricing'
import { approvalPlan } from './approvals'
import { invitationMail } from './invitation-mail'
import { expirySendStatements, currentTime } from './expiry'
import type { Bindings } from '../auth.server'
import { commit, exact, need, secret, snapshot, type Actor } from './model'
import { dispatchMail } from './mail'

export async function pendingNegotiation(db: D1Database, id: string) {
 return db.prepare('SELECT * FROM p_negotiations WHERE proposal_id=?').bind(id).first<any>()
}
export function negotiatedView(offer: any, pending: any) {
 return pending ? { ...offer,payment_terms:null, ...JSON.parse(pending.snapshot), recipient_plan:offer.recipient_plan, status: pending.approved_by ? 'approved' : 'draft', prepared_by: pending.prepared_by, approved_by: pending.approved_by, approved_at: pending.approved_at, negotiating: true, sentRevision: offer.revision } : offer
}

export async function negotiationCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>, offer: any, fields?: any) {
 const db = env.DB, at = await currentTime(env.DB), pending = await pendingNegotiation(db, offer.id)
 exact(offer, input)
 need(['sent','withdrawn'].includes(offer.status), 'Only an unsigned sent offer can be negotiated', 409)
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
   ...await detachChangedLibraryCopies(db,offer.id,documentOf(fields),fields.options),
   copyCosts(db,offer.id,fields.costSourceRevision??pending?.revision??offer.revision,offer.id,revision),...patchCosts(db,offer.id,revision,fields.internalCosts??[]),
  ], false, guard)
  return { id: offer.id, revision, version: offer.version + 1 }
 }
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
 const approval=await approvalPlan(db,negotiatedView(offer,pending),actor);need(approval.complete, 'Approve this revision before sending', 409)
 guard.sql+=' AND COALESCE((SELECT version FROM p_approval_policy WHERE singleton=1),0)=?';guard.values.push(approval.policyVersion)
 const next = JSON.parse(pending.snapshot);assertDiscountDates(next.options,at)
 guard.sql+=' AND ?>=MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0))';guard.values.push(discountDeadline(next.options),at)
 const invitations=await recipientInvitations(env,actor,input,{...offer,...next,recipient_plan:offer.recipient_plan},at)
 const token = secret(), shareUrl = env.AUTH_ORIGIN + '/p/' + token
 const client = await db.prepare('SELECT COALESCE(s.recipient,c.email) AS email FROM p_clients c LEFT JOIN p_shares s ON s.proposal_id=? WHERE c.id=?').bind(offer.id,offer.client_id).first<any>()
 await commit(db, actor, [
  await freezeContentOffer(db,{...offer,...next}),
  db.prepare("UPDATE p_proposals SET title=?,scope=?,terms=?,attachments=?,options=?,deposit_bps=?,revision=?,previous_sent_revision=?,prepared_by=?,approved_by=?,approved_at=?,version=version+1 WHERE id=?").bind(next.title, next.scope, next.terms??'', JSON.stringify(next.attachments??[]), JSON.stringify(next.options), next.deposit_bps, next.revision, offer.revision, pending.prepared_by, pending.approved_by, pending.approved_at, offer.id),
  db.prepare('UPDATE p_proposals SET section_conditions=?,document=?,payment_terms=? WHERE id=?').bind(JSON.stringify(next.section_conditions??{}),JSON.stringify(documentOf(next)),next.payment_terms?JSON.stringify(next.payment_terms):null,offer.id),
  voidSignatureStatement(db,offer.id,offer.revision,at,'Revision replaced'),
  ...(invitations?invitations.writes:[db.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(offer.id),
  db.prepare('INSERT INTO p_shares(proposal_id,revision,token,recipient) VALUES(?,?,?,?)').bind(offer.id, next.revision, token,client.email),...invitationMail(env,actor,input,{...next,id:offer.id},client.email,shareUrl,at)]),
  db.prepare('DELETE FROM p_negotiations WHERE proposal_id=?').bind(offer.id),
  ...await expirySendStatements(db,offer.id,actor.id,at,true),

 ], true, guard)
 await dispatchMail(env, offer.id)
 return { shareUrl:invitations?.links[0]?.shareUrl??shareUrl,...(invitations?{recipients:invitations.links}:{}) }
}

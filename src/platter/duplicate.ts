import { copyCosts } from './internal-pricing'
import type { Bindings } from '../auth.server'
import { copyAttachments } from './attachments'
import { currentTime } from './expiry'
import { commit, exact, need, proposal, snapshot, text, type Actor } from './model'
import { negotiatedView, pendingNegotiation } from './negotiation'

/** Start an independent draft from the currently displayed proposal content. */
export async function duplicateProposal(env: Bindings, a: Actor, input: Record<string, unknown>) {
 need(['owner','admin','manager','sales','content_editor'].includes(a.role), 'Only an owner or member duplicates proposals', 403)
 const db = env.DB, source = await proposal(db, input.id)
 exact(source, input)
 const displayed = negotiatedView(source, await pendingNegotiation(db, source.id))
 const clientId = input.clientId === undefined ? displayed.client_id : text(input.clientId, 'a client')
 need(await db.prepare('SELECT id FROM p_clients WHERE id=?').bind(clientId).first(), 'Client not found', 404)
 const title = input.title === undefined
  ? text(displayed.title.slice(0, 193) + ' (copy)', 'a title')
  : text(input.title, 'a title')
 const id = crypto.randomUUID(), at = await currentTime(db)
 const attachments = copyAttachments(typeof displayed.attachments === 'string' ? JSON.parse(displayed.attachments) : displayed.attachments)
 const options = typeof displayed.options === 'string' ? JSON.parse(displayed.options) : displayed.options
 const row = { id, client_id: clientId, title, scope: displayed.scope, terms: displayed.terms ?? '', section_conditions: displayed.section_conditions??{},
  revision: 1, deposit_bps: displayed.deposit_bps, options, currency: displayed.currency, attachments }
 await commit(db, a, [
  db.prepare(`INSERT INTO p_proposals(id,client_id,title,scope,terms,version,revision,status,deposit_bps,options,
   prepared_by,created_at,currency,sales_owner_id,sales_owner_name,attachments)
   VALUES(?,?,?,?,?,1,1,'draft',?,?,?,?,?,?,?,?)`)
   .bind(id, clientId, title, row.scope, row.terms, row.deposit_bps, JSON.stringify(options), a.email, at, row.currency, a.id, a.email, JSON.stringify(attachments)),
  copyCosts(db,source.id,displayed.revision,id,1),
  db.prepare('UPDATE p_proposals SET section_conditions=? WHERE id=?').bind(typeof row.section_conditions==='string'?row.section_conditions:JSON.stringify(row.section_conditions),id),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,1,?,?,?,?)')
   .bind(id, JSON.stringify(snapshot(row)), a.email, at, row.currency),
  db.prepare('INSERT INTO p_pdf_settings(proposal_id,enabled) SELECT ?,enabled FROM p_pdf_settings WHERE proposal_id=?')
   .bind(id, source.id),
  db.prepare(`INSERT INTO p_expiry(proposal_id,mode,period_days,expires_on,time_zone,warning_days)
   SELECT ?,mode,period_days,CASE WHEN mode='date' THEN expires_on ELSE NULL END,time_zone,warning_days FROM p_expiry WHERE proposal_id=?`)
   .bind(id, source.id),
 ], false, {
  sql: 'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?) AND EXISTS(SELECT 1 FROM p_clients WHERE id=?)',
  values: [source.id, source.version, clientId],
 })
 return { id, revision: 1, version: 1 }
}

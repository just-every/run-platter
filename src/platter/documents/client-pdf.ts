import { selectionItems, offerSelection } from '../selection'
import type { Bindings } from '../../auth.server'
import { commit, exact, fail, need, proposal, type Actor } from '../model'
import { offerPdf } from './offer-pdf'
import { pdfFonts } from './pdf-fonts'

export async function pdfState(db: D1Database) {
 const [settings, downloads] = await Promise.all([
  db.prepare('SELECT * FROM p_pdf_settings').all<any>(),
  db.prepare('SELECT * FROM p_pdf_downloads ORDER BY downloaded_at,id').all<any>(),
 ])
 return { settings: settings.results, downloads: downloads.results }
}
export const pdfEnabled = async (db: D1Database, id: string) => (await db.prepare('SELECT enabled FROM p_pdf_settings WHERE proposal_id=?').bind(id).first<any>())?.enabled !== 0

export async function pdfCommand(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 need(actor.role === 'owner', 'Only the owner changes client PDF downloads', 403)
 const row = await proposal(env.DB, input.id); exact(row, input)
 need(['draft','approved','sent'].includes(row.status), 'The accepted agreement is permanent', 409)
 need([true, false, 'yes', 'no'].includes(input.enabled as any), 'Choose whether client PDF downloads are allowed')
 const enabled = input.enabled === true || input.enabled === 'yes'
 await commit(env.DB, actor, [env.DB.prepare('INSERT INTO p_pdf_settings(proposal_id,enabled) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET enabled=excluded.enabled').bind(row.id, enabled ? 1 : 0), env.DB.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id)], true, { sql: "EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status<>'accepted')", values: [row.id, row.version] })
 return { id: row.id, enabled }
}

/** The invitation, sent revision and download setting are rechecked atomically after rendering. */
export async function clientPdf(env: Bindings, context: any, optionId: string, input: Record<string,any> = {}) {
 need(context.verified, 'Verify your email before downloading the proposal PDF', 401)
 need(context.row.status === 'sent', 'Unsigned downloads are only available before acceptance', 409)
 need(await pdfEnabled(env.DB, context.row.id), 'Client PDF downloads are disabled for this proposal', 403)
 const items=selectionItems(input),selection=offerSelection(JSON.parse(context.row.options),context.row.deposit_bps,optionId,items)
 const bytes = await offerPdf(context.row, optionId, await pdfFonts(env),items), at = Date.now()
 try {
  await env.DB.batch([
   env.DB.prepare("INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id WHERE s.token=? AND s.session_hash=? AND s.session_expires>? AND s.revision=p.revision AND p.revision=? AND p.status='sent' AND NOT EXISTS(SELECT 1 FROM p_pdf_settings d WHERE d.proposal_id=p.id AND d.enabled=0)))").bind(context.token, context.share.session_hash, at, context.row.revision),
   env.DB.prepare('INSERT INTO p_pdf_downloads(id,proposal_id,revision,option_id,client_id,downloaded_at,selection) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(), context.row.id, context.row.revision, optionId, context.row.client_id, at, JSON.stringify(selection.items)),
   env.DB.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), context.row.client_id, 'client', 'proposal.pdf.download', context.row.id, at),
   env.DB.prepare('DELETE FROM p_guard'),
  ])
 } catch (error) { if (String(error).includes('CHECK constraint')) fail('The offer or PDF download setting changed. Reload before continuing.', 409); throw error }
 return new Response(bytes.buffer as ArrayBuffer, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="proposal-revision-${context.row.revision}.pdf"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } })
}

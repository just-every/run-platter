import type { Bindings } from '../auth.server'
import { currentTime, localDate } from './expiry-time'
import { installationZone } from './reports/report-state'
import { commit, need, text, type Actor } from './model'
import { permitted } from './permissions'

export async function shareOfflineInvoice(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 need(['owner', 'admin'].includes(actor.role), 'Only owner and admins publish invoice remittance instructions', 403)
 const proposal = await permitted(env.DB, actor, input.id)
 need(input.consent === true || input.consent === 'yes', 'Confirm permission to show this invoice to the verified agreement client')
 need(['yes', 'no', true, false].includes(input.enabled as any), 'Choose invoice visibility')
 const enabled = input.enabled === true || input.enabled === 'yes', invoiceId = text(input.invoiceId, 'the retained invoice')
 await commit(env.DB, actor, [env.DB.prepare('INSERT INTO p_offline_invoice_publications(id,invoice_id,enabled,authorized_by,authorized_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), invoiceId, enabled ? 1 : 0, actor.id, Date.now()), env.DB.prepare(enabled ? 'INSERT INTO p_offline_invoice_visibility(invoice_id) VALUES(?) ON CONFLICT DO NOTHING' : 'DELETE FROM p_offline_invoice_visibility WHERE invoice_id=?').bind(invoiceId)], false, { sql: "EXISTS(SELECT 1 FROM p_offline_invoices i JOIN p_acceptances a ON a.proposal_id=i.proposal_id JOIN p_proposals p ON p.id=i.proposal_id WHERE i.id=? AND i.proposal_id=? AND i.revision=p.revision AND a.revision=i.revision AND p.status='accepted')", values: [invoiceId, proposal.id] })
 return { id: invoiceId, proposalId: proposal.id, visible: enabled }
}
export async function clientOfflineInvoices(env: Bindings, context: any) {
 need(context.verified, 'Verify your mailbox before reading invoices', 401)
 const at = await currentTime(env.DB), today = localDate(at, await installationZone(env.DB))
 const invoices = (await env.DB.prepare("SELECT i.document_number,i.currency,i.total_cents,i.balance_cents,i.due_on,i.remittance,i.invoice_json FROM p_offline_invoices i JOIN p_offline_invoice_visibility v ON v.invoice_id=i.id JOIN p_proposals p ON p.id=i.proposal_id JOIN p_acceptances a ON a.proposal_id=p.id JOIN p_shares s ON s.proposal_id=p.id WHERE p.id=? AND p.status='accepted' AND p.revision=i.revision AND a.revision=i.revision AND s.token=? AND s.revision=i.revision AND s.session_hash=? AND s.session_expires>? AND COALESCE(p.recipient_plan,'[]')='[]' ORDER BY i.due_on,i.id").bind(context.row.id, context.token, context.share.session_hash, at).all<any>()).results
 return invoices.map(i => ({ number: i.document_number, currency: i.currency, totalCents: i.total_cents, balanceCents: i.balance_cents, issuedOn: JSON.parse(i.invoice_json).TxnDate ?? null, dueOn: i.due_on, remittance: i.remittance, status: i.balance_cents === 0 ? 'paid' : i.due_on < today ? 'overdue' : 'due' }))
}

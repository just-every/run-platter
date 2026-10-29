import { discountDeadline } from './discounts'
import { collectionPolicy } from './collection-policy'
import { handoffCompletion } from './handoff/jobs'
import { currentTime } from './expiry-time'
import { prepareAttachment } from './attachments'
import { acceptanceTerms } from './signing'
import { commit, exact, need, text, type Actor } from './model'

// SIGN-008: a client signed in its own system; the owner records and attests to that copy.
export const paperConsent = "Owner attests this upload is the client's signed copy of the sent revision. Platter did not verify the signature."

/** A calendar date as written on the paper. It may not be later than today anywhere (UTC+14). */
export function signedOn(value: unknown, at: number) {
 const v = text(value, 'the signed date', 10)
 const day = new Date(v + 'T00:00:00Z')
 need(/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === v, 'Enter the signed date as YYYY-MM-DD')
 need(v <= new Date(at + 14 * 3600000).toISOString().slice(0, 10), 'The signed date cannot be in the future')
 return v
}

export async function paperAcceptance(db: D1Database, a: Actor, form: FormData) {
 need(a.role === 'owner', 'Only the owner records acceptance signed outside Platter', 403)
 const id = text(form.get('id'), 'a proposal')
 const row = await db.prepare('SELECT p.*,c.name AS clientName,COALESCE(s.recipient,c.email) AS clientEmail FROM p_proposals p JOIN p_clients c ON c.id=p.client_id LEFT JOIN p_shares s ON s.proposal_id=p.id WHERE p.id=?').bind(id).first<any>()
 need(row, 'Proposal not found', 404); exact(row, { version: form.get('version') })
 need(row.recipient_plan==='[]','Record each required signature through its personal invitation',409)
 need(row.status === 'sent' && row.approved_by, 'Record a client-signed copy only for a sent proposal', 409)
 need(form.get('attest') === 'yes', "Confirm that the file is the client's signed copy of this revision")
 const file = form.get('file')
 need(file instanceof File && file.size > 0, 'Choose the client-signed file')
 need(file.size <= 10 * 1024 * 1024, 'The signed copy must be 10 MB or smaller', 413)
 const at = await currentTime(db), signer = text(form.get('signer'), "the signer's full name", 200), date = signedOn(form.get('signedOn'), at)
 const { option, deposit, frozen } = acceptanceTerms(row, form.get('optionId'), Object.fromEntries(form),at)
 const policy=await collectionPolicy(db,row.id)
 if(policy.enabled)Object.assign(frozen,{collectionPolicy:policy})
 const prepared = await prepareAttachment(db, { filename: file.name, mediaType: file.type, bytes: await file.arrayBuffer() })
 await commit(db, a, [
  ...prepared.writes,
  db.prepare('INSERT INTO p_acceptances(proposal_id,revision,snapshot,name,email,option_id,total_cents,deposit_cents,accepted_at,consent,currency) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(row.id, row.revision, JSON.stringify(frozen), signer, row.clientEmail, option.id, option.cents, deposit, at, paperConsent, frozen.currency),
  db.prepare('INSERT INTO p_paper_acceptances(proposal_id,file_id,signed_on,attested_by,attested_at) VALUES(?,?,?,?,?)').bind(row.id, prepared.attachment.id, date, a.email, at),
  db.prepare("UPDATE p_proposals SET status='accepted',version=version+1 WHERE id=?").bind(row.id),
  db.prepare('DELETE FROM p_negotiations WHERE proposal_id=?').bind(row.id),
  ...handoffCompletion(db,row.id),
 ], true, { sql: "EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND revision=? AND status='sent' AND approved_by IS NOT NULL) AND ?>=MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0))", values: [row.id, row.version, row.revision,discountDeadline([option]),at] })
 return { id: row.id }
}

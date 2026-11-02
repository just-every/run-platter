import type { Bindings } from '../auth.server'
import { createPortability } from '@runeditrun/rer/modules/portability'
import archivePolicy from './archive-policy.mjs'
import { commit, hash, need, text, type Actor } from './model'
import { currentTime } from './expiry-time'
import { canonical } from './crm/hubspot-draft'

type Rows = Record<string, any>[]
type Selection = { sql: string; values: any[] }
type Table = { name: string; columns: string[]; foreign: any[]; selection?: Selection; rows: Rows }
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
const outbound = new Set(['p_shares','p_reminder_authority','p_sender_notice_authority','p_completion_authority','p_archive_job_authority','p_crm_outcome_authority','p_crm_sync_reviews','p_mail','p_notification_outbox','p_sms_authority','p_sms_completion_authority','p_tracking_challenges','p_tracking_stakeholders','p_views','p_tracking_alerts','p_mail_reply_keys','p_replaced_links','p_watchers','p_approval_requests','p_collaboration_events','p_webhook_events'])

/** Inventory only recorded native relationships. Never search a provider or infer an identity. */
async function inventory(db: D1Database, clientId: string) {
 const client = await db.prepare('SELECT * FROM p_clients WHERE id=?').bind(clientId).first<any>()
 need(client, 'Client not found', 404)
 need(!await db.prepare('SELECT 1 FROM p_erased_clients WHERE client_id=?').bind(clientId).first(), 'This contact already has an erasure receipt', 409)
 const proposals = (await db.prepare('SELECT * FROM p_proposals WHERE client_id=? ORDER BY id').bind(clientId).all<any>()).results
 need(!await db.prepare('SELECT 1 FROM p_import_client_revisions WHERE client_id=?').bind(clientId).first(), 'Imported originals and journals require a separate reviewed erasure; nothing was changed', 409)
 need(!await db.prepare('SELECT 1 FROM p_imported_document_links l JOIN p_proposals p ON p.id=l.proposal_id WHERE p.client_id=?').bind(clientId).first(), 'Imported document custody requires a separate reviewed erasure; nothing was changed', 409)
 need(!await db.prepare('SELECT 1 FROM p_privacy_holds WHERE client_id=?').bind(clientId).first(), 'A retention or legal hold prevents erasure', 409)
 need(!await db.prepare('SELECT 1 FROM p_tracking_holds h JOIN p_proposals p ON p.id=h.proposal_id WHERE p.client_id=?').bind(clientId).first(), 'An engagement hold prevents contact erasure', 409)
 const accepted = (await db.prepare('SELECT a.* FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id WHERE p.client_id=? ORDER BY a.proposal_id').bind(clientId).all<any>()).results
 const retainedIds = new Set(accepted.map(r => r.proposal_id)), drafts = proposals.filter(p => !retainedIds.has(p.id))
 need(drafts.every(p => !JSON.parse(p.recipient_plan ?? '[]').length), 'Configured recipients require separate reviewed erasure; nothing was changed', 409)
 for (const table of ['p_payment_records','p_collection_intents','p_recipient_signatures']) {
  need(!await db.prepare(`SELECT 1 FROM ${table} WHERE proposal_id IN (SELECT value FROM json_each(?)) LIMIT 1`).bind(JSON.stringify(drafts.map(p => p.id))).first(), 'Payment or partial-signature custody requires separate reviewed erasure; nothing was changed', 409)
 }
 const all = JSON.stringify(proposals.map(p => p.id)), unretained = JSON.stringify(drafts.map(p => p.id))
 const names = (await db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name GLOB 'p_*' ORDER BY name").all<{name:string}>()).results
 const tables: Table[] = []
 for (const { name } of names) {
  const columns = (await db.prepare(`PRAGMA table_info(${quote(name)})`).all<any>()).results.map(c => c.name)
  const foreign = (await db.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all<any>()).results
  const selection = name === 'p_proposals' ? { sql: 'id IN (SELECT value FROM json_each(?))', values: [unretained] } : columns.includes('proposal_id') && !name.startsWith('p_privacy_') ? { sql: 'proposal_id IN (SELECT value FROM json_each(?))', values: [outbound.has(name) ? all : unretained] } : undefined
  tables.push({ name, columns, foreign, selection, rows: [] })
 }
 // Delete only files actually referenced by these drafts. A shared original stays with
 // the retained record that still owns it; never infer file ownership from a filename.
 const draftFiles = (await db.prepare(`SELECT DISTINCT f.id FROM p_attachment_files f WHERE f.id IN (
  SELECT j.value FROM p_revisions r,json_tree(r.snapshot) j WHERE r.proposal_id IN (SELECT value FROM json_each(?)) AND j.type='text'
  UNION SELECT file_id FROM p_document_media WHERE proposal_id IN (SELECT value FROM json_each(?))
  UNION SELECT j.value FROM p_negotiations n,json_tree(n.snapshot) j WHERE n.proposal_id IN (SELECT value FROM json_each(?)) AND j.type='text'
 ) ORDER BY f.id`).bind(unretained,unretained,unretained).all<{id:string}>()).results.map(r=>r.id)
 const keepFiles = `NOT EXISTS(SELECT 1 FROM p_vendor_documents k WHERE k.file_id=p_attachment_files.id)
 AND NOT EXISTS(SELECT 1 FROM p_template_document_media k WHERE k.file_id=p_attachment_files.id)
 AND NOT EXISTS(SELECT 1 FROM p_library_media k WHERE k.file_id=p_attachment_files.id)
 AND NOT EXISTS(SELECT 1 FROM p_paper_acceptances k WHERE k.file_id=p_attachment_files.id)
 AND NOT EXISTS(SELECT 1 FROM p_personal_templates k,json_tree(k.snapshot) j WHERE j.value=p_attachment_files.id)
 AND NOT EXISTS(SELECT 1 FROM p_imported_documents k,json_tree(k.data_json) j WHERE j.value=p_attachment_files.id)
 AND NOT EXISTS(SELECT 1 FROM p_imported_library k,json_tree(k.document) j WHERE j.value=p_attachment_files.id)
 AND NOT EXISTS(SELECT 1 FROM p_revisions k,json_tree(k.snapshot) j WHERE k.proposal_id NOT IN (SELECT value FROM json_each(?)) AND j.value=p_attachment_files.id)
 AND NOT EXISTS(SELECT 1 FROM p_document_media k WHERE k.proposal_id NOT IN (SELECT value FROM json_each(?)) AND k.file_id=p_attachment_files.id)`
 tables.find(t=>t.name==='p_attachment_files')!.selection={sql:'id IN (SELECT value FROM json_each(?)) AND '+keepFiles,values:[JSON.stringify(draftFiles),unretained,unretained]}
 // Expand child records through their declared foreign keys, including composite keys.
 // Work from parents to children once the parent's selection is final.
 const ordered: Table[] = [], visiting = new Set<string>()
 function visit(table: Table) {
  if (ordered.includes(table)) return
  need(!visiting.has(table.name), 'Cyclic native custody requires a separate erasure review', 409)
  visiting.add(table.name)
  for (const name of new Set(table.foreign.map(f => f.table))) { const parent = tables.find(t => t.name === name); if (parent) visit(parent) }
  visiting.delete(table.name); ordered.push(table)
 }
 for (const table of tables) visit(table)
 for (const table of ordered) {
  const extra: Selection[] = []
  for (const id of new Set(table.foreign.map(f => f.id))) {
   const fk = table.foreign.filter(f => f.id === id).sort((a,b) => a.seq-b.seq), parent = tables.find(t => t.name === fk[0].table)
   if (!parent?.selection) continue
   extra.push({sql:`(${fk.map(f => quote(f.from)).join(',')}) IN (SELECT ${fk.map(f => quote(f.to)).join(',')} FROM ${quote(parent.name)} WHERE ${parent.selection.sql})`,values:parent.selection.values})
  }
  const predicates = [...(table.selection ? [table.selection] : []), ...extra]
  if (predicates.length) table.selection = { sql: predicates.map(p => '(' + p.sql + ')').join(' OR '), values: predicates.flatMap(p => p.values) }
 }
 // Reviews can contain copied contact details before a proposal even exists.
 const reviews = tables.find(t => t.name === 'p_crm_draft_reviews')!
 reviews.selection = {sql:"json_extract(client_json,'$.id')=? OR json_extract(source_json,'$.contact.email')=? OR applied_proposal_id IN (SELECT value FROM json_each(?))",values:[clientId,client.email,all]}
 for (const table of ordered) if (table.selection) table.rows = (await db.prepare(`SELECT * FROM ${quote(table.name)} WHERE ${table.selection.sql} ORDER BY rowid`).bind(...table.selection.values).all<any>()).results
 const sources = (await db.prepare('SELECT s.* FROM p_crm_draft_sources s JOIN p_proposals p ON p.id=s.proposal_id WHERE p.client_id=? ORDER BY s.proposal_id').bind(clientId).all<any>()).results
 const remote = [...new Map(sources.map(s => [s.account_id + ':' + s.contact_id, {provider:s.provider,accountId:s.account_id,kind:'contact',recordId:s.contact_id,action:'Review and erase this exact contact in HubSpot, subject to provider retention and legal holds. Platter made no provider deletion request.'}])).values()]
 const files = (await db.prepare('SELECT f.*,j.account_id FROM p_archive_files f JOIN p_archive_jobs j ON j.proposal_id=f.proposal_id WHERE j.client_id=? ORDER BY f.proposal_id,f.kind').bind(clientId).all<any>()).results
 const retained = await Promise.all(accepted.map(async a => ({proposalId:a.proposal_id,revision:a.revision,snapshotSha256:await hash(a.snapshot),exception:'Retained agreement and its original files are business records; contact details in these immutable records are retained.'})))
 const plan = {client,proposals,sources,files,accepted,tables:ordered.filter(t => t.selection).map(t => ({name:t.name,rows:t.rows}))}
 return {client,proposals,drafts,accepted,retained,remote,files,ordered,digest:await hash(canonical(plan))}
}

function unchanged(db: D1Database, table: Table) {
 const {sql,values} = table.selection!, projection=table.columns.map(quote).join(','), expected=table.columns.map(c=>`json_extract(value,'$.${c}')`).join(',')
 return db.prepare(`INSERT INTO p_guard(ok) VALUES((SELECT COUNT(*) FROM ${quote(table.name)} WHERE ${sql})=? AND NOT EXISTS(SELECT ${projection} FROM ${quote(table.name)} WHERE ${sql} EXCEPT SELECT ${expected} FROM json_each(?)))`).bind(...values,table.rows.length,...values,JSON.stringify(table.rows))
}
export async function privacyCommand(env: Bindings, actor: Actor, name: string, input: Record<string,unknown>) {
 need(actor.role === 'owner', 'Only the owner reviews or erases personal data', 403)
 const db=env.DB, clientId=text(input.id,'a client'), at=await currentTime(db)
 if (name === 'privacy.hold') {
  need(['retention','legal'].includes(String(input.kind)), 'Choose a retention or legal hold')
  need(['yes','no'].includes(String(input.held)), 'Choose whether to hold this contact')
  need(await db.prepare('SELECT 1 FROM p_clients WHERE id=?').bind(clientId).first(), 'Client not found',404)
  await commit(db,actor,[input.held==='yes'?db.prepare('INSERT INTO p_privacy_holds VALUES(?,?,?,?,?) ON CONFLICT(client_id,kind) DO UPDATE SET reason=excluded.reason,held_by=excluded.held_by,held_at=excluded.held_at').bind(clientId,input.kind,text(input.reason,'a hold reason',500),actor.id,at):db.prepare('DELETE FROM p_privacy_holds WHERE client_id=? AND kind=?').bind(clientId,input.kind)])
  return {id:clientId}
 }
 const plan=await inventory(db,clientId)
 if (name === 'privacy.review') {
  await createPortability({db,policy:archivePolicy})
  const reviewId=crypto.randomUUID()
  await commit(db,actor,[db.prepare('INSERT INTO p_privacy_reviews VALUES(?,?,?,?,?)').bind(reviewId,clientId,actor.id,plan.digest,at)])
  return {id:clientId,privacyReview:{reviewId,digest:plan.digest,clientName:plan.client.name,eraseProposalIds:plan.drafts.map(p=>p.id),retained:plan.retained,externalRecords:plan.remote,removed:plan.ordered.filter(t=>t.selection&&t.rows.length).map(t=>({table:t.name,count:t.rows.length}))}}
 }
 need(name==='privacy.erase','Unknown privacy action',404)
 need(input.confirmName===plan.client.name && input.consent==='yes','Confirm the exact client name and reviewed erasure')
 const review=await db.prepare('SELECT * FROM p_privacy_reviews WHERE id=? AND client_id=? AND actor_id=?').bind(text(input.reviewId,'the erasure review'),clientId,actor.id).first<any>()
 need(review && review.created_at>at-900000 && review.digest===input.digest && review.digest===plan.digest,'The erasure inventory changed or review expired. Review again.',409)
 const id=crypto.randomUUID(), receipt={id,clientId,operatorId:actor.id,erasedAt:at,erasedProposalIds:plan.drafts.map(p=>p.id),retained:plan.retained,externalRecords:plan.remote,fileStoreRecords:plan.files.map(f=>({provider:'google-drive',accountId:f.account_id,recordId:f.provider_id,folderId:f.folder_id,sha256:f.sha256,action:'Review the exact stored business record and its retention exception before any operator erasure; Platter made no provider deletion request.'})),removed:plan.ordered.filter(t=>t.selection&&t.rows.length).map(t=>({table:t.name,count:t.rows.length}))}
 const portability=await createPortability({db,policy:archivePolicy})
 await commit(db,actor,[
  db.prepare('INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_clients WHERE id=? AND version=? AND name=? AND email=? AND variable_fields=?))').bind(clientId,plan.client.version,plan.client.name,plan.client.email,plan.client.variable_fields),
  db.prepare('INSERT INTO p_guard(ok) VALUES(NOT EXISTS(SELECT 1 FROM p_import_client_revisions WHERE client_id=?) AND NOT EXISTS(SELECT 1 FROM p_imported_document_links l JOIN p_proposals p ON p.id=l.proposal_id WHERE p.client_id=?))').bind(clientId,clientId),
  db.prepare('INSERT INTO p_guard(ok) VALUES(NOT EXISTS(SELECT 1 FROM p_privacy_holds WHERE client_id=?) AND NOT EXISTS(SELECT 1 FROM p_tracking_holds h JOIN p_proposals p ON p.id=h.proposal_id WHERE p.client_id=?) AND EXISTS(SELECT 1 FROM p_privacy_reviews WHERE id=? AND digest=?))').bind(clientId,clientId,review.id,review.digest),
  unchanged(db,{...plan.ordered.find(t=>t.name==='p_proposals')!,selection:{sql:'client_id=?',values:[clientId]},rows:plan.proposals}),
  ...plan.ordered.filter(t=>t.selection).map(t=>unchanged(db,t)),
  ...await portability.redactionStatements(),...await portability.invalidateTransfersStatements(),
  ...plan.ordered.filter(t=>t.selection).reverse().map(t=>db.prepare(`DELETE FROM ${quote(t.name)} WHERE ${t.selection!.sql}`).bind(...t.selection!.values)),
  db.prepare("UPDATE p_sms_runs SET status='cancelled',message='Contact erased' WHERE proposal_id IN (SELECT id FROM p_proposals WHERE client_id=?) AND status IN ('queued','sending','held')").bind(clientId),
  db.prepare("UPDATE p_archive_jobs SET status='held',reason='Contact erased; execution cancelled' WHERE client_id=? AND status!='complete'").bind(clientId),
  db.prepare('DELETE FROM p_privacy_reviews WHERE client_id=?').bind(clientId),
  db.prepare("UPDATE p_clients SET name='Erased contact',email=?,variable_fields='{}',version=version+1 WHERE id=?").bind(clientId+'@erased.invalid',clientId),
  db.prepare('INSERT INTO p_privacy_receipts VALUES(?,?,?,?,?)').bind(id,clientId,actor.id,at,JSON.stringify(receipt)),
  db.prepare('INSERT INTO p_erased_clients VALUES(?,?)').bind(clientId,id),
 ])
 return {id:clientId,receipt}
}
export async function privacyState(db:D1Database,actor:Actor) {
 if(actor.role!=='owner')return undefined
 return {holds:(await db.prepare('SELECT * FROM p_privacy_holds ORDER BY held_at,client_id').all<any>()).results,receipts:(await db.prepare('SELECT receipt_json FROM p_privacy_receipts ORDER BY erased_at,id').all<any>()).results.map(r=>JSON.parse(r.receipt_json)),erasedClientIds:(await db.prepare('SELECT client_id FROM p_erased_clients').all<any>()).results.map(r=>r.client_id)}
}

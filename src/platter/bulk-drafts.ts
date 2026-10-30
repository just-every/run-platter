import type { Bindings } from '../auth.server'
import { commit, dollars, hash, need, snapshot, text, type Actor } from './model'
import { currentTime } from './expiry-time'
import { templateDraftPlan } from './templates'
import { parse } from './movein/csv'
import { missingMerge, templateVariableNames } from './variables'
import { canonical } from './crm/hubspot-draft'

type Guard = { sql: string; values: any[] }
const owner = (a: Actor) => need(a.role === 'owner', 'Only the owner reviews and creates bulk drafts', 403)
const consent = (value: unknown) => value === true || value === 'yes'
function guardWrites(db:D1Database, guards:Guard[]) {
 return guards.map(g => db.prepare('INSERT INTO p_guard(ok) VALUES((' + g.sql + '))').bind(...g.values))
}
async function ownerVersion(db: D1Database, a: Actor) {
 const row = await db.prepare("SELECT version FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(a.id).first<any>()
 need(row, 'Current owner authority is required', 403)
 return row.version as number
}
// Capture every mutable source copied by a template start. Exact table guards
// close the read to commit window, including changes to inherited defaults.
async function sourceState(db: D1Database, id: string) {
 const selectors = [
  ['p_personal_templates', 'id=?', [id]],
  ['p_template_defaults', 'template_id=?', [id]],
  ['p_template_reminder_messages', 'template_id=?', [id]],
  ['p_template_locks', 'template_id=?', [id]],
  ['p_template_block_locks', 'template_id=?', [id]],
  ['p_template_document_media', 'template_id=?', [id]],
  ['p_template_costs', 'template_id=?', [id]],
  ['p_workspace_defaults', '1', []],
  ['p_installation_settings', '1', []],
  ['p_reminder_templates', '1', []],
 ] as const
 const captured: any[] = [], guards: Guard[] = []
 for (const [table, where, values] of selectors) {
  const rows = (await db.prepare('SELECT * FROM ' + table + ' WHERE ' + where + ' ORDER BY 1,2').bind(...values).all<any>()).results
  captured.push({ table, rows })
  guards.push({ sql: '(SELECT COUNT(*) FROM ' + table + ' WHERE ' + where + ')=?', values: [...values, rows.length] })
  for (const row of rows) guards.push({ sql: 'EXISTS(SELECT 1 FROM ' + table + ' WHERE ' + Object.keys(row).map(k => k + ' IS ?').join(' AND ') + ')', values: Object.values(row) })
 }
 return { json: canonical(captured), guards, template: captured[0].rows[0] }
}
function csvRows(value: unknown, template: any) {
 need(typeof value === 'string' && new TextEncoder().encode(value).length <= 60000 && !value.includes('\0'), 'Use a CSV of at most 60,000 UTF-8 bytes')
 const records = parse(value.replace(/^\uFEFF/, ''))
 need(records.length >= 2 && records.length <= 101, 'Review between 1 and 100 rows')
 const columns = records[0].cells
 need(columns[0] === 'client' && new Set(columns).size === columns.length, 'Start with a client column and distinct column names')
 const content = JSON.parse(template.snapshot)
 need(content.currency === 'USD' && !(content.recipient_plan ?? []).length && !content.payment_terms, 'Bulk drafts currently require an ordinary USD single-client template without a payment schedule', 409)
 need(content.options.every((o: any) => !(o.tables ?? []).length && !(o.optionalItems ?? []).length && !o.discount && !o.tax && !o.taxable && !o.taxCode), 'Use flat untaxed packages without optional items or discounts for bulk drafts', 409)
 const variables = templateVariableNames(content)
 const allowed = ['client', ...variables.map(k => 'var:' + k), ...content.options.map((o: any) => 'price:' + o.id)]
 need(columns.every(k => allowed.includes(k)) && allowed.every(k => columns.includes(k)), 'Use these CSV columns: ' + allowed.join(', '))
 return records.slice(1).map(({ cells, line }, index) => {
  need(cells.length === columns.length, 'CSV row at line ' + line + ' has the wrong number of cells')
  need(cells.every(cell => cell.length <= 10000), 'CSV values must be at most 10,000 characters')
  return { ordinal: index + 1, line, fields: Object.fromEntries(columns.map((key, i) => [key, cells[i]])), variables }
 })
}
function rowPlan(env: Bindings, a: Actor, batch: any, row: any) {
 const input = JSON.parse(row.input_json), values = Object.fromEntries(Object.entries(input).filter(([k]) => k.startsWith('var:')).map(([k, v]) => [k.slice(4), String(v)]))
 return templateDraftPlan(env, a, { id: batch.template_id, version: batch.template_version, clientId: row.client_id }, {
  id: row.row_id, values, content: async content => ({ ...content, options: content.options.map((o: any) => ({ ...o, cents: dollars(input['price:' + o.id]) })) }),
 })
}
function contentOf(plan: Awaited<ReturnType<typeof templateDraftPlan>>) {
 need(!plan.templateLocks.includes('pricing'), 'Unlock template pricing before entering per-client prices', 409)
 need(!missingMerge(plan.row).length, 'Fill every template variable before creating drafts', 409)
 return canonical({ snapshot: snapshot(plan.row), delivery: plan.resolved, pdf: plan.template.pdf_enabled, locks: plan.templateLocks.toSorted() })
}
async function batchFor(db: D1Database, a: Actor, id: unknown) {
 owner(a)
 const row = await db.prepare('SELECT * FROM p_bulk_batches WHERE id=? AND actor_id=? AND erased_at IS NULL').bind(text(id, 'a batch'), a.id).first<any>()
 need(row, 'Bulk draft batch not found', 404)
 return row
}
export async function bulkDraftState(db: D1Database, a: Actor, id?: unknown) {
 owner(a)
 if (!id) return { batches: (await db.prepare('SELECT id,template_id,template_version,created_at FROM p_bulk_batches WHERE actor_id=? AND erased_at IS NULL ORDER BY created_at DESC,id').bind(a.id).all<any>()).results }
 const batch = await batchFor(db, a, id), version = await ownerVersion(db, a)
 const authority = await db.prepare('SELECT 1 FROM p_bulk_authority WHERE batch_id=? AND actor_id=? AND actor_version=? AND reviewed_digest=?').bind(batch.id, a.id, version, batch.digest).first()
 const rows = (await db.prepare('SELECT * FROM p_bulk_rows WHERE batch_id=? ORDER BY ordinal').bind(batch.id).all<any>()).results
 const view = rows.map(row => ({ ordinal: row.ordinal, rowId: row.row_id, clientId: row.client_id, client: row.client_json ? JSON.parse(row.client_json).name : JSON.parse(row.input_json).client, exception: row.exception, proposalId: row.proposal_id, content: row.content_json ? JSON.parse(row.content_json) : null }))
 return { id: batch.id, digest: batch.digest, csvHash: batch.csv_hash, csv: batch.csv, templateId: batch.template_id, templateVersion: batch.template_version, active: Boolean(authority), rows: view, sample: view.find(row => row.content), held: view.filter(row => row.exception).length, completed: view.filter(row => row.proposalId).length, eligible: view.filter(row => !row.exception).length }
}
export async function bulkDraftCommand(env: Bindings, a: Actor, name: string, input: Record<string, unknown>) {
 owner(a)
 const db = env.DB, at = await currentTime(db), version = await ownerVersion(db, a)
 if (name === 'bulk.inspect') return bulkDraftState(db, a, input.id)
 if (name === 'bulk.preview') {
  const requestId = text(input.requestId, 'a review request identity', 100)
  const previous = await db.prepare('SELECT * FROM p_bulk_batches WHERE actor_id=? AND request_id=?').bind(a.id, requestId).first<any>()
  if (previous) {
   need(previous.erased_at === null, 'This bulk review was erased and cannot be replayed', 409)
   need(previous.csv === input.csv && previous.template_id === input.templateId && previous.template_version === Number(input.templateVersion), 'This request already reviewed different bytes', 409)
   return bulkDraftState(db, a, previous.id)
  }
  const templateId = text(input.templateId, 'a personal template'), source = await sourceState(db, templateId)
  need(source.template && source.template.version === Number(input.templateVersion), 'Template changed; select its current version', 409)
  need(source.template.owner_id === a.id || source.template.shared === 1, 'This template is unavailable', 403)
  const records = csvRows(input.csv, source.template), id = crypto.randomUUID(), csv = input.csv as string, csvHash = await hash(csv)
  const batch = { template_id: templateId, template_version: source.template.version }, rows: any[] = [], bindings = new Set<string>()
  const clients = (await db.prepare('SELECT * FROM p_clients ORDER BY id').all<any>()).results
  const guards: Guard[] = [...source.guards, { sql: "EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=? AND role='owner' AND status='active')", values: [a.id, version] }]
  for (const record of records) {
   const selector = record.fields.client.trim(), matches = clients.filter(c => c.id === selector || c.name === selector)
   for(const match of matches)bindings.add(match.id)
   const client = matches.length === 1 ? matches[0] : null, rowId = await hash(id + ':' + record.ordinal)
   let exception: string | null = !client ? matches.length ? 'Ambiguous client binding: ' + selector : 'Missing client binding: ' + selector : null
   const missing = record.variables.filter(key => !record.fields['var:' + key].trim())
   if (missing.length) exception = [exception, 'Missing variable: ' + missing.join(', ')].filter(Boolean).join('; ')
   for (const [key, value] of Object.entries(record.fields).filter(([key]) => key.startsWith('price:'))) {
    try { dollars(value) } catch { exception = [exception, 'Invalid price: ' + key.slice(6)].filter(Boolean).join('; ') }
   }
   const row = { ordinal: record.ordinal, row_id: rowId, client_id: client?.id ?? null, client_json: client ? canonical(client) : null, input_json: canonical(record.fields), exception, content_json: null as string | null }
   if (!exception) {
    const plan = await rowPlan(env, a, batch, row)
    row.content_json = contentOf(plan)
    guards.push(plan.guard)
   }
   rows.push(row)
  }
  // Bind the review to the exact set of existing client matches, even for held rows.
  guards.push({ sql: '(SELECT COUNT(*) FROM p_clients)=?', values: [clients.length] })
  for (const client of clients) guards.push({ sql: 'EXISTS(SELECT 1 FROM p_clients WHERE id=? AND name=? AND email=? AND variable_fields=? AND version=?)', values: [client.id, client.name, client.email, client.variable_fields, client.version] })
  const digest = await hash(canonical({ csvHash, source: source.json, rows, actor: a.id, version }))
  await commit(db, a, [
   ...guardWrites(db,guards),
   db.prepare('INSERT INTO p_bulk_batches(id,actor_id,request_id,template_id,template_version,csv,csv_hash,digest,source_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id, a.id, requestId, templateId, source.template.version, csv, csvHash, digest, source.json, at),
   ...[...bindings].map(clientId=>db.prepare('INSERT INTO p_bulk_bindings(batch_id,client_id) VALUES(?,?)').bind(id,clientId)),
   ...rows.map(row => db.prepare('INSERT INTO p_bulk_rows(batch_id,ordinal,row_id,client_id,input_json,client_json,content_json,exception) VALUES(?,?,?,?,?,?,?,?)').bind(id, row.ordinal, row.row_id, row.client_id, row.input_json, row.client_json, row.content_json, row.exception)),
   db.prepare('INSERT INTO p_bulk_authority(batch_id,actor_id,actor_version,reviewed_digest) VALUES(?,?,?,?)').bind(id, a.id, version, digest),
  ], true)
  return bulkDraftState(db, a, id)
 }
 need(name === 'bulk.apply', 'Unknown bulk draft action', 404)
 need(consent(input.consent), 'Review the sample and exceptions and explicitly confirm draft creation')
 const batch = await batchFor(db, a, input.id)
 need(input.digest === batch.digest && input.csv === batch.csv && Number(input.templateVersion) === batch.template_version, 'Reviewed CSV bytes or template version changed; preview again', 409)
 const grant = await db.prepare('SELECT 1 FROM p_bulk_authority WHERE batch_id=? AND actor_id=? AND actor_version=? AND reviewed_digest=?').bind(batch.id, a.id, version, batch.digest).first()
 need(grant, 'This review has no current authority. Restored batches remain inactive.', 409)
 const source = await sourceState(db, batch.template_id)
 need(source.json === batch.source_json, 'Template or delivery defaults changed after review; preview again', 409)
 const pending = (await db.prepare('SELECT * FROM p_bulk_rows WHERE batch_id=? AND exception IS NULL AND proposal_id IS NULL ORDER BY ordinal').bind(batch.id).all<any>()).results
 const clients = new Map<string,any>()
 for (const row of pending) {
  const fresh = await db.prepare('SELECT * FROM p_clients WHERE id=?').bind(row.client_id).first<any>()
  need(fresh && canonical(fresh) === row.client_json, 'A reviewed client changed; preview again', 409)
  clients.set(row.row_id,fresh)
 }
 const rows=pending.slice(0,5),writes:D1PreparedStatement[]=[],guards:Guard[]=[...source.guards,
  { sql: 'EXISTS(SELECT 1 FROM p_bulk_authority g JOIN oa_operators o ON o.id=g.actor_id WHERE g.batch_id=? AND g.actor_id=? AND g.actor_version=? AND g.reviewed_digest=? AND o.version=g.actor_version AND o.status=? AND o.role=?)', values: [batch.id, a.id, version, batch.digest, 'active', 'owner'] },
 ]
 // A bounded chunk is atomic, including every completion marker. Replays
 // either see those rows completed or lose the guard and create nothing.
 for (const row of rows) {
  const fresh=clients.get(row.row_id),plan=await rowPlan(env,a,batch,row)
  need(contentOf(plan)===row.content_json,'Reviewed draft content changed; preview again',409)
  guards.push(plan.guard,
   { sql: 'EXISTS(SELECT 1 FROM p_clients WHERE id=? AND name=? AND email=? AND variable_fields=? AND version=?)', values: [fresh.id, fresh.name, fresh.email, fresh.variable_fields, fresh.version] },
   { sql: 'EXISTS(SELECT 1 FROM p_bulk_rows WHERE batch_id=? AND row_id=? AND proposal_id IS NULL AND content_json=?)', values: [batch.id, row.row_id, row.content_json] },
  )
  writes.push(...plan.writes,db.prepare('UPDATE p_bulk_rows SET proposal_id=?,completed_at=? WHERE batch_id=? AND row_id=?').bind(plan.id,at,batch.id,row.row_id))
 }
 try { await commit(db,a,[...guardWrites(db,guards),...writes],true) }
 catch(error) {
  const completed=(await db.prepare('SELECT row_id FROM p_bulk_rows WHERE batch_id=? AND proposal_id IS NOT NULL').bind(batch.id).all<any>()).results
  if((error as any).status!==409||!rows.length||!rows.every(row=>completed.some(done=>done.row_id===row.row_id)))throw error
 }
 return bulkDraftState(db, a, batch.id)
}

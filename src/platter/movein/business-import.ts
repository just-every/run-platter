import {
  planD1Import, createD1ImportJob, applyD1ImportBatches, undoD1Import,
  readD1ImportJob, readD1ImportOriginals, d1RequestContext,
  type D1ImportContext, type ImportMapping, type ImportPlan,
} from '../../modules/import-kit/src/d1/index.ts'
import { businessSource } from './business-source.ts'
import { businessTargets } from './business-targets.ts'
import { businessDestination, businessNamespace, businessMappingVersion, type BusinessImageInput, type BusinessPayload } from './business-model.ts'
import { fail, requiredText } from './errors.ts'
import type { Actor } from './index.ts'

export { businessImageUrls } from './business-source.ts'
export type { BusinessImage, BusinessImageInput } from './business-model.ts'
const ownerSql = "EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')"
async function owner(db: D1Database, who: Actor) {
  if (who.role !== 'owner') fail('owner_required', 403, 'Only an owner can import business records')
  if (!await db.prepare(`SELECT 1 WHERE ${ownerSql}`).bind(who.id).first()) fail('owner_required', 403)
}
function context(db: D1Database, who: Actor): D1ImportContext {
  return d1RequestContext({ destination: businessDestination, namespace: businessNamespace, mappingVersion: businessMappingVersion,
    storage: { database: db, targets: businessTargets }, batchSize: 10, maxBatches: 1,
    authorization: { principalId: who.id, predicate: () => ({ sql: ownerSql, params: [who.id] }) } })
}
const mapping: ImportMapping = {
  version: businessMappingVersion,
  map(record) {
    const { value } = record.payload as unknown as BusinessPayload
    return { effects: [{ targetKind: record.kind, targetId: value.id, value: { ...value, version: 1 } }] }
  },
}
type Conflict = { kind: string; id: string; reason: string }
const tables = { companies: 'p_companies', contacts: 'p_contacts', catalog: 'p_catalog_items' } as const
async function conflicts(db: D1ImportContext['storage']['database'], plan: ImportPlan, allowExisting: boolean) {
  const found: Conflict[] = []
  if (!allowExisting) {
    for (const [kind, table] of Object.entries(tables)) {
      const ids = plan.entries.flatMap(entry => entry.effects.filter(effect => effect.targetKind === kind).map(effect => effect.targetId))
      for (let start = 0; start < ids.length; start += 50) {
        const part = ids.slice(start, start + 50)
        const rows = await db.prepare(`SELECT id FROM ${table} WHERE id IN (${part.map(() => '?').join(',')})`).bind(...part).all<{ id: string }>()
        for (const row of rows.results) found.push({ kind, id: row.id, reason: 'existing_business_record' })
      }
    }
  }
  if(!allowExisting){
    const contacts=plan.entries.flatMap(entry=>entry.effects.filter(effect=>effect.targetKind==='contacts').map(effect=>effect.value as {id:string;email?:string}))
    for(let start=0;start<contacts.length;start+=40){const part=contacts.slice(start,start+40).filter(c=>c.email);if(!part.length)continue
      const rows=await db.prepare(`SELECT id,json_extract(data_json,'$.email') AS email FROM p_contacts WHERE json_extract(data_json,'$.email') IN (${part.map(()=>'?').join(',')})`).bind(...part.map(c=>c.email!)).all<{id:string;email:string}>()
      for(const row of rows.results)found.push({kind:'contacts',id:row.id,reason:'existing_contact_email'})
    }
  }
  const introduced = new Set(plan.entries.flatMap(entry => entry.effects.filter(effect => effect.targetKind === 'companies').map(effect => effect.targetId)))
  const referenced = [...new Set(plan.entries.flatMap(entry => entry.effects.flatMap(effect => {
    if (effect.targetKind !== 'contacts') return []
    const value = effect.value as { company_id?: string | null }
    return value.company_id && !introduced.has(value.company_id) ? [value.company_id] : []
  })))]
  for (let start = 0; start < referenced.length; start += 50) {
    const part = referenced.slice(start, start + 50)
    const rows = await db.prepare(`SELECT id FROM p_companies WHERE id IN (${part.map(() => '?').join(',')})`).bind(...part).all<{ id: string }>()
    const existing = new Set(rows.results.map(row => row.id))
    for (const id of part) if (!existing.has(id)) found.push({ kind: 'companies', id, reason: 'missing_company' })
  }
  return found
}

/** Native authenticated caller only. Image acquisition remains a separate server
 * boundary; exact acquired bytes are reviewed and retained by the real D1 kit. */
export async function businessImportCommand(db: D1Database, who: Actor, name: string, input: Record<string, unknown>, images: BusinessImageInput = {}) {
  await owner(db, who)
  const kit = context(db, who)
  try {
    if (name === 'business-import.preview' || name === 'business-import.apply') {
      const prepared = businessSource(input, images)
      const plan = await planD1Import(prepared.source, mapping, kit)
      const prior = await kit.storage.database.prepare('SELECT id FROM ik_jobs WHERE destination=? AND principal_id=? AND operation_key=?')
        .bind(businessDestination, who.id, plan.fingerprint).first<{ id: string }>()
      const existing = await conflicts(kit.storage.database, plan, Boolean(prior))
      const diagnostics = [...plan.diagnostics, ...existing.map(conflict => ({ severity: 'error' as const, code: conflict.reason,
        message: conflict.reason === 'missing_company' ? `Company ID ${conflict.id} does not exist` : `${conflict.kind} ID ${conflict.id} already exists; records are never merged implicitly`, kind: conflict.kind, sourceId: conflict.id }))]
      const canApply = !diagnostics.some(diagnostic => diagnostic.severity === 'error')
      if (name === 'business-import.preview') {
        await owner(db, who)
        return { kit: 'Business CSV', fingerprint: plan.fingerprint, counts: plan.counts, diagnostics, conflicts: existing, canApply,
          companies: prepared.companies, contacts: prepared.contacts, catalog: prepared.catalog, mapping: prepared.mapping, report: prepared.report,
          ...(prior ? { existingJobId: prior.id } : {}) }
      }
      const reviewedFingerprint = requiredText(input.fingerprint, 'fingerprint')
      if (reviewedFingerprint !== plan.fingerprint) fail('review_fingerprint_mismatch', 409, 'Preview this exact CSV, mapping and image bytes again before applying')
      if (!canApply) fail('business_import_needs_review', 409, 'Resolve the import diagnostics before applying', diagnostics)
      const job = await createD1ImportJob(plan, { ...kit, reviewedFingerprint })
      return { job: await applyD1ImportBatches(job.id, kit), fingerprint: plan.fingerprint }
    }
    if (name !== 'business-import.undo' && name !== 'business-import.journal') fail('unknown_import_command', 400)
    const id = requiredText(input.id, 'id')
    if (name === 'business-import.undo') return { job: await undoD1Import(id, kit) }
    const job = await readD1ImportJob(id, kit), originals = await readD1ImportOriginals(id, kit)
    const batches = (await kit.storage.database.prepare('SELECT action,position,end_position AS endPosition,fence FROM ik_batches WHERE job_id=? ORDER BY rowid').bind(id).all()).results
    const provenance = (await kit.storage.database.prepare('SELECT record_json FROM ik_provenance WHERE job_id=? ORDER BY ordinal,effect_ordinal').bind(id).all<{ record_json: string }>()).results.map(row => JSON.parse(row.record_json))
    await readD1ImportJob(id, kit)
    return { job, originals, batches, provenance }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) throw error
    const message = error instanceof Error ? error.message : ''
    if (message.includes('IMPORT_JOB_NOT_FOUND')) fail('import_job_not_found', 404)
    if (/NATIVE_EDIT_CONFLICT|TARGET_REVISION_CONFLICT|SOURCE_ID_CONTENT_CONFLICT|IMPORT_ALREADY_REVERSING|IMPORT_ATOMIC_GUARD|IMPORT_FINAL_GUARD|JOB_BINDING_MISMATCH|OPERATION_KEY_CONFLICT|UNIQUE constraint|FOREIGN KEY constraint|UNDO_REQUIRES|REVERSAL_MODE_CONFLICT/.test(message)) fail('import_conflict', 409, 'Import conflicts with current records or authority. Later edits and dependent records are preserved.')
    if (/DUPLICATE_SOURCE_CONFLICT|DUPLICATE_TARGET/.test(message)) fail('duplicate_source_id', 400, 'Source IDs must identify one unambiguous record')
    if (/IMPORT_D1_REQUEST_LIMIT|IMPORT_D1_TRANSPORT_LIMIT/.test(message)) fail('import_request_limit', 409, 'Repeat this command to continue the import')
    throw error
  }
}

export async function businessImportJobs(db: D1Database, who: Actor) {
  await owner(db, who)
  const jobs = (await db.prepare(`SELECT id,state,checkpoint,total,fingerprint,error FROM ik_jobs
    WHERE destination=? AND namespace=? AND mapping_version=? AND principal_id=? AND ${ownerSql} ORDER BY rowid DESC LIMIT 30`)
    .bind(businessDestination, businessNamespace, businessMappingVersion, who.id, who.id).all()).results
  await owner(db, who)
  return jobs
}

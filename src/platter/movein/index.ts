import {
  planD1Import, createD1ImportJob, applyD1ImportBatches, undoD1Import,
  readD1ImportJob, readD1ImportOriginals,
  type D1ImportContext, type ImportMapping, type ImportPlan,
} from '../../modules/import-kit/src/d1/index.ts'
import { clientSource, namespace } from './csv.ts'
import { clientTargets, destination, mappingVersion } from './targets.ts'
import { fail, requiredText } from './errors.ts'

export type Actor = { id: string; email: string; role: import('../model').Actor['role'] }
const ownerSql = "EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')"
async function owner(db: D1Database, who: Actor) {
  if (who.role !== 'owner') fail('owner_required', 403, 'Only an owner can move clients in')
  if (!await db.prepare(`SELECT 1 WHERE ${ownerSql}`).bind(who.id).first()) fail('owner_required', 403)
}
function context(db: D1Database, who: Actor): D1ImportContext {
  return {
    destination, namespace, mappingVersion, storage: { database: db, targets: clientTargets },
    batchSize: 10, maxBatches: 1,
    authorization: { principalId: who.id, predicate: () => ({ sql: ownerSql, params: [who.id] }) },
  }
}
const mapping: ImportMapping = {
  version: mappingVersion,
  map(record) {
    return { effects: [{ targetKind: 'clients', targetId: record.sourceId,
      value: { ...(record.payload as { id: string; name: string; email: string }), version: 1 } }] }
  },
}
const clients = (plan: ImportPlan) => plan.entries.flatMap(entry => entry.effects.map(effect => effect.value as { id: string; name: string; email: string; version: number }))
async function conflicts(db: D1Database, plan: ImportPlan) {
  const found: { clientId: string; existingId: string; reason: string }[] = []
  for (const value of clients(plan)) {
    const rows = await db.prepare('SELECT id FROM p_clients WHERE id=? OR lower(email)=?').bind(value.id, value.email).all<{ id: string }>()
    for (const row of rows.results) found.push({ clientId: value.id, existingId: row.id, reason: 'existing_client' })
  }
  return found
}

/** Adapted from Run Glove / Run Lanyard. Caller supplies a native authenticated actor.
 * Every kit read and mutation also checks current owner authority in SQL. */
export async function importCommand(db: D1Database, who: Actor, name: string, input: Record<string, unknown>) {
  await owner(db, who)
  const kit = context(db, who)
  try {
    if (name === 'import.preview' || name === 'import.apply') {
      const plan = await planD1Import(clientSource(input.csv), mapping, kit)
      if (name === 'import.preview') {
        const existing = await conflicts(db, plan)
        await owner(db, who)
        return { kit: 'Client CSV', fingerprint: plan.fingerprint, counts: plan.counts,
          diagnostics: [...plan.diagnostics, ...existing.map(c => ({ severity: 'error' as const, code: c.reason,
            message: `Client ${c.clientId} conflicts with existing client ${c.existingId}`, sourceId: c.clientId }))],
          clients: clients(plan), conflicts: existing, canApply: existing.length === 0 }
      }
      const reviewedFingerprint = requiredText(input.fingerprint, 'fingerprint')
      if (reviewedFingerprint !== plan.fingerprint) fail('review_fingerprint_mismatch', 409, 'Preview this exact CSV again before applying')
      // Same reviewed CSV resumes the same journal; new imports reject native duplicates.
      const prior = await db.prepare('SELECT id FROM ik_jobs WHERE destination=? AND principal_id=? AND operation_key=?')
        .bind(destination, who.id, plan.fingerprint).first()
      if (!prior) {
        const existing = await conflicts(db, plan)
        if (existing.length) fail('existing_client', 409, 'Client IDs and emails must be new', existing)
      }
      const job = await createD1ImportJob(plan, { ...kit, reviewedFingerprint })
      return { job: await applyD1ImportBatches(job.id, kit), fingerprint: plan.fingerprint }
    }
    if (name !== 'import.undo' && name !== 'import.journal') fail('unknown_import_command', 400)
    const id = requiredText(input.id, 'id')
    if (name === 'import.undo') return { job: await undoD1Import(id, kit) }
    const job = await readD1ImportJob(id, kit)
    const originals = await readD1ImportOriginals(id, kit)
    const batches = (await db.prepare('SELECT action,position,end_position AS endPosition,fence FROM ik_batches WHERE job_id=? ORDER BY rowid').bind(id).all()).results
    const provenance = (await db.prepare('SELECT record_json FROM ik_provenance WHERE job_id=? ORDER BY ordinal,effect_ordinal').bind(id).all<{ record_json: string }>()).results.map(row => JSON.parse(row.record_json))
    await readD1ImportJob(id, kit)
    return { job, originals, batches, provenance }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) throw error
    const message = error instanceof Error ? error.message : ''
    if (message.includes('IMPORT_JOB_NOT_FOUND')) fail('import_job_not_found', 404)
    if (/NATIVE_EDIT_CONFLICT|TARGET_REVISION_CONFLICT|SOURCE_ID_CONTENT_CONFLICT|IMPORT_ALREADY_REVERSING|IMPORT_ATOMIC_GUARD|IMPORT_FINAL_GUARD|JOB_BINDING_MISMATCH|OPERATION_KEY_CONFLICT|UNIQUE constraint|FOREIGN KEY constraint|UNDO_REQUIRES|REVERSAL_MODE_CONFLICT/.test(message)) {
      fail('import_conflict', 409, 'Import conflicts with current records or authority. Later edits and dependent proposals are preserved.')
    }
    if (/IMPORT_D1_REQUEST_LIMIT|IMPORT_D1_TRANSPORT_LIMIT/.test(message)) fail('import_request_limit', 409, 'Repeat this command to continue the import')
    throw error
  }
}

/** Owner-scoped job summaries for the Move in page; no source CSV in the listing. */
export async function importJobs(db: D1Database, who: Actor) {
  await owner(db, who)
  const jobs = (await db.prepare(`SELECT id,state,checkpoint,total,fingerprint,error FROM ik_jobs
    WHERE destination=? AND namespace=? AND mapping_version=? AND principal_id=? AND ${ownerSql} ORDER BY rowid DESC LIMIT 30`)
    .bind(destination, namespace, mappingVersion, who.id, who.id).all()).results
  await owner(db, who)
  return jobs
}

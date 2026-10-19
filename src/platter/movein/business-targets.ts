import { canonicalJson, type D1Sql, type D1TargetAdapter, type TargetRow } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors.ts'
import { businessDestination, type BusinessKind, type BusinessRecord } from './business-model.ts'

const tables: Record<BusinessKind, string> = { companies: 'p_companies', contacts: 'p_contacts', catalog: 'p_catalog_items' }
type Native = { id: string; data_json: string; version: number; company_id?: string | null; import_revision: string | null }
const sql = (sql: string, ...params: unknown[]): D1Sql => ({ sql, params })
function table(destination: string, kind: string) {
  if (destination !== businessDestination || !Object.hasOwn(tables, kind)) fail('invalid_import_target', 409)
  return tables[kind as BusinessKind]
}
function select(destination: string, kind: string) {
  return `SELECT n.*,r.revision AS import_revision FROM ${table(destination, kind)} n LEFT JOIN p_import_business_revisions r ON r.kind='${kind}' AND r.target_id=n.id`
}
function target(row: Native, kind: string): TargetRow {
  const value = JSON.parse(row.data_json) as BusinessRecord
  // Corrupt or externally changed evidence must never be normalized away.
  if (value.id !== row.id || value.version !== row.version || (kind === 'contacts' && value.company_id !== row.company_id)) fail('native_business_record_conflict', 409)
  return { destination: businessDestination, targetKind: kind, targetId: row.id, revision: row.import_revision ?? `native:${row.version}`, value }
}

/** Insert-only native adapter. Full JSON, native columns and revision are guarded
 * on every write and reversal, including edits that fail to bump version. */
export const businessTargets: D1TargetAdapter = {
  async read(db, destination, kind, id) {
    const row = await db.prepare(`${select(destination, kind)} WHERE n.id=?`).bind(id).first<Native>()
    return row ? target(row, kind) : undefined
  },
  matches(row, destination, kind, id) {
    const name = table(destination, kind)
    if (!row) return sql(`NOT EXISTS(SELECT 1 FROM ${name} WHERE id=?) AND NOT EXISTS(SELECT 1 FROM p_import_business_revisions WHERE kind=? AND target_id=?)`, id, kind, id)
    const value = row.value as BusinessRecord
    return sql(`EXISTS(SELECT 1 FROM ${name} n LEFT JOIN p_import_business_revisions r ON r.kind=? AND r.target_id=n.id
      WHERE n.id=? AND n.data_json IS ? AND n.version IS ? ${kind === 'contacts' ? 'AND n.company_id IS ?' : ''} AND COALESCE(r.revision,'native:'||n.version)=?)`,
    kind, id, canonicalJson(value), value.version, ...(kind === 'contacts' ? [value.company_id] : []), row.revision)
  },
  write(row) {
    const name = table(row.destination, row.targetKind), value = row.value as BusinessRecord
    if (value.id !== row.targetId || value.version !== 1) fail('invalid_import_effect', 409)
    const contact = row.targetKind === 'contacts'
    if (contact && value.company_id !== null && typeof value.company_id !== 'string') fail('invalid_import_effect', 409)
    return [
      sql(`INSERT INTO ${name}(id,data_json,version${contact ? ',company_id' : ''}) VALUES(?,?,?${contact ? ',?' : ''})`, value.id, canonicalJson(value), value.version, ...(contact ? [value.company_id] : [])),
      sql('INSERT INTO p_import_business_revisions(kind,target_id,revision) VALUES(?,?,?)', row.targetKind, row.targetId, row.revision),
    ]
  },
  remove(destination, kind, id) {
    const name = table(destination, kind)
    return [sql('DELETE FROM p_import_business_revisions WHERE kind=? AND target_id=?', kind, id), sql(`DELETE FROM ${name} WHERE id=?`, id)]
  },
  async list(db, destination) {
    const rows: TargetRow[] = []
    for (const kind of Object.keys(tables)) rows.push(...(await db.prepare(`${select(destination, kind)} ORDER BY n.id`).all<Native>()).results.map(row => target(row, kind)))
    return rows
  },
  matchesCount(count, destination) {
    table(destination, 'companies')
    return sql('((SELECT COUNT(*) FROM p_companies)+(SELECT COUNT(*) FROM p_contacts)+(SELECT COUNT(*) FROM p_catalog_items))=?', count)
  },
}

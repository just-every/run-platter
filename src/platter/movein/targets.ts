import type { D1Sql, D1TargetAdapter, TargetRow } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors.ts'

export const destination = 'platter:clients'
export const mappingVersion = 'client-csv-v1'
const fields = ['id', 'name', 'email', 'version'] as const
type Client = { id: string; name: string; email: string; version: number }
const select = 'SELECT c.*,r.revision AS import_revision FROM p_clients c LEFT JOIN p_import_client_revisions r ON r.client_id=c.id'
const sql = (sql: string, ...params: unknown[]): D1Sql => ({ sql, params })
function scope(dest: string, kind: string) {
  if (dest !== destination || kind !== 'clients') fail('invalid_import_target', 409)
}
function target(row: Client & { import_revision: string | null }): TargetRow {
  return { destination, targetKind: 'clients', targetId: row.id, revision: row.import_revision ?? `native:${row.version}`,
    value: { id: row.id, name: row.name, email: row.email, version: row.version } }
}

// Native adapter adapted from Run Glove and Run Lanyard's Base import-kit adapters.
// Every match guards all native fields, so edits are detected even without a bump.
export const clientTargets: D1TargetAdapter = {
  async read(db, dest, kind, id) {
    scope(dest, kind)
    const row = await db.prepare(`${select} WHERE c.id=?`).bind(id).first<Client & { import_revision: string | null }>()
    return row ? target(row) : undefined
  },
  matches(row, dest, kind, id) {
    scope(dest, kind)
    if (!row) return sql('NOT EXISTS(SELECT 1 FROM p_clients WHERE id=?) AND NOT EXISTS(SELECT 1 FROM p_import_client_revisions WHERE client_id=?)', id, id)
    const v = row.value as Client
    return sql(`EXISTS(SELECT 1 FROM p_clients c LEFT JOIN p_import_client_revisions r ON r.client_id=c.id WHERE c.id=? AND ${fields.map(key => `c.${key} IS ?`).join(' AND ')} AND COALESCE(r.revision,'native:'||c.version)=?)`,
      id, ...fields.map(key => v[key]), row.revision)
  },
  write(row) {
    scope(row.destination, row.targetKind)
    const v = row.value as Client
    if (v.id !== row.targetId || v.version !== 1) fail('invalid_import_effect', 409)
    return [
      sql('INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM p_clients WHERE id=? OR lower(email)=?) THEN 1 ELSE 0 END', v.id, v.email),
      sql('INSERT INTO p_clients(id,name,email,version) VALUES(?,?,?,?)', v.id, v.name, v.email, v.version),
      sql('INSERT INTO p_import_client_revisions(client_id,revision) VALUES(?,?)', row.targetId, row.revision),
    ]
  },
  remove(dest, kind, id) {
    scope(dest, kind)
    return [sql('DELETE FROM p_import_client_revisions WHERE client_id=?', id), sql('DELETE FROM p_clients WHERE id=?', id)]
  },
  async list(db, dest) {
    scope(dest, 'clients')
    return (await db.prepare(`${select} ORDER BY c.id`).all<Client & { import_revision: string | null }>()).results.map(target)
  },
  matchesCount(count, dest) {
    scope(dest, 'clients')
    return sql('(SELECT COUNT(*) FROM p_clients)=?', count)
  },
}

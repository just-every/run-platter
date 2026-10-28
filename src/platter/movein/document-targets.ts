import { canonicalJson, type D1Sql, type D1TargetAdapter, type TargetRow } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors.ts'

export const documentDestination = 'platter:exported-documents'
const sql = (sql: string, ...params: unknown[]): D1Sql => ({ sql, params })
function scope(destination: string, kind: string) {
 if (destination !== documentDestination || kind !== 'documents') fail('invalid_import_target', 409)
}
function target(row: { id: string; data_json: string; original_base64: string; revision: string }): TargetRow {
 const value = JSON.parse(row.data_json)
 return { destination: documentDestination, targetKind: 'documents', targetId: row.id, value, revision: row.revision,
  attachment: { base64: row.original_base64, sha256: value.sha256, mediaType: 'application/pdf' } }
}
export const documentTargets: D1TargetAdapter = {
 async read(db, destination, kind, id) {
  scope(destination, kind)
  const row = await db.prepare('SELECT * FROM p_imported_documents WHERE id=?').bind(id).first<any>()
  return row ? target(row) : undefined
 },
 matches(row, destination, kind, id) {
  scope(destination, kind)
  return row ? sql('EXISTS(SELECT 1 FROM p_imported_documents WHERE id=? AND data_json=? AND original_base64=? AND revision=?)',
   id, canonicalJson(row.value), row.attachment!.base64, row.revision)
   : sql('NOT EXISTS(SELECT 1 FROM p_imported_documents WHERE id=?)', id)
 },
 write(row) {
  scope(row.destination, row.targetKind)
  if (!row.attachment) fail('invalid_import_effect', 409)
  return [sql('INSERT INTO p_imported_documents(id,data_json,original_base64,revision) VALUES(?,?,?,?)',
   row.targetId, canonicalJson(row.value), row.attachment.base64, row.revision)]
 },
 remove(destination, kind, id) {
  scope(destination, kind)
  return [sql('DELETE FROM p_imported_documents WHERE id=?', id)]
 },
 async list(db, destination) {
  scope(destination, 'documents')
  return (await db.prepare('SELECT * FROM p_imported_documents ORDER BY id').all<any>()).results.map(target)
 },
 matchesCount(count, destination) {
  scope(destination, 'documents')
  return sql('(SELECT COUNT(*) FROM p_imported_documents)=?', count)
 },
}

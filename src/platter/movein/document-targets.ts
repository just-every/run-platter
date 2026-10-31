import { canonicalJson, type D1Sql, type D1TargetAdapter, type TargetRow } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors.ts'
import { businessTargets } from './business-targets'
import { businessDestination } from './business-model'

export const documentDestination = 'platter:exported-documents'
const sql = (sql: string, ...params: unknown[]): D1Sql => ({ sql, params })
function scope(destination: string, kind: string) {
 if (destination !== documentDestination || !['documents','companies','contacts'].includes(kind)) fail('invalid_import_target', 409)
}
function target(row: { id: string; data_json: string; revision: string }): TargetRow {
 const value = JSON.parse(row.data_json)
 return { destination: documentDestination, targetKind: 'documents', targetId: row.id, value, revision: row.revision }
}
export const documentTargets: D1TargetAdapter = {
 async read(db, destination, kind, id) {
  scope(destination, kind)
  if(kind!=='documents'){const row=await businessTargets.read(db,businessDestination,kind,id);return row?{...row,destination}:undefined}
  const row = await db.prepare('SELECT * FROM p_imported_documents WHERE id=?').bind(id).first<any>()
  return row ? target(row) : undefined
 },
 matches(row, destination, kind, id) {
  scope(destination, kind)
  if(kind!=='documents')return businessTargets.matches(row?{...row,destination:businessDestination}:null,businessDestination,kind,id)
  return row ? sql('EXISTS(SELECT 1 FROM p_imported_documents WHERE id=? AND data_json=? AND revision=?)',
   id, canonicalJson(row.value), row.revision)
   : sql('NOT EXISTS(SELECT 1 FROM p_imported_documents WHERE id=?)', id)
 },
 write(row) {
  scope(row.destination, row.targetKind)
  if(row.targetKind!=='documents'){
   const value=row.value as any
   return [...businessTargets.write({...row,destination:businessDestination}),sql('INSERT INTO p_document_business_outputs(kind,target_id,movein_id,data_json,revision) VALUES(?,?,?,?,?)',row.targetKind,row.targetId,value.movein_source.moveinId,canonicalJson(value),row.revision)]
  }
  const value=row.value as any
  return [sql('INSERT INTO p_imported_documents(id,data_json,revision) VALUES(?,?,?)',
   row.targetId, canonicalJson(row.value), row.revision),
   ...(value.contactId?[sql('INSERT INTO p_imported_document_contacts(document_id,contact_id) VALUES(?,?)',row.targetId,value.contactId)]:[])]
 },
 remove(destination, kind, id) {
  scope(destination, kind)
  if(kind!=='documents')return [...businessTargets.remove(businessDestination,kind,id),sql('DELETE FROM p_document_business_outputs WHERE kind=? AND target_id=?',kind,id)]
  return [sql('DELETE FROM p_imported_document_contacts WHERE document_id=?',id),sql('DELETE FROM p_imported_documents WHERE id=?', id)]
 },
 async list(db, destination) {
  scope(destination, 'documents')
  return [...(await businessTargets.list(db,businessDestination)).filter(r=>r.targetKind!=='catalog').map(r=>({...r,destination})),...(await db.prepare('SELECT * FROM p_imported_documents ORDER BY id').all<any>()).results.map(target)]
 },
 matchesCount(count, destination) {
  scope(destination, 'documents')
  return sql('((SELECT COUNT(*) FROM p_imported_documents)+(SELECT COUNT(*) FROM p_companies)+(SELECT COUNT(*) FROM p_contacts))=?', count)
 },
}

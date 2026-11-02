import { canonicalJson, type D1Sql, type D1TargetAdapter, type TargetRow } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors.ts'
import { businessTargets } from './business-targets'
import { businessDestination } from './business-model'

export const documentDestination = 'platter:exported-documents'
const sql = (sql: string, ...params: unknown[]): D1Sql => ({ sql, params })
function scope(destination: string, kind: string) {
 if (destination !== documentDestination || !['documents','source-facts','companies','contacts','catalog'].includes(kind)) fail('invalid_import_target', 409)
}
const table=(kind:string)=>kind==='source-facts'?'p_imported_source_facts':'p_imported_documents'
const native=(kind:string)=>kind!=='documents'&&kind!=='source-facts'
function target(row: { id: string; data_json: string; revision: string },kind='documents'): TargetRow {
 const value = JSON.parse(row.data_json)
 return { destination: documentDestination, targetKind: kind, targetId: row.id, value, revision: row.revision }
}
export const documentTargets: D1TargetAdapter = {
 async read(db, destination, kind, id) {
  scope(destination, kind)
  if(native(kind)){const row=await businessTargets.read(db,businessDestination,kind,id);return row?{...row,destination}:undefined}
  const row = await db.prepare('SELECT * FROM '+table(kind)+' WHERE id=?').bind(id).first<any>()
  return row ? target(row,kind) : undefined
 },
 matches(row, destination, kind, id) {
  scope(destination, kind)
  if(native(kind))return businessTargets.matches(row?{...row,destination:businessDestination}:null,businessDestination,kind,id)
  return row ? sql('EXISTS(SELECT 1 FROM '+table(kind)+' WHERE id=? AND data_json=? AND revision=?)',
   id, canonicalJson(row.value), row.revision)
   : sql('NOT EXISTS(SELECT 1 FROM '+table(kind)+' WHERE id=?)', id)
 },
 write(row) {
  scope(row.destination, row.targetKind)
  if(native(row.targetKind)){
   const value=row.value as any
   // Companies and contacts fence undo through their original outputs; catalog metadata is guarded by its revision alone.
   return [...businessTargets.write({...row,destination:businessDestination}),...(row.targetKind==='catalog'?[]:[sql('INSERT INTO p_document_business_outputs(kind,target_id,movein_id,data_json,revision) VALUES(?,?,?,?,?)',row.targetKind,row.targetId,value.movein_source.moveinId,canonicalJson(value),row.revision)])]
  }
  if(row.targetKind==='source-facts')return [sql('INSERT INTO p_imported_source_facts(id,data_json,revision) VALUES(?,?,?)',row.targetId, canonicalJson(row.value), row.revision)]
  const value=row.value as any
  return [sql('INSERT INTO p_imported_documents(id,data_json,revision) VALUES(?,?,?)',
   row.targetId, canonicalJson(row.value), row.revision),
   ...(value.contactId?[sql('INSERT INTO p_imported_document_contacts(document_id,contact_id) VALUES(?,?)',row.targetId,value.contactId)]:[])]
 },
 remove(destination, kind, id) {
  scope(destination, kind)
  if(native(kind))return [...businessTargets.remove(businessDestination,kind,id),sql('DELETE FROM p_document_business_outputs WHERE kind=? AND target_id=?',kind,id)]
  if(kind==='source-facts')return [sql('DELETE FROM p_imported_source_facts WHERE id=?',id)]
  return [sql('DELETE FROM p_imported_document_contacts WHERE document_id=?',id),sql('DELETE FROM p_imported_documents WHERE id=?', id)]
 },
 async list(db, destination) {
  scope(destination, 'documents')
  const rows=[...(await businessTargets.list(db,businessDestination)).map(r=>({...r,destination}))]
  for(const kind of ['documents','source-facts'])rows.push(...(await db.prepare('SELECT * FROM '+table(kind)+' ORDER BY id').all<any>()).results.map(r=>target(r,kind)))
  return rows
 },
 matchesCount(count, destination) {
  scope(destination, 'documents')
  return sql('((SELECT COUNT(*) FROM p_imported_documents)+(SELECT COUNT(*) FROM p_imported_source_facts)+(SELECT COUNT(*) FROM p_companies)+(SELECT COUNT(*) FROM p_contacts)+(SELECT COUNT(*) FROM p_catalog_items))=?', count)
 },
}

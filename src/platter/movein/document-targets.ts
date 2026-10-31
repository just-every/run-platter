import { canonicalJson, type D1Sql, type D1TargetAdapter, type TargetRow } from '../../modules/import-kit/src/d1/index.ts'
import { businessTargets } from './business-targets'
import { businessDestination } from './business-model'
import { fail } from './errors.ts'

export const documentDestination = 'platter:exported-documents'
const sql = (sql: string, ...params: unknown[]): D1Sql => ({ sql, params })
function scope(destination: string, kind: string) {
 if (destination !== documentDestination || !['documents','source-facts'].includes(kind)) fail('invalid_import_target', 409)
}
const table=(kind:string)=>kind==='source-facts'?'p_imported_source_facts':'p_imported_documents'
const native=(kind:string)=>['companies','contacts','catalog'].includes(kind)
function target(row: { id: string; data_json: string; revision: string },kind='documents'): TargetRow {
 const value = JSON.parse(row.data_json)
 return { destination: documentDestination, targetKind: kind, targetId: row.id, value, revision: row.revision }
}
export const documentTargets: D1TargetAdapter = {
 async read(db, destination, kind, id) {
  if(native(kind)){const row=await businessTargets.read(db,businessDestination,kind,id);return row?{...row,destination}:undefined}
  scope(destination, kind)
  const row = await db.prepare('SELECT * FROM '+table(kind)+' WHERE id=?').bind(id).first<any>()
  return row ? target(row,kind) : undefined
 },
 matches(row, destination, kind, id) {
  if(native(kind))return businessTargets.matches(row?{...row,destination:businessDestination}:null,businessDestination,kind,id)
  scope(destination, kind)
  return row ? sql('EXISTS(SELECT 1 FROM '+table(kind)+' WHERE id=? AND data_json=? AND revision=?)',
   id, canonicalJson(row.value), row.revision)
   : sql('NOT EXISTS(SELECT 1 FROM '+table(kind)+' WHERE id=?)', id)
 },
 write(row) {
  if(native(row.targetKind))return businessTargets.write({...row,destination:businessDestination})
  scope(row.destination, row.targetKind)
  return [sql('INSERT INTO '+table(row.targetKind)+'(id,data_json,revision) VALUES(?,?,?)',
   row.targetId, canonicalJson(row.value), row.revision)]
 },
 remove(destination, kind, id) {
  if(native(kind))return businessTargets.remove(businessDestination,kind,id)
  scope(destination, kind)
  return [sql('DELETE FROM '+table(kind)+' WHERE id=?', id)]
 },
 async list(db, destination) {
  scope(destination, 'documents')
  const rows=[]
  for(const kind of ['documents','source-facts'])rows.push(...(await db.prepare('SELECT * FROM '+table(kind)+' ORDER BY id').all<any>()).results.map(r=>target(r,kind)))
  rows.push(...(await businessTargets.list(db,businessDestination)).map(r=>({...r,destination})))
  return rows
 },
 matchesCount(count, destination) {
  scope(destination, 'documents')
  return sql('((SELECT COUNT(*) FROM p_imported_documents)+(SELECT COUNT(*) FROM p_imported_source_facts)+(SELECT COUNT(*) FROM p_companies)+(SELECT COUNT(*) FROM p_contacts)+(SELECT COUNT(*) FROM p_catalog_items))=?', count)
 },
}

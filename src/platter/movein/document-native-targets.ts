import { canonicalJson, type D1Sql, type D1TargetAdapter, type TargetRow } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors'

export type NativeRow = { table: string; key: Record<string,string|number>; values: Record<string,string|number|null> }
const tables = new Set(['p_attachment_files','p_attachment_chunks','p_document_media','p_template_document_media','p_library_media',
 'p_proposals','p_revisions','p_personal_templates','p_library_items','p_imported_library','p_pdf_settings','p_expiry',
 'p_proposal_folders','p_proposal_filing','p_imported_document_links','p_imported_document_folders'])
const sql=(sql:string,...params:unknown[]):D1Sql=>({sql,params})
function columns(row:NativeRow) {
 if(!tables.has(row.table)||![...Object.keys(row.key),...Object.keys(row.values)].every(k=>/^[a-z_][a-z_0-9]*$/.test(k)))fail('invalid_import_target',409)
 return Object.keys(row.values)
}
const where=(row:NativeRow)=>Object.keys(row.key).map(k=>k+' IS ?').join(' AND ')
export const nativeTargets:D1TargetAdapter={
 async read(db,destination,kind,id){
  const receipt=await db.prepare('SELECT * FROM p_document_native_imports WHERE id=?').bind(id).first<any>()
  if(!receipt)return undefined
  const rows:NativeRow[]=JSON.parse(receipt.rows_json)
  const actual=[]
  for(const row of rows){const names=columns(row),value=await db.prepare('SELECT '+names.join(',')+' FROM '+row.table+' WHERE '+where(row)).bind(...Object.values(row.key)).first<any>();actual.push({...row,values:value??{}})}
  return {destination,targetKind:kind,targetId:id,value:{rows:actual},revision:receipt.revision}
 },
 matches(row,destination,kind,id){
  if(!row)return sql('NOT EXISTS(SELECT 1 FROM p_document_native_imports WHERE id=?)',id)
  const rows=(row.value as any).rows as NativeRow[]
  const checks=['EXISTS(SELECT 1 FROM p_document_native_imports WHERE id=? AND revision=? AND rows_json=?)'],params:unknown[]=[id,row.revision,canonicalJson(rows)]
  for(const r of rows){const names=columns(r);checks.push('EXISTS(SELECT 1 FROM '+r.table+' WHERE '+where(r)+' AND '+names.map(k=>k+' IS ?').join(' AND ')+')');params.push(...Object.values(r.key),...names.map(k=>r.values[k]))}
  return sql(checks.join(' AND '),...params)
 },
 write(row){
  const rows=(row.value as any).rows as NativeRow[]
  const writes=rows.map(r=>{const names=columns(r);return sql('INSERT INTO '+r.table+'('+names.join(',')+') VALUES('+names.map(()=>'?').join(',')+')',...names.map(k=>r.values[k]))})
  if(rows.some(r=>r.table==='p_proposals'))writes.push(sql("DELETE FROM p_webhook_events WHERE proposal_id=? AND type='proposal.created'",rows.find(r=>r.table==='p_proposals')!.values.id))
  return [...writes,sql('INSERT INTO p_document_native_imports(id,rows_json,revision) VALUES(?,?,?)',row.targetId,canonicalJson(rows),row.revision)]
 },
 remove(destination,kind,id){
  // JSON receipt is used only to locate rows; table names are fixed by this adapter.
  const writes:D1Sql[]=[]
  const owned=id.split(':')[0]
  if(owned==='p_personal_templates')writes.push(sql("INSERT INTO ik_d1_assertions(ok) SELECT NOT EXISTS(SELECT 1 FROM p_template_sources WHERE template_id=(SELECT json_extract(rows_json,'$[0].values.id') FROM p_document_native_imports WHERE id=?))",id))
  const groups:Record<string,string[]>={p_proposals:['p_imported_document_links','p_proposal_filing','p_pdf_settings','p_document_media','p_revisions','p_proposals'],p_personal_templates:['p_template_document_media','p_personal_templates'],p_library_items:['p_imported_library','p_library_media','p_library_items']}
  for(const table of groups[owned]??[owned]) {
   if(!tables.has(table))fail('invalid_import_target',409)
   const key=table==='p_imported_document_folders'?['document_id','folder_id']:table==='p_attachment_chunks'?['file_id','part']:table==='p_document_media'?['proposal_id','file_id']:table==='p_template_document_media'?['template_id','file_id']:table==='p_library_media'?['item_id','file_id']:table==='p_revisions'?['proposal_id','revision']:table==='p_imported_library'?['item_id']:table==='p_imported_document_links'?['document_id','proposal_id']:['p_pdf_settings','p_expiry','p_proposal_filing'].includes(table)?['proposal_id']:['id']
   writes.push(sql('DELETE FROM '+table+' WHERE EXISTS(SELECT 1 FROM p_document_native_imports n,json_each(n.rows_json) r WHERE n.id=? AND json_extract(r.value,\'$.table\')=? AND '+key.map(k=>table+'.'+k+' IS json_extract(r.value,\'$.key.'+k+'\')').join(' AND ')+')',id,table))
  }
  // Children precede their parent in a receipt, so delete in reverse row order.
  // Separate native targets are undone in reverse import order by the import kit.
  return [...writes,sql('DELETE FROM p_document_native_imports WHERE id=?',id)]
 },
 async list(db,destination){
  const rows=(await db.prepare('SELECT id FROM p_document_native_imports ORDER BY id').all<{id:string}>()).results
  return Promise.all(rows.map(async r=>(await nativeTargets.read(db,destination,'native',r.id))!))
 },
 matchesCount(count){return sql('(SELECT COUNT(*) FROM p_document_native_imports)=?',count)},
}

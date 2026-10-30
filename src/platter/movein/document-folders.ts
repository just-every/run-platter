import { canonicalJson, type D1Sql, type TargetRow, type D1TargetAdapter } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors'

const sql=(sql:string,...params:unknown[]):D1Sql=>({sql,params})
const columns=['id','name','version','updated_by','updated_at','parent_id','owner_id','movein_id']
export const documentFolders:Pick<D1TargetAdapter,'read'|'matches'|'write'|'remove'|'list'>={
 async read(db,destination,kind,id){
  const row=await db.prepare('SELECT * FROM p_pandadoc_folder_trees WHERE id=?').bind(id).first<any>()
  if(!row)return undefined
  const value=JSON.parse(row.value_json),actual=(await db.prepare('SELECT '+columns.join(',')+' FROM p_proposal_folders WHERE movein_id=? ORDER BY id').bind(id).all()).results
  if(canonicalJson(actual)!==canonicalJson([...value.folders].sort((a:any,b:any)=>a.id.localeCompare(b.id))))fail('imported_folder_changed',409,'Imported folders changed; preserve their current contents')
  return {destination,targetKind:kind,targetId:id,value,revision:row.revision}
 },
 matches(row,destination,kind,id){
  if(!row)return sql('NOT EXISTS(SELECT 1 FROM p_pandadoc_folder_trees WHERE id=?) AND NOT EXISTS(SELECT 1 FROM p_proposal_folders WHERE movein_id=?)',id,id)
  const value=row.value as any
  return sql('EXISTS(SELECT 1 FROM p_pandadoc_folder_trees WHERE id=? AND value_json=? AND revision=?) AND (SELECT COUNT(*) FROM p_proposal_folders WHERE movein_id=?)=? AND NOT EXISTS(SELECT 1 FROM json_each(?) j LEFT JOIN p_proposal_folders f ON f.id=json_extract(j.value,\'$.id\') WHERE '+columns.map(c=>"f."+c+" IS NOT json_extract(j.value,'$."+c+"')").join(' OR ')+') AND NOT EXISTS(SELECT 1 FROM p_proposal_folder_teams t JOIN p_proposal_folders f ON f.id=t.folder_id WHERE f.movein_id=?)',id,canonicalJson(value),row.revision,id,value.folders.length,canonicalJson(value.folders),id)
 },
 write(row:TargetRow){
  const value=row.value as any
  return [sql('INSERT INTO p_pandadoc_folder_trees(id,value_json,revision) VALUES(?,?,?)',row.targetId,canonicalJson(value),row.revision),...value.folders.map((folder:any)=>sql('INSERT INTO p_proposal_folders('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')',...columns.map(c=>folder[c])))]
 },
 remove(destination,kind,id){return [sql('DELETE FROM p_proposal_folders WHERE movein_id=?',id),sql('DELETE FROM p_pandadoc_folder_trees WHERE id=?',id)]},
 async list(db,destination){const rows=(await db.prepare('SELECT id FROM p_pandadoc_folder_trees ORDER BY id').all<any>()).results;return (await Promise.all(rows.map(r=>documentFolders.read(db,destination,'folders',r.id)))).filter(Boolean) as TargetRow[]},
}

import { commit, exact, need, text, type Actor } from './model'
export const resourceEditors=['owner','admin','manager','content_editor']
export function folderScope(a:Actor,alias='f'){
 return ['owner','admin','agent'].includes(a.role)?{sql:'1',values:[]}:{sql:`(NOT EXISTS(SELECT 1 FROM p_folder_teams ft WHERE ft.folder_id=${alias}.id) OR EXISTS(SELECT 1 FROM p_folder_teams ft JOIN p_team_members tm ON tm.team_id=ft.team_id WHERE ft.folder_id=${alias}.id AND tm.operator_id=?))`,values:[a.id]}
}
export function resourceScope(a:Actor,alias:string){const f=folderScope(a);return{sql:`(${alias}.folder_id IS NULL OR EXISTS(SELECT 1 FROM p_resource_folders f WHERE f.id=${alias}.folder_id AND ${f.sql}))`,values:f.values}}
export async function resourceFolders(db:D1Database,a:Actor){
 if(![...resourceEditors,'sales','agent'].includes(a.role))return []
 const f=folderScope(a),rows=(await db.prepare('SELECT f.* FROM p_resource_folders f WHERE '+f.sql+' ORDER BY f.kind,f.name,f.id').bind(...f.values).all<any>()).results
 const teams=(await db.prepare('SELECT * FROM p_folder_teams ORDER BY team_id').all<any>()).results
 return rows.map(r=>({...r,teams:teams.filter(t=>t.folder_id===r.id).map(t=>t.team_id)}))
}
export async function folderGuard(db:D1Database,a:Actor,id:unknown,kind:string){
 if(id===undefined||id===null||id==='')return{sql:'1',values:[]}
 const f=folderScope(a),row=await db.prepare('SELECT f.* FROM p_resource_folders f WHERE f.id=? AND f.kind=? AND '+f.sql).bind(text(id,'a folder'),kind,...f.values).first<any>()
 need(row,'This resource folder is unavailable to your teams',403)
 return {sql:'EXISTS(SELECT 1 FROM p_resource_folders f WHERE f.id=? AND f.kind=? AND f.version=? AND '+f.sql+')',values:[row.id,kind,row.version,...f.values]}
}
export async function folderCommand(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(resourceEditors.includes(a.role),'Your role cannot edit shared folders',403)
 need(p.shareConsent===true||p.shareConsent==='yes','Confirm the folder visibility for its contents')
 const id=p.id?text(p.id,'a folder'):crypto.randomUUID(),old=p.id?await db.prepare('SELECT * FROM p_resource_folders WHERE id=?').bind(id).first<any>():null
 if(p.id)need(old,'Folder not found',404)
 const kind=old?.kind??String(p.kind);need(['template','library'].includes(kind),'Choose template or library folders')
 const access=old?await folderGuard(db,a,id,kind):{sql:'1',values:[]};if(old)exact(old,p)
 const name=text(p.name,'a folder name',100),teams=Array.isArray(p.teams)?[...new Set(p.teams.map(String))]:Object.keys(p).filter(k=>k.startsWith('folderTeam:')&&p[k]==='yes').map(k=>k.slice(11))
 need(teams.length<=100,'Choose at most 100 teams')
 for(const team of teams){need(await db.prepare('SELECT id FROM p_teams WHERE id=?').bind(team).first(),'Team not found',404);if(!['owner','admin'].includes(a.role))need(await db.prepare('SELECT 1 FROM p_team_members WHERE team_id=? AND operator_id=?').bind(team,a.id).first(),'Limit folders only to your own teams',403)}
 const membership=teams.map(()=>"EXISTS(SELECT 1 FROM p_team_members WHERE team_id=? AND operator_id=?)").join(' AND '),checkMembership=!['owner','admin'].includes(a.role)&&teams.length>0
 await commit(db,a,[old?db.prepare('UPDATE p_resource_folders SET name=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(name,a.id,Date.now(),id):db.prepare('INSERT INTO p_resource_folders(id,kind,name,updated_by,updated_at) VALUES(?,?,?,?,?)').bind(id,kind,name,a.id,Date.now()),db.prepare('DELETE FROM p_folder_teams WHERE folder_id=?').bind(id),...teams.map(team=>db.prepare('INSERT INTO p_folder_teams(folder_id,team_id) VALUES(?,?)').bind(id,team))],false,{sql:access.sql+(checkMembership?' AND '+membership:''),values:[...access.values,...(checkMembership?teams.flatMap(t=>[t,a.id]):[])]})
 return{id,version:(old?.version??0)+1}
}

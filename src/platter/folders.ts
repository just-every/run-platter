import { brandId, brandScope, brandRecord } from './brands'
import { commit, exact, need, text, type Actor } from './model'
export const resourceEditors=['owner','admin','manager','content_editor']
function teamFolderScope(a:Actor,alias='f'){
 return ['owner','admin','agent'].includes(a.role)?{sql:'1',values:[]}:{sql:`(NOT EXISTS(SELECT 1 FROM p_folder_teams ft WHERE ft.folder_id=${alias}.id) OR EXISTS(SELECT 1 FROM p_folder_teams ft JOIN p_team_members tm ON tm.team_id=ft.team_id WHERE ft.folder_id=${alias}.id AND tm.operator_id=?))`,values:[a.id]}
}
export function folderScope(a:Actor,alias='f'){const team=teamFolderScope(a,alias),brand=brandScope(a,alias);return {sql:'('+team.sql+') AND ('+brand.sql+')',values:[...team.values,...brand.values]}}
export function resourceScope(a:Actor,alias:string){const f=folderScope(a),brand=brandScope(a,alias);return{sql:`(${alias}.folder_id IS NULL OR EXISTS(SELECT 1 FROM p_resource_folders f WHERE f.id=${alias}.folder_id AND ${f.sql})) AND (${brand.sql})`,values:[...f.values,...brand.values]}}
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
 if(p.kind==='proposal'||p.id&&await db.prepare('SELECT id FROM p_proposal_folders WHERE id=?').bind(String(p.id)).first())return proposalFolderCommand(db,a,p)
 const id=p.id?text(p.id,'a folder'):crypto.randomUUID(),old=p.id?await db.prepare('SELECT * FROM p_resource_folders WHERE id=?').bind(id).first<any>():null
 if(p.id)need(old,'Folder not found',404)
 const kind=old?.kind??String(p.kind);need(['template','library'].includes(kind),'Choose template or library folders')
 const access=old?await folderGuard(db,a,id,kind):{sql:'1',values:[]};if(old)exact(old,p)
 const name=text(p.name,'a folder name',100),teams=Array.isArray(p.teams)?[...new Set(p.teams.map(String))]:Object.keys(p).filter(k=>k.startsWith('folderTeam:')&&p[k]==='yes').map(k=>k.slice(11))
 need(teams.length<=100,'Choose at most 100 teams')
 for(const team of teams){need(await db.prepare('SELECT id FROM p_teams WHERE id=?').bind(team).first(),'Team not found',404);if(!['owner','admin'].includes(a.role))need(await db.prepare('SELECT 1 FROM p_team_members WHERE team_id=? AND operator_id=?').bind(team,a.id).first(),'Limit folders only to your own teams',403)}
 const membership=teams.map(()=>"EXISTS(SELECT 1 FROM p_team_members WHERE team_id=? AND operator_id=?)").join(' AND '),checkMembership=!['owner','admin'].includes(a.role)&&teams.length>0
 await commit(db,a,[old?db.prepare('UPDATE p_resource_folders SET name=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(name,a.id,Date.now(),id):db.prepare('INSERT INTO p_resource_folders(id,kind,name,updated_by,updated_at) VALUES(?,?,?,?,?)').bind(id,kind,name,a.id,Date.now()),...(!old?[db.prepare('UPDATE p_resource_folders SET brand_id=? WHERE id=?').bind(brandId(a),id)]:[]),db.prepare('DELETE FROM p_folder_teams WHERE folder_id=?').bind(id),...teams.map(team=>db.prepare('INSERT INTO p_folder_teams(folder_id,team_id) VALUES(?,?)').bind(id,team))],false,{sql:access.sql+(checkMembership?' AND '+membership:''),values:[...access.values,...(checkMembership?teams.flatMap(t=>[t,a.id]):[])]})
 return{id,version:(old?.version??0)+1}
}

// Compare the declared team audiences, including teams with no current members.
export async function requireAudienceConsent(db:D1Database,previous:unknown,next:unknown,consent:unknown){
 if(previous===next||!previous)return
 const before=(await db.prepare('SELECT team_id FROM p_folder_teams WHERE folder_id=?').bind(previous).all<any>()).results.map(r=>r.team_id)
 if(!before.length)return
 const after=next?(await db.prepare('SELECT team_id FROM p_folder_teams WHERE folder_id=?').bind(next).all<any>()).results.map(r=>r.team_id):[]
 if(!after.length||after.some(t=>!before.includes(t)))need(consent===true||consent==='yes','Authorize sharing with the selected folder audience before saving')
}

export function proposalFolderScope(a:Actor,alias='p'){
 if(['owner','admin'].includes(a.role))return {sql:'1',values:[]}
 return {sql:`NOT EXISTS(SELECT 1 FROM p_proposal_filing pf JOIN p_proposal_folder_teams ft ON ft.folder_id=pf.folder_id WHERE pf.proposal_id=${alias}.id) OR EXISTS(SELECT 1 FROM p_proposal_filing pf JOIN p_proposal_folder_teams ft ON ft.folder_id=pf.folder_id JOIN p_team_members tm ON tm.team_id=ft.team_id WHERE pf.proposal_id=${alias}.id AND tm.operator_id=?)`,values:[a.id]}
}
export async function proposalFolders(db:D1Database,a:Actor){
 const access=brandScope(a,'f'),rows=(await db.prepare("SELECT f.*, 'proposal' AS kind FROM p_proposal_folders f WHERE (? IN ('owner','admin') OR NOT EXISTS(SELECT 1 FROM p_proposal_folder_teams ft WHERE ft.folder_id=f.id) OR EXISTS(SELECT 1 FROM p_proposal_folder_teams ft JOIN p_team_members tm ON tm.team_id=ft.team_id WHERE ft.folder_id=f.id AND tm.operator_id=?)) AND ("+access.sql+") ORDER BY f.name,f.id").bind(a.role,a.id,...access.values).all<any>()).results
 const teams=(await db.prepare('SELECT * FROM p_proposal_folder_teams').all<any>()).results;return rows.map(f=>({...f,teams:teams.filter(t=>t.folder_id===f.id).map(t=>t.team_id)}))
}
async function proposalFolderCommand(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(['owner','admin'].includes(a.role),'Only owner and admins manage proposal folders',403)
 const id=p.id?text(p.id,'a folder'):crypto.randomUUID(),old=p.id?await db.prepare('SELECT * FROM p_proposal_folders WHERE id=?').bind(id).first<any>():null
 if(p.id){need(old,'Folder not found',404);need(old.brand_id===brandId(a),'This folder belongs to another brand',403);exact(old,p)}
 const teams=Array.isArray(p.teams)?[...new Set(p.teams.map(String))]:Object.keys(p).filter(k=>k.startsWith('folderTeam:')&&p[k]==='yes').map(k=>k.slice(11))
 need(teams.length<=100,'Choose at most 100 teams');for(const team of teams)need(await db.prepare('SELECT id FROM p_teams WHERE id=?').bind(team).first(),'Team not found',404)
 await commit(db,a,[old?db.prepare('UPDATE p_proposal_folders SET name=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(text(p.name,'a folder name',100),a.id,Date.now(),id):db.prepare('INSERT INTO p_proposal_folders(id,name,updated_by,updated_at) VALUES(?,?,?,?)').bind(id,text(p.name,'a folder name',100),a.id,Date.now()),...(!old?[db.prepare('UPDATE p_proposal_folders SET brand_id=? WHERE id=?').bind(brandId(a),id)]:[]),db.prepare('DELETE FROM p_proposal_folder_teams WHERE folder_id=?').bind(id),...teams.map(team=>db.prepare('INSERT INTO p_proposal_folder_teams(folder_id,team_id) VALUES(?,?)').bind(id,team))],false,{sql:'COALESCE((SELECT version FROM p_proposal_folders WHERE id=?),0)=?',values:[id,old?.version??0]})
 return {id,version:(old?.version??0)+1}
}
export async function fileProposal(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(['owner','admin'].includes(a.role),'Only owner and admins file proposals',403)
 await brandRecord(db,a,'proposal',p.id)
 const row=await db.prepare('SELECT id,version FROM p_proposals WHERE id=?').bind(text(p.id,'a proposal')).first<any>();need(row,'Proposal not found',404);exact(row,p)
 const folder=p.folderId?text(p.folderId,'a folder'):null;if(folder)need(await db.prepare('SELECT id FROM p_proposal_folders WHERE id=? AND brand_id=?').bind(folder,brandId(a)).first(),'Folder not found',404)
 need(p.shareConsent===true||p.shareConsent==='yes','Confirm this folder audience')
 const filingVersion=Number(p.folderVersion??0);need(Number.isSafeInteger(filingVersion)&&filingVersion>=0,'Reload the proposal folder')
 await commit(db,a,[db.prepare('INSERT INTO p_proposal_filing(proposal_id,folder_id) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET folder_id=excluded.folder_id,version=p_proposal_filing.version+1').bind(row.id,folder)],false,{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?) AND COALESCE((SELECT version FROM p_proposal_filing WHERE proposal_id=?),0)=?',values:[row.id,row.version,row.id,filingVersion]})
 return {id:row.id}
}

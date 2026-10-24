import { insertLibrary, libraryUsage, propagateLibrary } from './library-insertion'
import { resourceScope, folderGuard, requireAudienceConsent } from './folders'
import { commit, exact, need, text, type Actor } from './model'
export const libraryEditors=['owner','admin','manager','content_editor']
export const libraryReaders=[...libraryEditors,'sales']
export async function libraryState(db:D1Database,a:Actor){
 if(!libraryReaders.includes(a.role))return []
 const access=resourceScope(a,'r');const rows=(await db.prepare('SELECT r.* FROM p_library_items r WHERE '+access.sql+' ORDER BY title,id').bind(...access.values).all<any>()).results
 return Promise.all(rows.map(async item=>({...item,uses:await libraryUsage(db,a,item.id)})))
}
export async function libraryCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>){
 if(name==='library.insert')return insertLibrary(db,a,p)
 need(libraryEditors.includes(a.role),'Only owner, admins, managers and content editors edit the library',403)
 need(name==='library.save','Unknown library action',404)
 const id=p.id?text(p.id,'a library item'):crypto.randomUUID(),old=p.id?await db.prepare('SELECT * FROM p_library_items WHERE id=?').bind(id).first<any>():null
 if(p.id)need(old,'Library item not found',404)
 if(old)exact(old,p)
 const previous=old?await folderGuard(db,a,old.folder_id,'library'):{sql:'1',values:[]},folderId=p.folderId===undefined?old?.folder_id??null:p.folderId||null,next=await folderGuard(db,a,folderId,'library')
 if(old)await requireAudienceConsent(db,old.folder_id,folderId,p.shareConsent)
 const title=text(p.title,'a title'),content=text(p.content,'the library content',10000),kind=String(p.kind)
 need(['section','case_study','bio','testimonial','terms'].includes(kind),'Choose a supported library text type')
 const at=Date.now(),writes=old?[db.prepare('UPDATE p_library_items SET title=?,kind=?,content=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(title,kind,content,a.id,at,id)]:[db.prepare('INSERT INTO p_library_items(id,title,kind,content,updated_by,updated_at) VALUES(?,?,?,?,?,?)').bind(id,title,kind,content,a.id,at)]
 writes.push(db.prepare('UPDATE p_library_items SET folder_id=? WHERE id=?').bind(folderId,id))
 if(old)writes.push(...await propagateLibrary(db,a,old,{title,content,kind},at))
 await commit(db,a,writes,false,{sql:previous.sql+' AND '+next.sql+(old?' AND EXISTS(SELECT 1 FROM p_library_items WHERE id=? AND version=?)':''),values:[...previous.values,...next.values,...(old?[id,old.version]:[])]})
 return {id,version:(old?.version??0)+1}
}

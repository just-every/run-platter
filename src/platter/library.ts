import { insertLibrary, libraryUsage, propagateLibrary } from './library-insertion'
import { captureLibraryContent, libraryKind, richLibraryKinds } from './library-content'
import { resourceScope, folderGuard, requireAudienceConsent } from './folders'
import { commit, exact, need, text, type Actor } from './model'
export const libraryEditors=['owner','admin','manager','content_editor']
export const libraryReaders=[...libraryEditors,'sales']
export async function libraryState(db:D1Database,a:Actor){
 if(!libraryReaders.includes(a.role))return []
 const access=resourceScope(a,'r');const rows=(await db.prepare('SELECT r.* FROM p_library_items r WHERE '+access.sql+' ORDER BY title,id').bind(...access.values).all<any>()).results
 return Promise.all(rows.map(async item=>({...item,kind:libraryKind(item),tags:JSON.parse(item.tags),uses:await libraryUsage(db,a,item.id)})))
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
 const title=text(p.title,'a title'),kind=String(p.kind)
 need(['section','case_study','bio','testimonial','terms',...richLibraryKinds].includes(kind),'Choose a supported library content type')
 const captured=await captureLibraryContent(db,a,p,old,kind),content=text(captured.content,'the library content',10000)
 const tagInput=p.tags??(old?JSON.parse(old.tags):[]),tags=typeof tagInput==='string'?tagInput.split(',').map(t=>t.trim()).filter(Boolean):tagInput
 need(Array.isArray(tags)&&tags.length<=20&&tags.every(t=>typeof t==='string'&&t.length>0&&t.length<=50),'Use up to 20 tags of 50 characters')
 const storedKind=richLibraryKinds.includes(kind)?'section':kind
 const at=Date.now(),writes=old?[db.prepare('UPDATE p_library_items SET title=?,kind=?,content=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(title,storedKind,content,a.id,at,id)]:[db.prepare('INSERT INTO p_library_items(id,title,kind,content,updated_by,updated_at) VALUES(?,?,?,?,?,?)').bind(id,title,storedKind,content,a.id,at)]
 writes.push(db.prepare('UPDATE p_library_items SET folder_id=?,rich_kind=?,tags=? WHERE id=?').bind(folderId,richLibraryKinds.includes(kind)?kind:null,JSON.stringify([...new Set(tags)]),id))
 if(captured.files!==null)writes.push(db.prepare('DELETE FROM p_library_media WHERE item_id=?').bind(id),...captured.files.map(file=>db.prepare('INSERT INTO p_library_media(item_id,file_id) VALUES(?,?)').bind(id,file)))
 if(old)writes.push(...await propagateLibrary(db,a,{...old,kind:libraryKind(old)},{title,content,kind},at))
 await commit(db,a,writes,false,{sql:previous.sql+' AND '+next.sql+' AND '+captured.guard.sql+(old?' AND EXISTS(SELECT 1 FROM p_library_items WHERE id=? AND version=?)':''),values:[...previous.values,...next.values,...captured.guard.values,...(old?[id,old.version]:[])]})
 return {id,version:(old?.version??0)+1}
}

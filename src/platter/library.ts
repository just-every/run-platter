import { commit, exact, need, text, type Actor } from './model'
export const libraryEditors=['owner','admin','manager','content_editor']
export const libraryReaders=[...libraryEditors,'sales']
export async function libraryState(db:D1Database,a:Actor){
 if(!libraryReaders.includes(a.role))return []
 return (await db.prepare('SELECT * FROM p_library_items ORDER BY title,id').all<any>()).results
}
export async function libraryCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>){
 need(libraryEditors.includes(a.role),'Only owner, admins, managers and content editors edit the library',403)
 need(name==='library.save','Unknown library action',404)
 const id=p.id?text(p.id,'a library item'):crypto.randomUUID(),old=p.id?await db.prepare('SELECT * FROM p_library_items WHERE id=?').bind(id).first<any>():null
 if(p.id)need(old,'Library item not found',404)
 if(old)exact(old,p)
 const title=text(p.title,'a title'),content=text(p.content,'the library content',10000),kind=String(p.kind)
 need(['section','case_study','bio','testimonial','terms'].includes(kind),'Choose a supported library text type')
 const at=Date.now(),writes=old?[db.prepare('UPDATE p_library_items SET title=?,kind=?,content=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(title,kind,content,a.id,at,id)]:[db.prepare('INSERT INTO p_library_items(id,title,kind,content,updated_by,updated_at) VALUES(?,?,?,?,?,?)').bind(id,title,kind,content,a.id,at)]
 await commit(db,a,writes,false,old?{sql:'EXISTS(SELECT 1 FROM p_library_items WHERE id=? AND version=?)',values:[id,old.version]}:undefined)
 return {id,version:(old?.version??0)+1}
}

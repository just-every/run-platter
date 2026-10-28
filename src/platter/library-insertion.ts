import { libraryBlock, libraryMatches as matches, libraryKind } from './library-content'
import { pricedOptions, pricingInput, editablePackages, packageInputs } from './pricing'
import { documentOf, proposalDocument } from './documents/blocks'
import { copyCosts } from './internal-pricing'
import { pendingNegotiation, negotiatedView } from './negotiation'
import { assertSectionLocks } from './section-locks'
import { permitted, scope } from './permissions'
import { folderGuard } from './folders'
import { commit, exact, need, snapshot, text, type Actor } from './model'

/** Use ordinary revision custody, never mutate an earlier revision or sent content. */
async function documentWrites(db:D1Database,a:Actor,row:any,document:any,at:number,options?:any[]){
 need(row.status!=='accepted','Accepted proposals are frozen',409)
 const pending=await pendingNegotiation(db,row.id),current=negotiatedView(row,pending)
 need(['draft','approved'].includes(current.status),'Sent and accepted proposals are frozen; negotiate a draft first',409)
 const doc=proposalDocument(document),next={...current,document:doc,...(options?{options}:{})}
 await assertSectionLocks(db,current,next)
 const latest=await db.prepare('SELECT MAX(revision) AS revision FROM p_revisions WHERE proposal_id=?').bind(row.id).first<any>(),revision=latest.revision+1
 const saved=JSON.stringify(snapshot({...next,revision})),writes:D1PreparedStatement[]=[]
 writes.push(db.prepare("INSERT INTO p_guard(ok) SELECT version=? AND status=? FROM p_proposals WHERE id=?").bind(row.version,row.status,row.id))
 if(pending){
  writes.push(db.prepare('INSERT INTO p_guard(ok) SELECT revision=? FROM p_negotiations WHERE proposal_id=?').bind(pending.revision,row.id),db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),db.prepare('UPDATE p_negotiations SET revision=?,snapshot=?,prepared_by=?,prepared_at=?,approved_by=NULL,approved_at=NULL WHERE proposal_id=?').bind(revision,saved,a.email,at,row.id))
 }else writes.push(db.prepare("UPDATE p_proposals SET document=?,revision=?,version=version+1,status='draft',prepared_by=?,approved_by=NULL,approved_at=NULL WHERE id=?").bind(JSON.stringify(doc),revision,a.email,row.id))
 if(options&&!pending)writes.push(db.prepare('UPDATE p_proposals SET options=? WHERE id=?').bind(JSON.stringify(options),row.id))
 writes.push(db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(row.id,revision,saved,a.email,at,row.currency),copyCosts(db,row.id,current.revision,row.id,revision))
 return {writes,revision}
}

export async function insertLibrary(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(['owner','admin','manager','sales','content_editor'].includes(a.role),'Your role cannot insert library content',403)
 const row=await permitted(db,a,p.id,'edit');exact(row,p)
 const ref=typeof p.itemRef==='string'?p.itemRef.split(':'):[],itemId=p.itemId??ref[0],itemVersion=p.itemVersion??ref[1]
 const item=await db.prepare('SELECT * FROM p_library_items WHERE id=?').bind(text(itemId,'a library item')).first<any>();need(item,'Library item not found',404)
 need(item.version===Number(itemVersion),'Library item changed. Reload before inserting.',409)
 const access=await folderGuard(db,a,item.folder_id,'library')
 need(['linked','detached'].includes(String(p.mode)),'Choose a linked or detached copy')
 need(p.consent===true||p.consent==='yes','Authorize recipient display and future linked draft edits')
 item.kind=libraryKind(item)
 const blockId=crypto.randomUUID(),current=negotiatedView(row,await pendingNegotiation(db,row.id)),doc=documentOf(current),options=snapshot(current).options
 const optionId=String(p.optionId??options[0].id),option=options.find((o:any)=>o.id===optionId)
 let nextOptions
 if(item.kind==='pricing'){
  need(row.currency==='USD'&&option,'Choose a USD package for the library table')
  const tables=pricingInput(options),saved=JSON.parse(item.content).table
  tables.push({optionId,...saved});nextOptions=pricedOptions(packageInputs(editablePackages(options),tables),tables)
 }
 const imported=await db.prepare('SELECT * FROM p_imported_library WHERE item_id=?').bind(item.id).first<any>()
 if(imported){
  need(p.mode==='detached','Imported rich sections insert as independent copies; edit the inserted blocks in the proposal')
  const saved=proposalDocument(JSON.parse(imported.document)),savedTables=JSON.parse(imported.options),tables=pricingInput(options)
  for(const block of saved.blocks){const copy={...block,id:crypto.randomUUID()};if(copy.type==='pricing'){const source=savedTables.filter((t:any)=>t.optionId===copy.optionId)[copy.tableIndex!];need(source&&option,'Choose a package for imported pricing');copy.optionId=optionId;copy.tableIndex=tables.filter((t:any)=>t.optionId===optionId).length;tables.push({...source,optionId})}doc.blocks.push(copy)}
  if(tables.length)nextOptions=pricedOptions(packageInputs(editablePackages(options),tables),tables)
 }else doc.blocks.push(libraryBlock(item,blockId,optionId,option?.tables?.length??0))
 const change=await documentWrites(db,a,row,doc,Date.now(),nextOptions)
 change.writes.push(db.prepare('INSERT INTO p_document_media(proposal_id,file_id) SELECT ?,file_id FROM p_library_media WHERE item_id=? ON CONFLICT DO NOTHING').bind(row.id,item.id))
 await commit(db,a,[...change.writes,...(imported?[]:[db.prepare('INSERT INTO p_library_uses(proposal_id,block_id,item_id,linked,item_version,title,content,kind) VALUES(?,?,?,?,?,?,?,?)').bind(row.id,blockId,item.id,p.mode==='linked'?1:0,item.version,item.title,item.content,item.kind)])],false,{sql:access.sql+' AND EXISTS(SELECT 1 FROM p_library_items WHERE id=? AND version=? AND folder_id IS ?)',values:[...access.values,item.id,item.version,item.folder_id]})
 return {id:row.id,version:row.version+1,revision:change.revision,blockId}
}

export async function libraryUsage(db:D1Database,a:Actor,itemId:string){
 const access=scope(a,'view'),rows=(await db.prepare('SELECT u.*,p.title AS proposal_title,p.status,p.document,p.options,n.snapshot AS pending_snapshot FROM p_library_uses u JOIN p_proposals p ON p.id=u.proposal_id LEFT JOIN p_negotiations n ON n.proposal_id=p.id WHERE u.item_id=? AND ('+access.sql+') ORDER BY p.title,u.block_id').bind(itemId,...access.values).all<any>()).results
 return rows.flatMap(row=>{
  const block=documentOf(row).blocks.find(b=>b.id===row.block_id),pending=row.pending_snapshot?documentOf(JSON.parse(row.pending_snapshot)).blocks.find(b=>b.id===row.block_id):undefined
  if(!block&&!pending)return []
  return [{proposalId:row.proposal_id,title:row.proposal_title,blockId:row.block_id,mode:row.linked&&matches(pending??block,row,snapshot(row.pending_snapshot?JSON.parse(row.pending_snapshot):row).options)?'linked':'detached',frozen:row.status==='accepted'||(!pending&&!['draft','approved'].includes(row.status)),itemVersion:row.item_version}]
 })
}

export async function propagateLibrary(db:D1Database,a:Actor,old:any,next:any,at:number){
 if(old.title===next.title&&old.content===next.content&&old.kind===next.kind)return []
 const uses=(await db.prepare('SELECT p.*,u.proposal_id,u.block_id,u.item_id,u.linked,u.item_version,u.title AS source_title,u.content,u.kind FROM p_library_uses u JOIN p_proposals p ON p.id=u.proposal_id WHERE u.item_id=? AND u.linked=1').bind(old.id).all<any>()).results
 const writes:D1PreparedStatement[]=[]
 for(const id of new Set(uses.map(u=>u.proposal_id))){
  const group=uses.filter(u=>u.proposal_id===id),row=group[0],pending=await pendingNegotiation(db,id)
  if(row.status==='accepted'||(!['draft','approved'].includes(row.status)&&!pending))continue
  const current=negotiatedView(row,pending),doc=documentOf(current),options=snapshot(current).options;let changed=false,prices=false
  for(const use of group){const block=doc.blocks.find(b=>b.id===use.block_id);if(!block||!matches(block,use,options))continue
   need(use.kind===next.kind||![use.kind,next.kind].some(k=>['image','video','pricing'].includes(k)),'Keep the media or table type of an item with linked draft copies',409)
   if(next.kind==='pricing'){const option=options.find((o:any)=>o.id===block.optionId);option.tables[block.tableIndex!]=JSON.parse(next.content).table;prices=true}
   Object.assign(block,libraryBlock(next,use.block_id,block.optionId,block.tableIndex));changed=true
   writes.push(db.prepare('INSERT INTO p_document_media(proposal_id,file_id) SELECT ?,file_id FROM p_library_media WHERE item_id=? ON CONFLICT DO NOTHING').bind(id,old.id))
   writes.push(db.prepare('UPDATE p_library_uses SET item_version=?,title=?,content=?,kind=? WHERE proposal_id=? AND block_id=?').bind(old.version+1,next.title,next.content,next.kind,id,use.block_id))
  }
  if(changed)writes.push(...(await documentWrites(db,a,{...row,id},doc,at,prices?pricedOptions(packageInputs(editablePackages(options),pricingInput(options)),pricingInput(options)):undefined)).writes)
 }
 return writes
}

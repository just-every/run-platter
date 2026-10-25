import { paymentTerms } from './payment-terms'
import { documentOf } from './documents/blocks'
import { folderGuard, resourceEditors } from './folders'
import { permitted } from './permissions'
import { commit, exact, need, text, type Actor } from './model'
export const lockSections=['title','scope','terms','pricing','deposit']
export const lockChoices=(row:any)=>[...lockSections.map(section=>({section,label:section})),...documentOf(row).blocks.map(block=>({section:'block:'+block.id,label:'Block: '+(block.title||block.type)}))]
const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value
const richTerms=(row:any)=>documentOf(row).blocks.filter(b=>b.type==='terms').map(({title,text,condition})=>({title,text,...(condition?{condition}:{})})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
const fieldValue=(row:any,section:string)=>section.startsWith('block:')?documentOf(row).blocks.find(b=>b.id===section.slice(6))??null:section==='pricing'?typeof row.options==='string'?JSON.parse(row.options):row.options:section==='deposit'?[row.deposit_bps,paymentTerms(row)]:['scope','terms'].includes(section)?[row[section]??'',...(section==='terms'?[richTerms(row)]:[]),(typeof row.section_conditions==='string'?JSON.parse(row.section_conditions):row.section_conditions??{})[section]??null]:row[section]
export async function assertSectionLocks(db:D1Database,old:any,next:any){
 const locks=(await db.prepare('SELECT section FROM p_proposal_locks WHERE proposal_id=? UNION ALL SELECT section FROM p_proposal_block_locks WHERE proposal_id=?').bind(old.id,old.id).all<any>()).results
 for(const {section} of locks)need(JSON.stringify(canonical(fieldValue(old,section)))===JSON.stringify(canonical(fieldValue(next,section))),'The '+section+' section is locked. Ask an owner, admin or team manager to unlock this proposal first.',403)
}
export async function assertTemplateLocks(db:D1Database,template:any,next:any){
 const locks=(await db.prepare('SELECT section FROM p_template_locks WHERE template_id=? UNION ALL SELECT section FROM p_template_block_locks WHERE template_id=?').bind(template.id,template.id).all<any>()).results,old=JSON.parse(template.snapshot)
 for(const {section} of locks)need(JSON.stringify(canonical(fieldValue(old,section)))===JSON.stringify(canonical(fieldValue(next,section))),'The '+section+' template section is locked. Unlock it explicitly before replacing its content.',403)
}
export async function sectionLockCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>){
 if(name==='proposal.unlock'){
  need(['owner','admin','manager'].includes(a.role),'Only owner, admins and team managers unlock proposal sections',403)
  const row=await permitted(db,a,p.id,'send');exact(row,p)
  need(['draft','approved'].includes(row.status)||await db.prepare('SELECT proposal_id FROM p_negotiations WHERE proposal_id=?').bind(row.id).first(),'Unlock a draft revision before editing',409)
  const section=text(p.section,'a locked section');need(lockChoices(row).some(choice=>choice.section===section),'Choose a supported section')
  const table=section.startsWith('block:')?'p_proposal_block_locks':'p_proposal_locks'
  need(await db.prepare('SELECT 1 FROM '+table+' WHERE proposal_id=? AND section=?').bind(row.id,section).first(),'This section is no longer locked',409)
  await commit(db,a,[db.prepare('DELETE FROM '+table+' WHERE proposal_id=? AND section=?').bind(row.id,section),db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id)],false,{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?)',values:[row.id,row.version]})
  return{id:row.id,version:row.version+1,unlocked:section}
 }
 need(name==='template.locks','Unknown section lock action',404)
 need(resourceEditors.includes(a.role),'Your role cannot change template locks',403)
 const id=text(p.id,'a template'),row=await db.prepare('SELECT * FROM p_personal_templates WHERE id=?').bind(id).first<any>();need(row,'Template not found',404)
 need(row.shared===1||row.owner_id===a.id,'Only the owner changes a personal template',403);exact(row,p)
 const folder=await folderGuard(db,a,row.folder_id,'template'),sections=Array.isArray(p.sections)?[...new Set(p.sections.map(String))]:Object.keys(p).filter(k=>k.startsWith('lock:')&&p[k]==='yes').map(k=>k.slice(5))
 need(sections.every(s=>lockChoices(JSON.parse(row.snapshot)).some(choice=>choice.section===s)),'Choose supported template sections')
 await commit(db,a,[db.prepare('DELETE FROM p_template_locks WHERE template_id=?').bind(id),db.prepare('DELETE FROM p_template_block_locks WHERE template_id=?').bind(id),...sections.map(s=>db.prepare('INSERT INTO '+(s.startsWith('block:')?'p_template_block_locks':'p_template_locks')+'(template_id,section) VALUES(?,?)').bind(id,s)),db.prepare('UPDATE p_personal_templates SET version=version+1,updated_at=? WHERE id=?').bind(Date.now(),id)],false,{sql:'EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND version=?) AND '+folder.sql,values:[id,row.version,...folder.values]})
 return{id,version:row.version+1}
}

import { blockTextTarget, documentOf, selectedDocument } from './documents/blocks'
import { assertSectionLocks } from './section-locks'
import { copyCosts } from './internal-pricing'
import { expiryOpenSql, currentTime } from './expiry'
import type { Bindings } from '../auth.server'
import { commit, exact, need, proposal, snapshot, text, type Actor } from './model'
import { pendingNegotiation } from './negotiation'

export async function suggestionState(db:D1Database,id:string,revision?:number){
 const rows=(await db.prepare('SELECT * FROM p_suggestions WHERE proposal_id=? UNION ALL SELECT * FROM p_block_suggestions WHERE proposal_id=? ORDER BY created_at,id').bind(id,id).all<any>()).results
 const sections=(await db.prepare('SELECT revision,section FROM p_suggestion_sections WHERE proposal_id=? UNION ALL SELECT revision,section FROM p_block_suggestion_sections WHERE proposal_id=?').bind(id,id).all<any>()).results
 return {suggestions:revision===undefined?rows:rows.filter(r=>r.revision===revision),suggestionSections:sections.filter(r=>revision===undefined||r.revision===revision)}
}
function replace(source:string,original:string,replacement:string){need(source.includes(original)&&source.indexOf(original)===source.lastIndexOf(original),'Select text that occurs exactly once in this section',409);return source.replace(original,()=>replacement)}
export async function suggest(env:Bindings,c:any,input:Record<string,unknown>){
 need(c.verified,'Verify your email before suggesting edits',401)
 const section=String(input.section),block=section.startsWith('block:');need(block||['scope','terms'].includes(section),'Only text sections allow suggestions')
 const selected=selectedDocument(c.row.document,c.optionId,c.selection?.items??[]),target=block?blockTextTarget({document:selected},section):null,source=target?(selected.blocks.find(b=>b.id===target.id) as any)[target.key]:c.row[section]??''
 need(Number(input.revision)===c.row.revision,'This offer changed. Reload before suggesting.',409)
 const original=text(input.original,'the existing text',10000),replacement=text(input.replacement,'suggested text',10000)
 need(original!==replacement,'Suggest different text')
 replace(source,original,replacement)
 const id=crypto.randomUUID(),at=await currentTime(env.DB),db=env.DB,sections=block?'p_block_suggestion_sections':'p_suggestion_sections',suggestions=block?'p_block_suggestions':'p_suggestions'
 try{await db.batch([
  db.prepare(`INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id JOIN ${sections} e ON e.proposal_id=p.id AND e.revision=p.revision WHERE s.token=? AND s.session_hash=? AND s.session_expires>? AND p.status='sent' AND p.revision=? AND e.section=? AND ${expiryOpenSql('p')}))`).bind(c.token,c.share.session_hash,at,c.row.revision,section,at),
  db.prepare(`INSERT INTO ${suggestions}(id,proposal_id,revision,section,original,replacement,client_id,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id,c.row.id,c.row.revision,section,original,replacement,c.row.client_id,at),db.prepare('DELETE FROM p_guard')
 ])}catch(e){if(String(e).includes('CHECK constraint'))need(false,'Suggestions are closed or the offer changed',409);throw e}
 return {message:'Suggestion recorded. The firm must review it; your offer is unchanged.'}
}
export async function suggestionCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(a.role!=='agent','A person manages text suggestions',403)
 const db=env.DB,offer=await proposal(db,p.id);exact(offer,p)
 need(offer.status==='sent','Only an unsigned sent proposal accepts suggestions',409)
 const guard={sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status='sent')",values:[offer.id,offer.version]}
 if(name==='suggestions.allow'){
  const section=String(p.section),block=section.startsWith('block:');need(block||['scope','terms'].includes(section),'Only text sections allow suggestions');if(block)blockTextTarget(offer,section)
  const table=block?'p_block_suggestion_sections':'p_suggestion_sections'
  const enabled=p.enabled===true||p.enabled==='yes'
  await commit(db,a,[db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(offer.id),enabled?db.prepare(`INSERT OR IGNORE INTO ${table}(proposal_id,revision,section) VALUES(?,?,?)`).bind(offer.id,offer.revision,section):db.prepare(`DELETE FROM ${table} WHERE proposal_id=? AND revision=? AND section=?`).bind(offer.id,offer.revision,section)],false,guard)
  return {id:offer.id}
 }
 const suggestionId=text(p.suggestionId,'a suggestion'),legacy=await db.prepare('SELECT * FROM p_suggestions WHERE id=? AND proposal_id=?').bind(suggestionId,offer.id).first<any>(),table=legacy?'p_suggestions':'p_block_suggestions',s=legacy??await db.prepare('SELECT * FROM p_block_suggestions WHERE id=? AND proposal_id=?').bind(suggestionId,offer.id).first<any>()
 need(s&&!s.decision&&s.revision===offer.revision,'Choose an unresolved suggestion on the live revision',409)
 const decision=String(p.decision);need(['accepted','rejected'].includes(decision),'Accept or reject the suggestion')
 const pending=await pendingNegotiation(db,offer.id),at=Date.now(),writes:D1PreparedStatement[]=[]
 let revision:number|null=null
 if(decision==='accepted'){
  const source=pending?JSON.parse(pending.snapshot):snapshot(offer)
  if(s.section.startsWith('block:')){const target=blockTextTarget(source,s.section),doc=documentOf(source),block=doc.blocks.find(b=>b.id===target.id)!;const value=replace((block as any)[target.key]??'',s.original,s.replacement);need(value.length<=(target.key==='title'?200:10000),'The resulting block text is too long');(block as any)[target.key]=value;source.document=doc}else{source[s.section]=replace(source[s.section]??'',s.original,s.replacement);need(source[s.section].length<=10000,'The resulting section exceeds 10000 characters')}
  await assertSectionLocks(db,pending?JSON.parse(pending.snapshot):offer,source)
  const latest=await db.prepare('SELECT MAX(revision) AS revision FROM p_revisions WHERE proposal_id=?').bind(offer.id).first<any>()
  revision=latest.revision+1;source.revision=revision
  const saved=JSON.stringify(source)
  writes.push(db.prepare('INSERT INTO p_negotiations(proposal_id,revision,snapshot,prepared_by,prepared_at) VALUES(?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,prepared_by=excluded.prepared_by,prepared_at=excluded.prepared_at,approved_by=NULL,approved_at=NULL').bind(offer.id,revision,saved,a.email,at),db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(offer.id,revision,saved,a.email,at,offer.currency),copyCosts(db,offer.id,pending?.revision??offer.revision,offer.id,Number(revision)))
 }
 writes.push(db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(offer.id),db.prepare(`UPDATE ${table} SET decision=?,decided_by=?,decided_at=?,resulting_revision=? WHERE id=?`).bind(decision,a.email,at,revision,s.id))
 await commit(db,a,writes,false,guard)
 return {id:offer.id,revision}
}

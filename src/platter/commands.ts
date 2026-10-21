import { connectionCommand } from './connections'
import { defaultStatements, workspaceCommand } from './workspace'
import { saveCost, copyCosts, patchCosts, type CostPatch } from './internal-pricing'
import { libraryCommand } from './library'
import { approvalCommand, approvalPlan } from './approvals'
import { authorizeCommand, teamCommand } from './permissions'
import { invitationMail } from './invitation-mail'
import { sendTestMail } from './test-mail'
import { pricedOptions, pricingInput, tableInputs, packageInputs, editablePackages } from './pricing'
import { templateCommand } from './templates'
import { sectionConditions } from './conditional'
import { followupCommand } from './followup/commands'
import { duplicateProposal } from './duplicate'
import { withdraw } from './withdrawal'
import { questionCommand } from './questions'
import { expiryCommand, expirySendStatements, currentTime } from './expiry'
import { pdfCommand } from './documents/client-pdf'
import { businessCommand } from './business-records'
import { deliveryCommand } from './delivery'
import { reportCommand } from './reports/schedules'
import { vendorDocuments } from './attachments'
import { refreshVendorDocuments } from './attachment-commands'
// Revision approval and immutable snapshots adapted from Glove's quote commands.
import type { Bindings } from '../auth.server'
import { createPortability } from '@runeditrun/rer/modules/portability'
import archivePolicy from './archive-policy.mjs'
import { need,fail,text,email,dollars,exact,commit,proposal,snapshot,secret,type Actor } from './model'
import { dispatchMail } from './mail'
import { exportInvoice } from './invoices'
import { suggestionCommand } from './suggestions'
import { restoreFields } from './history'
import { negotiationCommand, pendingNegotiation } from './negotiation'

export function proposalFields(p:Record<string,unknown>){
 const tables=tableInputs(p.pricingTables)
 const price=(id:string,value:unknown)=>tables.some(t=>t&&t.optionId===id)?1:dollars(value,'package:'+id)
 const deposit=Number(p.depositPercent);need(Number.isFinite(deposit)&&Number.isInteger(deposit*100)&&deposit>0&&deposit<=100,'Deposit must be from 0.01 to 100 percent')
 const terms=p.terms??'';need(typeof terms==='string'&&terms.length<=10000,'Terms must be text up to 10000 characters')
 const options=p.packages===undefined?null:packageInputs(p.packages,tables)
 const conditions=sectionConditions(p.sectionConditions??Object.fromEntries(['scope','terms'].filter(k=>p[k+'Option']).map(k=>[k,p[k+'Option']])),options??[{id:'one'},{id:'two'}])
 return{section_conditions:conditions,terms,client_id:text(p.clientId,'a client'),title:text(p.title,'a title'),scope:text(p.scope,'the scope',10000),deposit_bps:Math.round(deposit*100),options:pricedOptions(options??[{id:'one',label:text(p.optionOne,'the first option',200),cents:price('one',p.priceOne)},{id:'two',label:text(p.optionTwo,'the second option',200),cents:price('two',p.priceTwo)}],tables)}
}
export async function command(env:Bindings,a:Actor,name:string,p:Record<string,unknown>,restoredAttachments?:unknown,internalCosts?:CostPatch[],costSourceRevision?:number):Promise<any>{const db=env.DB,at=await currentTime(env.DB)
 await authorizeCommand(db,a,name,p)
 if(name.startsWith('team.')||name.startsWith('member.')||name==='proposal.share')return teamCommand(db,a,name,p)
 if(name.startsWith('approval.')||name==='proposal.approve'||name==='proposal.reject')return approvalCommand(env,a,name,p)
 if(name.startsWith('provider.'))return connectionCommand(env,a,name,p)
 if(name==='workspace.defaults')return workspaceCommand(db,a,p)
 if(name==='pricing.cost')return saveCost(env,a,p,(fields,patch)=>command(env,a,'proposal.revise',fields,undefined,patch))
 if(name.startsWith('library.'))return libraryCommand(db,a,name,p)
 if(name==='proposal.test-mail')return sendTestMail(env,a,p)
 if(name.startsWith('template.'))return templateCommand(env,a,name,p)
 if(name==='proposal.prepare'&&p.templateId!==undefined)return templateCommand(env,a,'template.start',{id:p.templateId,version:p.templateVersion,clientId:p.clientId,...(p.title?{title:p.title}:{})})
 if(name.startsWith('followup.'))return followupCommand(env,a,name,p)
 if(name==='proposal.duplicate')return duplicateProposal(env,a,p)
 if(name==='proposal.withdraw'||name==='proposal.lose')return withdraw(env,a,p,name==='proposal.lose')
 if(name.startsWith('question.'))return questionCommand(env,a,name,p)
 if(name.startsWith('expiry.'))return expiryCommand(env,a,name,p)
 if(name==='pdf.downloads')return pdfCommand(env,a,p)
 if(name.startsWith('business-import.'))return businessCommand(env,a,name,p)
 if(name.startsWith('delivery.'))return deliveryCommand(env,a,name,p)
 if(name.startsWith('report.'))return reportCommand(env,a,name,p)
 if(name==='attachments.refresh')return refreshVendorDocuments(db,a,p)
 if(name==='suggestions.allow'||name==='suggestion.resolve')return suggestionCommand(env,a,name,p)
 if(name==='proposal.restore'){const fields=await restoreFields(db,a,p);return command(env,a,'proposal.revise',fields,fields.restoredAttachments,undefined,Number(p.revision))}
 if(name==='client.save'){
  need(a.role!=='agent','A person adds clients',403);const id=crypto.randomUUID();await commit(db,a,[db.prepare('INSERT INTO p_clients(id,name,email) VALUES(?,?,?)').bind(id,text(p.name,'a client name'),email(p.email))]);return{id}
 }
 if(name==='client.erase'){
  need(a.role==='owner','Only the owner erases clients',403);const id=text(p.id,'a client'),c=await db.prepare('SELECT * FROM p_clients WHERE id=?').bind(id).first<any>();need(c,'Client not found',404);need(p.confirmName===c.name,'Type the exact client name to confirm erasure');
  const unused=`NOT EXISTS(SELECT 1 FROM p_proposals WHERE client_id=?) AND NOT EXISTS(SELECT 1 FROM p_import_client_revisions WHERE client_id=?)`
  const check=await db.prepare(`SELECT (${unused}) AS ok`).bind(id,id).first<any>();need(check?.ok,'Clients with proposal or import history must be retained. Undo an unused import first.',409)
  const portability=await createPortability({db,policy:archivePolicy});await commit(db,a,[...await portability.erasureStatements('p_clients',{id}),...await portability.invalidateTransfersStatements(),db.prepare('DELETE FROM p_clients WHERE id=?').bind(id)],true,{sql:unused,values:[id,id]});return{erased:true}
 }
 if(name==='proposal.negotiate'||name==='proposal.revise'){
  const current=await proposal(db,p.id)
  if(p.pricingTables!==undefined&&tableInputs(p.pricingTables).length)need(current.currency==='USD','Historical AUD proposals keep their original pricing form',409)
  if(p.packages!==undefined&&current.currency!=='USD'){const requested=packageInputs(p.packages,[]);need(requested.length===2&&requested.every((o:any,i:number)=>o.id===['one','two'][i]&&!o.optionalItems?.length),'Historical AUD proposals keep their original pricing form',409)}
  if(p.packages===undefined){const pending=await pendingNegotiation(db,current.id);const content=pending?JSON.parse(pending.snapshot):current;const options=typeof content.options==='string'?JSON.parse(content.options):content.options;if(options.length!==2||options.some((o:any,i:number)=>o.id!==['one','two'][i]||o.optionalItems?.length))p={...p,packages:editablePackages(options).map(o=>{const suffix=o.id==='one'?'One':o.id==='two'?'Two':null;return suffix?{...o,...(p['option'+suffix]!==undefined?{label:p['option'+suffix]}:{}),...(p['price'+suffix]!==undefined?{price:p['price'+suffix]}:{})}:o})}}
  if(p.pricingTables===undefined){const pending=await pendingNegotiation(db,current.id);const content=pending?JSON.parse(pending.snapshot):current;p={...p,pricingTables:pricingInput(typeof content.options==='string'?JSON.parse(content.options):content.options)}}
  if(p.sectionConditions===undefined&&p.scopeOption===undefined&&p.termsOption===undefined){const pending=await pendingNegotiation(db,current.id);p={...p,sectionConditions:pending?JSON.parse(pending.snapshot).section_conditions??{}:current.section_conditions}}
  if(p.terms===undefined){const pending=await pendingNegotiation(db,current.id);p={...p,terms:pending?JSON.parse(pending.snapshot).terms??'':current.terms}}
  if(name==='proposal.negotiate'||await pendingNegotiation(db,current.id))return negotiationCommand(env,a,name,p,current,{...proposalFields(p),...(restoredAttachments!==undefined?{attachments:restoredAttachments}:{}),internalCosts,costSourceRevision})
 }
 if(name==='proposal.prepare'||name==='proposal.revise'){
  const f=proposalFields(p);need(await db.prepare('SELECT id FROM p_clients WHERE id=?').bind(f.client_id).first(),'Client not found',404)
  const old=name==='proposal.revise'?await proposal(db,p.id):null;if(old){exact(old,p);need(['draft','approved'].includes(old.status),'Sent and accepted proposals are frozen',409)}
  const id=old?.id??crypto.randomUUID(),revision=(old?.revision??0)+1,currency=old?.currency??'USD',attachments=old?restoredAttachments??JSON.parse(old.attachments):await vendorDocuments(db),row={id,...f,revision,currency,attachments};const writes:D1PreparedStatement[]=[]
  if(old){writes.push(db.prepare("UPDATE p_proposals SET client_id=?,title=?,scope=?,terms=?,attachments=?,version=version+1,revision=?,status='draft',deposit_bps=?,options=?,prepared_by=?,approved_by=NULL,approved_at=NULL WHERE id=?").bind(f.client_id,f.title,f.scope,f.terms,JSON.stringify(attachments),revision,f.deposit_bps,JSON.stringify(f.options),a.role==='agent'?`agent:${a.keyId}`:a.email,id),db.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(id))}
  else writes.push(db.prepare("INSERT INTO p_proposals(id,client_id,title,scope,version,revision,status,deposit_bps,options,prepared_by,created_at,currency,sales_owner_id,sales_owner_name,terms,attachments) VALUES(?,?,?,?,1,?,'draft',?,?,?,?,?,?,?,?,?)").bind(id,f.client_id,f.title,f.scope,revision,f.deposit_bps,JSON.stringify(f.options),a.role==='agent'?`agent:${a.keyId}`:a.email,at,currency,a.id,a.email,f.terms,JSON.stringify(attachments)))
  writes.push(db.prepare('UPDATE p_proposals SET section_conditions=? WHERE id=?').bind(JSON.stringify(f.section_conditions),id))
  writes.push(db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(id,revision,JSON.stringify(snapshot(row)),a.role==='agent'?`agent:${a.keyId}`:a.email,at,currency))
  if(!old)writes.push(...await defaultStatements(db,id))
  if(old)writes.push(copyCosts(db,id,costSourceRevision??old.revision,id,revision))
  if(internalCosts)writes.push(...patchCosts(db,id,revision,internalCosts))
  await commit(db,a,writes,false,old?{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved'))",values:[id,old.version]}:undefined);return{id,revision,version:(old?.version??0)+1}
 }
 if(name==='invoice.export')return exportInvoice(db,a,p)
 if(name==='proposal.approve'||name==='proposal.send'){
  const old=await proposal(db,p.id);exact(old,p)
  if(await pendingNegotiation(db,old.id))return negotiationCommand(env,a,name,p,old)
  need(['draft','approved','sent'].includes(old.status),'Only an open proposal can be sent',409);const approval=await approvalPlan(db,old,a);need(approval.complete,'Approve this revision before sending',409);const token=secret(),client=await db.prepare('SELECT c.*,COALESCE(s.recipient,c.email) AS email FROM p_clients c LEFT JOIN p_shares s ON s.proposal_id=? WHERE c.id=?').bind(old.id,old.client_id).first<any>(),shareUrl=env.AUTH_ORIGIN+'/p/'+token
  await commit(db,a,[db.prepare("UPDATE p_proposals SET status='sent',version=version+1 WHERE id=?").bind(old.id),db.prepare('INSERT INTO p_shares(proposal_id,revision,token) VALUES(?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET token=excluded.token,revision=excluded.revision,code_hash=NULL,code_expires=NULL,code_attempts=0,code_generation=0,code_sent_at=NULL,session_hash=NULL,session_expires=NULL').bind(old.id,old.revision,token),...await expirySendStatements(db,old.id,a.id,at),...invitationMail(env,a,p,old,client.email,shareUrl,at)],true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved','sent')) AND COALESCE((SELECT version FROM p_approval_policy WHERE singleton=1),0)=?",values:[old.id,old.version,approval.policyVersion]});await dispatchMail(env,old.id);return{shareUrl}
 }
 fail('Unknown command',404)
}

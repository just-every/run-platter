import { handoffCommand } from './handoff/jobs'
import { archiveCommand } from './archiving/jobs'
import { clientLocale, saveClientLocale } from './locales'
import { hasTaxable, taxRequest, optionTax, resolveTax, saveTaxRate, validateTaxOptions, type TaxSnapshot } from './taxes'
import { resolveVariables, editableVariableFields, missingMerge, clientVariableFields } from './variables'
import { recipientCommand, recipientInvitations, recipientInput } from './recipients'
import { unfilledVariables } from './api/variables'
import { stakeholderRecipient } from './tracking/index'
import { trackingCommand } from './tracking'
import { collaborationCommand } from './collaboration'
import { replaceSigner } from './signer-replacement'
import { signerMethodCommand } from './signer-methods'
import { smsCommand } from './sms'
import { surchargeCommand } from './collection-fees'
import { collectionPolicyCommand } from './collection-policy'
import { scheduleInput, editableTerms, paymentTerms } from './payment-terms'
import { saveOutcomeSettings, configureCrmOutcome, synchronizeOutcome } from './outcomes'
import { assertDiscountDates, discountDeadline } from './discounts'
import { detachChangedLibraryCopies } from './library-links'
import { notificationCommand } from './notifications/commands'
import { validateDocumentMedia } from './documents/media'
import { proposalDocument, documentOf } from './documents/blocks'
import { saveReminderTemplate } from './reminder-messages'
import { reminderCommand } from './reminders'
import { disputeCommand } from './disputes'
import { catalogInsertion, saveCatalog } from './catalog'
import { assertSectionLocks, sectionLockCommand } from './section-locks'
import { folderCommand, fileProposal } from './folders'
import { paymentCommand } from './payments'
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
import { negotiationCommand, pendingNegotiation, negotiatedView } from './negotiation'

export function proposalFields(p:Record<string,unknown>,tax?:TaxSnapshot){
 const tables=tableInputs(p.pricingTables)
 const price=(id:string,value:unknown)=>tables.some(t=>t&&t.optionId===id)?1:dollars(value,'package:'+id)
 const schedule=scheduleInput(p),deposit=Number(schedule?.depositFixedCents!=null&&(p.depositPercent===undefined||p.depositPercent==='')?100:p.depositPercent);need(Number.isFinite(deposit)&&Number.isInteger(deposit*100)&&deposit>0&&deposit<=100,'Deposit must be from 0.01 to 100 percent')
 const terms=p.terms??'';need(typeof terms==='string'&&terms.length<=10000,'Terms must be text up to 10000 characters')
 const options=p.packages===undefined?null:packageInputs(p.packages,tables)
 const conditions=sectionConditions(p.sectionConditions??Object.fromEntries(['scope','terms'].filter(k=>p[k+'Option']).map(k=>[k,p[k+'Option']==='variable'?'variable:'+String(p[k+'Variable']??'')+'='+String(p[k+'VariableValue']??''):p[k+'Option']])),options??[{id:'one'},{id:'two'}])
 const rawPriced=pricedOptions(options??[{id:'one',label:text(p.optionOne,'the first option',200),cents:price('one',p.priceOne)},{id:'two',label:text(p.optionTwo,'the second option',200),cents:price('two',p.priceTwo)}],tables)
 const priced=rawPriced.map(o=>tax?{...o,tax}:o);validateTaxOptions(priced,schedule)
 return{payment_terms:schedule,document:proposalDocument(p.document,priced,String(p.clientId??'')),section_conditions:conditions,terms,client_id:text(p.clientId,'a client'),title:text(p.title,'a title'),scope:text(p.scope,'the scope',10000),deposit_bps:Math.round(deposit*100),options:priced}
}
export async function command(env:Bindings,a:Actor,name:string,p:Record<string,unknown>,restoredAttachments?:unknown,internalCosts?:CostPatch[],costSourceRevision?:number,restoredTax?:TaxSnapshot|null):Promise<any>{const db=env.DB,at=await currentTime(env.DB)
 await authorizeCommand(db,a,name,p)
 if(name==='proposal.locale')return saveClientLocale(db,a,p)
 if(name==='tax.rate')return saveTaxRate(db,a,p)
 let tax:TaxSnapshot|undefined
 if(['proposal.prepare','proposal.revise','proposal.negotiate'].includes(name)){
  const current=name==='proposal.prepare'?null:negotiatedView(await proposal(db,p.id),await pendingNegotiation(db,String(p.id)))
  const existing=current?optionTax(snapshot(current).options):undefined
  if(current)exact(await proposal(db,p.id),p)
  const request=taxRequest(p);if(restoredTax!==undefined)need(a.role==='owner'||JSON.stringify(restoredTax??undefined)===JSON.stringify(existing),'Only the owner restores changed tax settings',403);tax=restoredTax!==undefined?restoredTax??undefined:request!==undefined?await resolveTax(db,a,request,at):existing
  need(!tax||!current||current.currency==='USD','Historical AUD proposals keep their original GST-free form',409)
  need(!tax||!current||p.clientId===undefined||p.clientId===current.client_id||request!==undefined,'Supply explicit tax addresses for the new client',409)
 }
 if(name.startsWith('recipient.'))return recipientCommand(env,a,name,p)
 if(name==='tracking.recipient')return stakeholderRecipient(env,a,p)
 if(name.startsWith('tracking.'))return trackingCommand(env,a,name,p)
 if(name.startsWith('collaboration.'))return collaborationCommand(env,a,name,p)
 if(name==='signer.replace')return replaceSigner(env,a,p)
 if(name==='signer.method')return signerMethodCommand(env,a,p)
 if(name.startsWith('sms.'))return smsCommand(env,a,name,p)
 if(name.startsWith('notification.'))return notificationCommand(env,a,name,p)
 if(name.startsWith('team.')||name.startsWith('member.')||name==='proposal.share')return teamCommand(db,a,name,p)
 if(name.startsWith('approval.')||name==='proposal.approve'||name==='proposal.reject')return approvalCommand(env,a,name,p)
 if(name==='reminder-template.save')return saveReminderTemplate(db,a,p)
 if(name.startsWith('reminder.'))return reminderCommand(env,a,name,p)
 if(name.startsWith('dispute.'))return disputeCommand(env,a,name,p)
 if(name==='proposal.autosave'){
  need(a.role!=='agent','A person autosaves the proposal editor',403)
  const result=await command(env,a,'proposal.revise',p),current=negotiatedView(await proposal(db,result.id),await pendingNegotiation(db,result.id))
  return {...result,title:current.title,options:snapshot(current).options}
 }
 if(name==='proposal.quantity'){
  need(a.role!=='agent','A person edits pricing quantities',403)
  const original=await proposal(db,p.id);exact(original,p);const current=negotiatedView(original,await pendingNegotiation(db,original.id)),content=snapshot(current),tables=pricingInput(content.options),offered=tables.filter(t=>t.optionId===p.optionId),ti=Number(p.tableIndex),li=Number(p.lineIndex)
  need(Number.isInteger(ti)&&ti>=0&&Number.isInteger(li)&&li>=0&&offered[ti]?.lines[li],'Choose a current pricing line')
  offered[ti].lines[li].quantity=String(p.quantity)
  const result=await command(env,a,'proposal.revise',{id:original.id,version:original.version,clientId:current.client_id,title:current.title,scope:current.scope,terms:current.terms??'',sectionConditions:content.section_conditions??{},depositPercent:current.deposit_bps/100,packages:editablePackages(content.options),pricingTables:tables})
  const updated=negotiatedView(await proposal(db,original.id),await pendingNegotiation(db,original.id)),option=snapshot(updated).options.find((o:any)=>o.id===p.optionId)
  return {...result,option:{id:option.id,label:option.label,cents:option.cents,priceCents:option.discount?.grossCents??option.cents},quantity:offered[ti].lines[li].quantity}
 }
 if(name==='proposal.document'){
  need(a.role!=='agent','A person edits document blocks',403)
  const original=await proposal(db,p.id);exact(original,p)
  const current=negotiatedView(original,await pendingNegotiation(db,original.id)),content=snapshot(current)
  return command(env,a,'proposal.revise',{id:original.id,version:original.version,clientId:current.client_id,title:current.title,scope:current.scope,terms:current.terms??'',sectionConditions:content.section_conditions??{},depositPercent:current.deposit_bps/100,packages:editablePackages(content.options),pricingTables:pricingInput(content.options),document:p.document})
 }
 if(name==='proposal.variables'){
  const current=await proposal(db,p.id);exact(current,p);const displayed=negotiatedView(current,await pendingNegotiation(db,current.id));
  return command(env,a,'proposal.revise',{...editableVariableFields(displayed),id:current.id,version:current.version,...(p.fields as any??{}),variableValues:p.values??Object.fromEntries([...Object.entries(p).filter(([key,value])=>key.startsWith('variable:')&&value!=='').map(([key,value])=>[key.slice(9),value]),...Object.entries(p).filter(([key,value])=>key.startsWith('clear:')&&value==='yes').map(([key])=>[key.slice(6),''])]),...(p.deal!==undefined?{variableDeal:p.deal}:p.dealId?{variableDeal:{provider:p.dealProvider??'hubspot',id:p.dealId}}:{})})
 }
 if(name==='catalog.save')return saveCatalog(db,a,p)
 if(name==='catalog.insert'){const addition=await catalogInsertion(db,a,p);return command(env,a,'proposal.revise',addition.fields,undefined,addition.costs)}
 if(name==='proposal.unlock'||name==='template.locks')return sectionLockCommand(db,a,name,p)
 if(name==='proposal.folder')return fileProposal(db,a,p)
 if(name==='folder.save')return folderCommand(db,a,p)
 if(name==='payment.surcharge')return surchargeCommand(db,a,p)
 if(name==='payment.collection')return collectionPolicyCommand(env,a,name,p)
 if(name.startsWith('payment.'))return paymentCommand(env,a,name,p)
 if(name.startsWith('handoff.'))return handoffCommand(env,a,name,p)
 if(name.startsWith('archive.'))return archiveCommand(env,a,name,p)
 if(name.startsWith('provider.'))return connectionCommand(env,a,name,p)
 if(name==='workspace.defaults')return workspaceCommand(db,a,p)
 if(name==='pricing.cost')return saveCost(env,a,p,(fields,patch)=>command(env,a,'proposal.revise',fields,undefined,patch))
 if(name.startsWith('library.'))return libraryCommand(db,a,name,p)
 if(name==='proposal.test-mail')return sendTestMail(env,a,p)
 if(name.startsWith('template.'))return templateCommand(env,a,name,p)
 if(name==='proposal.prepare'&&p.templateId!==undefined)return templateCommand(env,a,'template.start',{id:p.templateId,version:p.templateVersion,clientId:p.clientId,...(p.title?{title:p.title}:{})})
 if(name.startsWith('followup.'))return followupCommand(env,a,name,p)
 if(name==='proposal.duplicate')return duplicateProposal(env,a,p)
 if(name==='outcome.settings')return saveOutcomeSettings(db,a,p)
 if(name==='outcome.crm')return configureCrmOutcome(env,a,p)
 if(name==='outcome.crm.sync'){need(['owner','admin'].includes(a.role),'Only owner and admins synchronize CRM outcomes',403);await synchronizeOutcome(env,text(p.id,'a proposal'));return {saved:true}}
 if(name==='proposal.withdraw'||name==='proposal.lose'||name==='proposal.win')return withdraw(env,a,p,name==='proposal.lose',name==='proposal.win')
 if(name.startsWith('question.'))return questionCommand(env,a,name,p)
 if(name.startsWith('expiry.'))return expiryCommand(env,a,name,p)
 if(name==='pdf.downloads')return pdfCommand(env,a,p)
 if(name.startsWith('business-import.'))return businessCommand(env,a,name,p)
 if(name.startsWith('delivery.'))return deliveryCommand(env,a,name,p)
 if(name.startsWith('report.'))return reportCommand(env,a,name,p)
 if(name==='attachments.refresh')return refreshVendorDocuments(db,a,p)
 if(name==='suggestions.allow'||name==='suggestion.resolve')return suggestionCommand(env,a,name,p)
 if(name==='proposal.restore'){const fields=await restoreFields(db,a,p);return command(env,a,'proposal.revise',fields,fields.restoredAttachments,undefined,Number(p.revision),fields.restoredTax)}
 if(name==='client.save'){
  need(a.role!=='agent','A person adds clients',403);const id=crypto.randomUUID();await commit(db,a,[db.prepare('INSERT INTO p_clients(id,name,email,variable_fields) VALUES(?,?,?,?)').bind(id,text(p.name,'a client name'),email(p.email),JSON.stringify(clientVariableFields(p.variableFields??Object.fromEntries(['contactName','firstName','lastName','title','address'].filter(key=>p[key]!==undefined).map(key=>[key,p[key]])))))]);return{id}
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
  if(p.packages!==undefined&&current.currency!=='USD'){const requested=packageInputs(p.packages,[]);need(requested.length===2&&requested.every((o:any,i:number)=>o.id===['one','two'][i]&&!o.optionalItems?.length&&!o.discountBps&&!o.discountFixedCents&&!o.concealDiscount&&!o.discountExpiresOn),'Historical AUD proposals keep their original pricing form',409)}
  if(p.packages===undefined){const pending=await pendingNegotiation(db,current.id);const content=pending?JSON.parse(pending.snapshot):current;const options=typeof content.options==='string'?JSON.parse(content.options):content.options;if(options.length!==2||options.some((o:any,i:number)=>o.taxable||o.taxCode||o.id!==['one','two'][i]||o.optionalItems?.length||o.discount||o.concealDiscount||o.discountExpiresOn))p={...p,packages:editablePackages(options).map(o=>{const suffix=o.id==='one'?'One':o.id==='two'?'Two':null;return suffix?{...o,...(p['option'+suffix]!==undefined?{label:p['option'+suffix]}:{}),...(p['price'+suffix]!==undefined?{price:p['price'+suffix]}:{})}:o})}}
  if(p.pricingTables===undefined){const pending=await pendingNegotiation(db,current.id);const content=pending?JSON.parse(pending.snapshot):current;p={...p,pricingTables:pricingInput(typeof content.options==='string'?JSON.parse(content.options):content.options)}}
  if(p.sectionConditions===undefined&&p.scopeOption===undefined&&p.termsOption===undefined){const pending=await pendingNegotiation(db,current.id);p={...p,sectionConditions:pending?JSON.parse(pending.snapshot).section_conditions??{}:current.section_conditions}}
  if(p.terms===undefined){const pending=await pendingNegotiation(db,current.id);p={...p,terms:pending?JSON.parse(pending.snapshot).terms??'':current.terms}}
  if(p.paymentTerms===undefined&&p.scheduleEnabled===undefined)p={...p,paymentTerms:editableTerms(negotiatedView(current,await pendingNegotiation(db,current.id)))}
  if(p.document===undefined)p={...p,document:documentOf(negotiatedView(current,await pendingNegotiation(db,current.id)))}
  p=(await resolveVariables(env,a,p)).fields
  const nextFields=proposalFields(p,tax),oldContent=negotiatedView(current,await pendingNegotiation(db,current.id)),oldOptions=snapshot(oldContent).options
  if(JSON.stringify(paymentTerms(oldContent))!==JSON.stringify(nextFields.payment_terms)||Boolean(paymentTerms(oldContent))&&oldContent.deposit_bps!==nextFields.deposit_bps)need(['owner','admin','manager'].includes(a.role),'Only owner, admins and scoped managers edit payment schedules',403)
  const external=(document:any)=>document.blocks.filter((b:any)=>b.type==='embed').sort((a:any,b:any)=>a.id.localeCompare(b.id))
  if(JSON.stringify(external(nextFields.document))!==JSON.stringify(external(documentOf(oldContent))))need(['owner','admin'].includes(a.role),'Only owner and admins change external content',403)
  for(const block of documentOf(oldContent).blocks.filter(b=>b.type==='pricing')){const retained=nextFields.document.blocks.find(b=>b.id===block.id&&b.type==='pricing'&&b.optionId===block.optionId&&b.tableIndex===block.tableIndex);if(retained)need((oldOptions.find((o:any)=>o.id===block.optionId)?.tables?.length??0)===(nextFields.options.find((o:any)=>o.id===block.optionId)?.tables?.length??0),'Remove or reassign placed document pricing blocks before changing the number of tables')}
  await validateDocumentMedia(db,proposalFields(p,tax).document,current.id)
  await assertSectionLocks(db,negotiatedView(current,await pendingNegotiation(db,current.id)),proposalFields(p,tax))
  if(name==='proposal.negotiate'||await pendingNegotiation(db,current.id))return negotiationCommand(env,a,name,p,current,{...proposalFields(p,tax),...(restoredAttachments!==undefined?{attachments:restoredAttachments}:{}),internalCosts,costSourceRevision})
 }
 if(name==='proposal.prepare'||name==='proposal.revise'){
  p=(await resolveVariables(env,a,p)).fields
  const f=proposalFields(p,tax);need(!f.payment_terms?.retainer||!f.options.some((o:any)=>o.tables?.some((t:any)=>t.lines.some((l:any)=>l.recurrence))||o.optionalItems?.some((i:any)=>i.recurrence)),'Use recurring pricing lines instead of an additional schedule retainer');if(name==='proposal.prepare'&&f.payment_terms)need(['owner','admin','manager'].includes(a.role),'Only owner, admins and scoped managers set payment schedules',403);if(f.payment_terms?.depositFixedCents!=null)need(f.options.every((o:any)=>o.cents>=f.payment_terms.depositFixedCents),'Fixed deposit must fit every package');need(await db.prepare('SELECT id FROM p_clients WHERE id=?').bind(f.client_id).first(),'Client not found',404)
  const old=name==='proposal.revise'?await proposal(db,p.id):null;await validateDocumentMedia(db,f.document,old?.id);if(old){exact(old,p);need(['draft','approved'].includes(old.status),'Sent and accepted proposals are frozen',409)}
  if(p.recipientPlan!==undefined&&JSON.stringify(p.recipientPlan)!==JSON.stringify(JSON.parse(old?.recipient_plan??'[]')))need(a.role==='owner','Only the current owner changes recipient role slots',403)
  const id=old?.id??crypto.randomUUID(),revision=(old?.revision??0)+1,currency=old?.currency??'USD',attachments=old?restoredAttachments??JSON.parse(old.attachments):await vendorDocuments(db),row={id,...f,recipient_plan:p.recipientPlan===undefined?old?.recipient_plan??'[]':JSON.stringify(Array.isArray(p.recipientPlan)&&!p.recipientPlan.length?[]:recipientInput(p.recipientPlan,a)),revision,currency,attachments};const writes:D1PreparedStatement[]=[]
  if(old){writes.push(db.prepare("UPDATE p_proposals SET client_id=?,title=?,scope=?,terms=?,attachments=?,version=version+1,revision=?,status='draft',deposit_bps=?,options=?,prepared_by=?,approved_by=NULL,approved_at=NULL WHERE id=?").bind(f.client_id,f.title,f.scope,f.terms,JSON.stringify(attachments),revision,f.deposit_bps,JSON.stringify(f.options),a.role==='agent'?`agent:${a.keyId}`:a.email,id),db.prepare('DELETE FROM p_shares WHERE proposal_id=?').bind(id))}
  else writes.push(db.prepare("INSERT INTO p_proposals(id,client_id,title,scope,version,revision,status,deposit_bps,options,prepared_by,created_at,currency,sales_owner_id,sales_owner_name,terms,attachments) VALUES(?,?,?,?,1,?,'draft',?,?,?,?,?,?,?,?,?)").bind(id,f.client_id,f.title,f.scope,revision,f.deposit_bps,JSON.stringify(f.options),a.role==='agent'?`agent:${a.keyId}`:a.email,at,currency,a.id,a.email,f.terms,JSON.stringify(attachments)))
  writes.push(db.prepare('UPDATE p_proposals SET recipient_plan=? WHERE id=?').bind(row.recipient_plan,id))
  writes.push(db.prepare('UPDATE p_proposals SET section_conditions=?,document=?,payment_terms=? WHERE id=?').bind(JSON.stringify(f.section_conditions),JSON.stringify(f.document),f.payment_terms?JSON.stringify(f.payment_terms):null,id))
  writes.push(db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,?,?,?,?,?)').bind(id,revision,JSON.stringify(snapshot(row)),a.role==='agent'?`agent:${a.keyId}`:a.email,at,currency))
  if(!old)writes.push(...await defaultStatements(db,id))
  if(old)writes.push(copyCosts(db,id,costSourceRevision??old.revision,id,revision),...await detachChangedLibraryCopies(db,id,f.document,f.options))
  if(internalCosts)writes.push(...patchCosts(db,id,revision,internalCosts))
  await commit(db,a,writes,false,old?{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved'))",values:[id,old.version]}:undefined);return{id,revision,version:(old?.version??0)+1}
 }
 if(name==='invoice.export')return exportInvoice(db,a,p)
 if(name==='proposal.approve'||name==='proposal.send'){
  const old=await proposal(db,p.id);exact(old,p)
  const pending=await pendingNegotiation(db,old.id);if(name==='proposal.send'){
   if(clientLocale(old)==='es'){need(!old.recipient_plan||old.recipient_plan==='[]','Spanish currently requires a single client mailbox',409);need(!await db.prepare('SELECT 1 FROM p_collection_policy WHERE proposal_id=?').bind(old.id).first(),'Turn off collection before sending in Spanish',409);need(!p.mailRepliesConsent||p.mailRepliesConsent==='no','Spanish invitation reply disclosure is not available',409)}const offered=snapshot(negotiatedView(old,pending)).options;need(!hasTaxable(offered)||optionTax(offered),'Set explicit owner-configured tax addresses before sending taxable items.',409);const missing=[...new Set([...unfilledVariables(snapshot(negotiatedView(old,pending))),...missingMerge(negotiatedView(old,pending))])];need(!missing.length,'Fill variables before sending: '+missing.join(', '),409)}assertDiscountDates(snapshot(negotiatedView(old,pending)).options,at)
  if(pending)return negotiationCommand(env,a,name,p,old)
  need(['draft','approved','sent'].includes(old.status),'Only an open proposal can be sent',409);const approval=await approvalPlan(db,old,a);need(approval.complete,'Approve this revision before sending',409);const token=secret(),client=await db.prepare('SELECT c.*,COALESCE(s.recipient,c.email) AS email FROM p_clients c LEFT JOIN p_shares s ON s.proposal_id=? WHERE c.id=?').bind(old.id,old.client_id).first<any>(),shareUrl=env.AUTH_ORIGIN+'/p/'+token
  const invitations=await recipientInvitations(env,a,p,old,at)
  await commit(db,a,[db.prepare("UPDATE p_proposals SET status='sent',version=version+1 WHERE id=?").bind(old.id),...(invitations?invitations.writes:[db.prepare('INSERT INTO p_shares(proposal_id,revision,token) VALUES(?,?,?) ON CONFLICT(proposal_id,slot_id) DO UPDATE SET token=excluded.token,revision=excluded.revision,code_hash=NULL,code_expires=NULL,code_attempts=0,code_generation=0,code_sent_at=NULL,session_hash=NULL,session_expires=NULL').bind(old.id,old.revision,token),...invitationMail(env,a,p,old,client.email,shareUrl,at)]),...await expirySendStatements(db,old.id,a.id,at)],true,{sql:"EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved','sent')) AND COALESCE((SELECT version FROM p_approval_policy WHERE singleton=1),0)=? AND ?>=MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0))",values:[old.id,old.version,approval.policyVersion,discountDeadline(snapshot(old).options),at]});await dispatchMail(env,old.id);return{shareUrl:invitations?.links[0]?.shareUrl??shareUrl,...(invitations?{recipients:invitations.links}:{})}
 }
 fail('Unknown command',404)
}

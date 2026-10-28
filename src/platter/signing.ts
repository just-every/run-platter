import { archiveCompletion } from './archiving/jobs'
import { clientLocale, clientText, type ClientLocale } from './locales'
import { paymentTerms } from './payment-terms'
import { recipientContent, recipientPlan, recipientProgress, recipientSignatures, requiredRecipient, completionMail } from './recipients'
import { trackingSettings } from './tracking'
import { signerMethod } from './signer-methods'
import { deliverSmsCode, smsCodeContext } from './sms'
import { collectionView, clientCollection } from './collection'
import { collectionPolicy } from './collection-policy'
import { synchronizeOutcome } from './outcomes'
import { assertDiscountDates, discountDeadline } from './discounts'
import { workspaceDefaults } from './workspace'
import { acceptanceFields } from './documents/blocks'
import { withdrawalStatements, outcomeStatement } from './withdrawal'
import { selectedContent, agreementContent } from './conditional'
import { offerSelection, reviewItems, selectionItems } from './selection'
import { createQuestion, clientQuestionState } from './questions'
import { expiryFor, expiryOpenSql, requestReopen, currentTime } from './expiry'
import { pdfEnabled } from './documents/client-pdf'
import { suggest, suggestionState } from './suggestions'
// Adapted from Inkwell's scoped email-code signer flow: 10 minutes, five
// attempts, a minute between requests, ten generations, single-use verification.
import type { Bindings } from '../auth.server'
import { need,text,hash,secret,snapshot,fail } from './model'
import { queueMail,dispatchMail } from './mail'
import { paperRow,paperView } from './paper-record'
import { installationZone } from './reports/report-state'
const cookieName='platter_client'
export function sixDigitCode(){const limit=4294000000,v=new Uint32Array(1);do crypto.getRandomValues(v);while(v[0]>=limit);return String(v[0]%1000000).padStart(6,'0')}
export async function clientContext(env:Bindings,token:string,request:Request){need(/^[a-f0-9]{64}$/.test(token),'Proposal invitation not found',404);const share=await env.DB.prepare('SELECT * FROM p_shares WHERE token=?').bind(token).first<any>();need(share,'Proposal invitation not found',404);const row=await env.DB.prepare('SELECT p.*,lang.locale AS client_locale,c.name AS clientName,c.email AS clientEmail FROM p_proposals p JOIN p_clients c ON c.id=p.client_id LEFT JOIN p_client_locales lang ON lang.proposal_id=p.id WHERE p.id=?').bind(share.proposal_id).first<any>();need(row&&share.revision===row.revision&&['sent','accepted'].includes(row.status),'This proposal has been replaced',409)
 if(share.recipient)row.clientEmail=share.recipient
 const progress=await recipientProgress(env.DB,row,share.slot_id);need(!recipientPlan(row).length||progress,'This recipient invitation is no longer current',410)
 const cookie=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1),verified=Boolean(cookie&&share.session_hash&&share.session_expires>await currentTime(env.DB)&&await hash(cookie)===share.session_hash)
 const params=Object.fromEntries(new URL(request.url).searchParams);const embedded=params.embed==='1';need(!embedded||share.embed_origin,'Embedding is not authorized for this invitation',403);const options=JSON.parse(row.options),optionId=progress?.choice?.optionId??params.optionId??options[0].id,selection=offerSelection(options,row.deposit_bps,optionId,progress?.choice?.items??reviewItems(params),row);return{embedded,progress,share,row,verified,token,optionId,selection,expiry:await expiryFor(env.DB,row)}
}
export async function clientView(env:Bindings,c:Awaited<ReturnType<typeof clientContext>>){const previous=c.row.previous_sent_revision?await env.DB.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=?').bind(c.row.id,c.row.previous_sent_revision).first<any>():null;const a=await env.DB.prepare('SELECT a.*,f.method AS verification_method FROM p_acceptances a LEFT JOIN p_signature_facts f ON f.proposal_id=a.proposal_id WHERE a.proposal_id=?').bind(c.row.id).first<any>(),accepted=a?JSON.parse(a.snapshot).selection:undefined,items=a?accepted?.items??[]:c.selection.items;const content=recipientContent({...selectedContent(snapshot(c.row),a?.option_id??c.optionId,items),status:c.row.status},c.progress);return{clientLocale:clientLocale(c.row),verificationRequired:Boolean(c.progress),embedded:c.embedded,embedOrigin:c.embedded?c.share.embed_origin:null,recipientProgress:c.verified?c.progress:c.progress?{...c.progress,signatures:[],ownFields:undefined}:null,tracking:await trackingSettings(env.DB),certificateAvailable:Boolean(a&&await env.DB.prepare('SELECT 1 FROM p_signature_facts WHERE proposal_id=?').bind(c.row.id).first()),verificationMethod:await signerMethod(env.DB,c.row.id,c.row.revision),collection:await collectionView(env.DB,c.row.id,a),externalContentEnabled:!(await trackingSettings(env.DB)).enabled&&Boolean((await workspaceDefaults(env.DB)).externalContentEnabled),reminderOptedOut:c.verified?Boolean(await env.DB.prepare('SELECT 1 FROM p_reminder_optouts WHERE proposal_id=? AND revision=? AND recipient=?').bind(c.row.id,c.row.revision,c.row.clientEmail).first()):false,...await clientQuestionState(env.DB,c),...await suggestionState(env.DB,c.row.id,c.row.revision),...content,selection:a?accepted??undefined:c.selection,selectedOptionId:a?.option_id??c.optionId,pdfDownloadsEnabled:await pdfEnabled(env.DB,c.row.id),previous:previous?selectedContent(JSON.parse(previous.snapshot),a?.option_id??c.optionId,items):undefined,expiry:c.expiry,timeZone:await installationZone(env.DB),status:c.expiry.expired?'expired':c.row.status,verified:c.verified,clientEmail:c.verified?c.row.clientEmail:c.row.clientEmail.replace(/^(.).*(@.*)$/, '$1***$2'),...(a&&c.verified?{acceptance:{...acceptanceView(a),...paperView(await paperRow(env.DB,c.row.id),false)}}:{})}}
export const codeMail=(code:string,title:string,locale:ClientLocale='en'):[string,string]=>[clientText('Your Platter verification code',locale),clientText('Your verification code is ',locale)+code+clientText('. It expires in 10 minutes.',locale)+'\n'+clientText('Proposal: ',locale)+title]
// The frozen terms a client accepts: the chosen option, its deposit and the approved offer.
export function acceptanceTerms(row:any,optionId:unknown,input:Record<string,any>={},at=Date.now()){const selection=offerSelection(JSON.parse(row.options),row.deposit_bps,optionId,selectionItems(input),row),{option,deposit}=selection;assertDiscountDates([option],at);return{option,deposit,frozen:{...agreementContent(snapshot(row),option.id,selection.items),...(selection.paymentSchedule?{paymentSchedule:selection.paymentSchedule}:{}),...(option.optionalItems?.length||selection.discountCents||selection.fees||selection.tax?{selection:{...(selection.tax?{tax:selection.tax}:{}),...(option.concealDiscount?{concealDiscount:true}:{}),...(selection.fees?{fees:selection.fees}:{}),optionId:option.id,items:selection.items,totalCents:option.cents,depositCents:deposit,...(selection.discountCents?{grossCents:selection.grossCents,discountCents:selection.discountCents,discountBps:selection.discountBps}:{})}}:{}),clientName:row.clientName,clientEmail:row.clientEmail,approvedBy:row.approved_by,approvedAt:row.approved_at},consent:selection.paymentSchedule?'I accept the selected option, scope, deposit and payment schedule.':'I accept the selected option, scope and deposit.'}}
export const acceptanceView=(a:any)=>({...JSON.parse(a.snapshot).language?{language:JSON.parse(a.snapshot).language}:{},...a.verification_method?{verificationMethod:a.verification_method}:{},name:a.name,email:a.email,optionId:a.option_id,totalCents:a.total_cents,depositCents:a.deposit_cents,acceptedAt:a.accepted_at,revision:a.revision,currency:a.currency??'AUD',...(JSON.parse(a.snapshot).paymentSchedule?{paymentSchedule:JSON.parse(a.snapshot).paymentSchedule}:{}),...(JSON.parse(a.snapshot).fieldValues?{fieldValues:JSON.parse(a.snapshot).fieldValues}:{}),...(JSON.parse(a.snapshot).selection?{selection:JSON.parse(a.snapshot).selection}:{})})
async function atomic(env:Bindings,c:any,writes:D1PreparedStatement[],condition:string,values:any[],completed=false){try{await env.DB.batch([env.DB.prepare(`INSERT INTO p_guard(ok) VALUES((EXISTS(SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id WHERE s.token=? AND s.revision=p.revision AND p.status IN (${completed?"'sent','accepted'":"'sent'"}) AND ${condition})))`).bind(c.token,...values),...writes,env.DB.prepare('DELETE FROM p_guard')])}catch(e){if(String(e).includes('CHECK constraint')||String(e).includes('UNIQUE constraint'))fail('The proposal or verification changed. Reload before continuing.',409);throw e}}
export async function clientCommand(env:Bindings,c:Awaited<ReturnType<typeof clientContext>>,name:string,p:Record<string,unknown>){const{row,share}=c,db=env.DB,at=await currentTime(env.DB)
 if(c.progress&&['accept','decline','payment.refresh'].includes(name))need(['signer','countersigner'].includes(c.progress.recipient.role),'This recipient role cannot sign, decline or pay',403)
 if(name==='recipient.approve'){need(c.progress?.recipient.role==='approver','Only this client approver may approve',403);return multiRecipientAccept(env,c,p,at)}
 if(name==='payment.refresh'){await clientCollection(env,c,p,true);return {message:'Payment status refreshed from Stripe.'}}
 if(name==='reminder.opt-out'){
  need(c.verified,'Verify your email before opting out of reminders',401)
  need(row.status==='sent','This proposal is no longer open',409)
  await atomic(env,c,[db.prepare('INSERT INTO p_reminder_optouts(proposal_id,revision,recipient,opted_out_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(row.id,row.revision,row.clientEmail,at)],"s.session_hash=? AND s.session_expires>MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0)) AND p.revision=? AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=p.id AND revision=p.revision)",[share.session_hash,at,row.revision])
  return {message:'Email reminders are stopped for this proposal revision. This does not change the proposal or your decision.'}
 }
 if(name==='decline'){
  need(c.verified,'Verify your email before declining',401)
  need(row.status==='sent','An accepted agreement cannot be declined',409)
  need(Number(p.revision)===row.revision,'This revision changed. Reload before declining.',409)
  const reason=text(p.reason,'a decline reason',1000)
  const owner=await db.prepare("SELECT email FROM oa_operators WHERE role='owner' AND status='active' ORDER BY id LIMIT 1").first<{email:string}>()
  need(owner,'Contact the firm to decline this proposal',409)
  const actor={id:row.client_id,email:row.clientEmail,role:'client'}
  const writes=await withdrawalStatements(env,row,actor,owner.email,reason,false,at,'proposal.decline')
  writes.push(outcomeStatement(db,row,actor,'declined',reason,at))
  await atomic(env,c,writes,"s.session_hash=? AND s.session_expires>MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0)) AND p.revision=? AND NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=p.id AND revision=p.revision)",[share.session_hash,at,row.revision])
  await synchronizeOutcome(env,row.id)
  return {withdrawn:true,contact:owner.email}
 }
 if(name==='question.create')return createQuestion(env,c,p)
 if(name==='expiry.reopen')return requestReopen(env,c)
 if(name==='suggestion.create'){need(!c.expiry.expired,'This proposal has expired',409);return suggest(env,c,p)}
 if(name==='code.request'){
  need(!share.code_sent_at||share.code_sent_at<=at-60000,'Wait one minute before requesting another code',429);need(share.code_generation<10,'Code request limit reached. Contact the sender.',429)
  const method=c.progress?'mailbox code':await signerMethod(db,row.id,row.revision);if(method==='SMS code')await smsCodeContext(env,row.id)
  const code=sixDigitCode(),generation=share.code_generation+1,codeHash=await hash(`${env.SESSION_SECRET}:${share.token}:${generation}:${code}`)
  await atomic(env,c,[db.prepare('UPDATE p_shares SET code_hash=?,code_expires=?,code_attempts=0,code_generation=?,code_sent_at=?,code_method=? WHERE token=?').bind(codeHash,at+600000,generation,at,method,c.token),...(method==='mailbox code'?[queueMail(env,row.id,row.clientEmail,...codeMail(code,row.title,clientLocale(row)))]:[])],'s.code_generation=?',[share.code_generation],true);if(method==='SMS code')await deliverSmsCode(env,row.id,code);else await dispatchMail(env,row.id);return{message:method==='SMS code'?'Verification code sent by text.':'Verification code queued for your email.'}
 }
 if(name==='code.verify'){
  const code=text(p.code,'the six-digit code',6);need(/^\d{6}$/.test(code),'Enter the six-digit code');need(share.code_hash&&share.code_expires>at&&share.code_attempts<5,'Code expired, was used, or reached its attempt limit. Request another code.',401)
  const correct=await hash(`${env.SESSION_SECRET}:${share.token}:${share.code_generation}:${code}`)===share.code_hash,session=secret()
  await atomic(env,c,correct?[db.prepare('UPDATE p_shares SET code_hash=NULL,session_hash=?,session_expires=?,session_method=?,session_verified_at=? WHERE token=?').bind(await hash(session),at+86400000,share.code_method,at,c.token),db.prepare("UPDATE p_mail SET body='Verification code consumed' WHERE proposal_id=? AND recipient=? AND subject IN (?,?)").bind(row.id,row.clientEmail,...['en','es'].map(locale=>codeMail('', '', locale as ClientLocale)[0]))]:[db.prepare('UPDATE p_shares SET code_attempts=code_attempts+1 WHERE token=?').bind(c.token)],'s.code_hash=? AND s.code_attempts=? AND s.code_attempts<5 AND s.code_expires>?',[share.code_hash,share.code_attempts,at],true);need(correct,'Incorrect verification code',401)
  return{message:c.progress?'Mailbox verified. Review your recipient role below.':share.code_method==='SMS code'?'Text code verified. Choose your option and accept.':'Email verified. Choose your option and accept.',cookie:`${cookieName}=${session}; Path=/p/${c.token}; HttpOnly; SameSite=${c.embedded&&env.AUTH_ORIGIN.startsWith('https:')?'None':'Strict'}; Max-Age=86400${env.AUTH_ORIGIN.startsWith('https:')?'; Secure':''}`}
 }
 if(name==='accept'){
  if(c.progress)return multiRecipientAccept(env,c,p,at)
  need(c.verified,'Verify your email before accepting',401);const a=await db.prepare('SELECT a.*,f.method AS verification_method FROM p_acceptances a LEFT JOIN p_signature_facts f ON f.proposal_id=a.proposal_id WHERE a.proposal_id=?').bind(row.id).first<any>();if(a)return{acceptance:acceptanceView(a)}
  need(!c.expiry.expired,'This proposal has expired. Ask the firm to reopen it.',409)
  need(p.consent===true||['on','yes'].includes(String(p.consent)),'Confirm that you accept this proposal');const signer=text(p.name,'your full name',200),{option,deposit,frozen,consent}=acceptanceTerms(row,p.optionId,p,at),fieldValues=acceptanceFields(frozen.document,p,signer);const language=clientLocale(row);Object.assign(frozen,{language});const shownConsent=language==='es'?clientText('I accept the scope of work, chosen option, total price, and deposit',language)+(paymentTerms(row)?clientText(' and payment schedule',language):'')+clientText(' shown above.',language):consent;const policy=await collectionPolicy(db,row.id);if(policy.enabled)Object.assign(frozen,{collectionPolicy:policy});if(fieldValues)Object.assign(frozen,{fieldValues})
  await atomic(env,c,[db.prepare('INSERT INTO p_acceptances(proposal_id,revision,snapshot,name,email,option_id,total_cents,deposit_cents,accepted_at,consent,currency) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(row.id,row.revision,JSON.stringify(frozen),signer,row.clientEmail,option.id,option.cents,deposit,at,shownConsent,frozen.currency),db.prepare('INSERT INTO p_signature_facts(proposal_id,revision,method,verified_at,language) VALUES(?,?,?,?,?)').bind(row.id,row.revision,share.session_method,share.session_verified_at??null,language),db.prepare("UPDATE p_proposals SET status='accepted',version=version+1 WHERE id=?").bind(row.id),db.prepare('DELETE FROM p_negotiations WHERE proposal_id=?').bind(row.id),...archiveCompletion(db,row.id)],`s.session_hash=? AND s.session_expires>? AND ${expiryOpenSql('p')} AND ?>=MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0))`,[share.session_hash,at,at,discountDeadline([option]),at]);return{message:policy.enabled&&policy.completion==='required'&&deposit>0?'Your signature is retained. Complete the deposit payment below.':'Proposal accepted. Your agreed version is frozen.'}
 }
 fail('Unknown client action',404)
}

/** Each signature serializes on the offer version, so two parallel submissions
 * cannot complete a partial set or accept different package choices. */
async function multiRecipientAccept(env:Bindings,c:Awaited<ReturnType<typeof clientContext>>,p:Record<string,unknown>,at:number){
 const db=env.DB,{row,share}=c,progress=c.progress!
 need(c.verified,'Verify your own mailbox before signing',401)
 const recipient=progress.recipient
 need(requiredRecipient(recipient),'This recipient cannot sign',403)
 need(!c.expiry.expired,'This proposal has expired. Ask the firm to reopen it.',409)
 if(recipient.role==='countersigner')need(await db.prepare("SELECT 1 FROM oa_operators WHERE lower(email)=? AND role='owner' AND status='active'").bind(row.clientEmail.toLowerCase()).first(),'Only the current owner countersigns',403)
 const prior=await recipientSignatures(db,row.id,row.revision)
 need(!prior.some(s=>s.voided_at),'These signatures were voided. Ask for a new revision.',409)
 if(prior.some(s=>s.slot_id===recipient.id))return {message:'Your decision is already retained.'}
 need(row.status==='sent','This agreement is already complete',409)
 need(progress.ready,'Wait for the preceding signing group to finish',409)
 need(p.consent===true||['on','yes'].includes(String(p.consent)),'Confirm your decision')
 const signer=text(p.name,'your full name',200),{option,deposit,frozen,consent}=acceptanceTerms(row,p.optionId,p,at)
 const fieldValues=acceptanceFields(frozen.document,p,signer,recipient.id,progress.clientSlot)
 if(fieldValues)Object.assign(frozen,{fieldValues})
 const choice={optionId:option.id,totalCents:option.cents,depositCents:deposit,items:(frozen as any).selection?.items??[]}
 const previous=prior.length?JSON.parse(prior[0].snapshot):null
 need(!previous||JSON.stringify(previous.choice)===JSON.stringify(choice),'All recipients must sign the same package and quantities',409)
 const content=previous?.content??frozen,plan=recipientPlan(row)
 const complete=plan.filter(requiredRecipient).every(r=>r.id===recipient.id||prior.some(s=>s.slot_id===r.id))
 const evidence={content:{...content,...(fieldValues?{fieldValues}:{fieldValues:{}})},choice}
 const writes=[
  db.prepare('INSERT INTO p_recipient_signatures(proposal_id,revision,slot_id,role,name,email,signed_at,method,verified_at,consent,snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(row.id,row.revision,recipient.id,recipient.role,signer,row.clientEmail,at,share.session_method,share.session_verified_at,recipient.role==='approver'?'I approve this exact proposal revision.':consent,JSON.stringify(evidence)),
  db.prepare("UPDATE p_proposals SET version=version+1"+(complete?",status='accepted'":"")+" WHERE id=?").bind(row.id),
 ]
 if(complete){
  const first=prior.find(s=>s.role==='signer')??{name:signer,email:row.clientEmail,method:share.session_method,verified_at:share.session_verified_at,consent}
  const signatures=[...prior.map(s=>({name:s.name,email:s.email,role:s.role,slotId:s.slot_id,signedAt:s.signed_at,method:s.method,verifiedAt:s.verified_at,consent:s.consent})),{name:signer,email:row.clientEmail,role:recipient.role,slotId:recipient.id,signedAt:at,method:share.session_method,verifiedAt:share.session_verified_at,consent}]
  const policy=await collectionPolicy(db,row.id)
  const combinedFields=Object.assign({},...prior.map(s=>JSON.parse(s.snapshot).content.fieldValues??{}),fieldValues??{})
  const final={...content,...(Object.keys(combinedFields).length?{fieldValues:combinedFields}:{}),signatures,...(policy.enabled?{collectionPolicy:policy}:{})}
  writes.push(db.prepare('INSERT INTO p_acceptances(proposal_id,revision,snapshot,name,email,option_id,total_cents,deposit_cents,accepted_at,consent,currency) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(row.id,row.revision,JSON.stringify(final),first.name,first.email,choice.optionId,choice.totalCents,choice.depositCents,at,first.consent,content.currency),
   db.prepare('INSERT INTO p_signature_facts(proposal_id,revision,method,verified_at) VALUES(?,?,?,?)').bind(row.id,row.revision,first.method,first.verified_at),
   db.prepare('DELETE FROM p_negotiations WHERE proposal_id=?').bind(row.id),...completionMail(env,row,plan,at))
 }
 const ownerGuard=recipient.role==='countersigner'?" AND EXISTS(SELECT 1 FROM oa_operators WHERE lower(email)=? AND role='owner' AND status='active')":''
 await atomic(env,c,writes,'p.version=? AND s.slot_id=? AND s.session_hash=? AND s.session_expires>? AND '+expiryOpenSql('p')+' AND ?>=MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0))'+ownerGuard,[row.version,recipient.id,share.session_hash,at,at,discountDeadline([option]),at,...(ownerGuard?[row.clientEmail.toLowerCase()]:[])])
 if(complete)await dispatchMail(env,row.id)
 return {message:complete?'Proposal accepted. Every required signature is retained.':recipient.role==='approver'?'Your approval is retained. Waiting for the remaining recipients.':'Your signature is retained. Waiting for the remaining recipients.'}
}

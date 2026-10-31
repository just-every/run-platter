import type { Bindings } from '../auth.server'
import { operatorMail } from '../mail.server.mjs'
import { commit, email, exact, hash, need, secret, snapshot, text, type Actor } from './model'
import { currentTime, expiryDeadline } from './expiry-time'
import { unfilledVariables } from './api/variables'
import { missingMerge } from './variables'
import { resolveTemplateDelivery } from './workspace'
import { offerSelection, selectionItems } from './selection'
import { documentOf, bindDocument } from './documents/blocks'
import { publicIntakePage } from './ui/public-submissions'

const yes = (v: unknown) => v === true || v === 'yes'
const parse = (v: any) => { if(typeof v!=='string')return v; try{return JSON.parse(v)}catch{need(false,'Use valid JSON choices')} }
const pick = (v: any, keys: string[]) => Object.fromEntries(keys.filter(k => v[k] !== undefined).map(k => [k, v[k]]))
function list(value: unknown, label: string): string[] {
 const values = typeof value === 'string' ? parse(value) : value
 need(Array.isArray(values) && values.length <= 400 && values.every(v => typeof v === 'string') && new Set(values).size === values.length, 'Choose distinct ' + label)
 return values
}
const allowedText = ['title','scope','terms']
async function ownedTemplate(db: D1Database, actor: Actor, id: unknown) {
 need(actor.role === 'owner', 'Only the owner reviews public intake', 403)
 const row = await db.prepare('SELECT * FROM p_personal_templates WHERE id=? AND owner_id=?').bind(text(id, 'a personal template'), actor.id).first<any>()
 need(row, 'Choose your own personal template', 404)
 return row
}
/** Construct only the text and pricing the owner explicitly selected. Never spread source metadata. */
function project(source: any, input: Record<string, any>) {
 need(source.currency === 'USD' && !(source.recipient_plan?.length), 'Public intake requires a one-off USD template without configured recipients', 409)
 need(!source.document?.merge?.deal, 'Connected provider bindings cannot be published', 409)
 const texts = list(input.textFields ?? allowedText.filter(k => yes(input['text:'+k])), 'public text fields')
 const ids = list(input.packageIds ?? Object.keys(input).filter(k => k.startsWith('package:') && yes(input[k])).map(k => k.slice(8)), 'public packages')
 const blocks = list(input.blockIds ?? Object.keys(input).filter(k => k.startsWith('block:') && yes(input[k])).map(k => k.slice(6)), 'public blocks')
 const fields = list(input.fieldIds ?? Object.keys(input).filter(k => k.startsWith('field:') && yes(input[k])).map(k => k.slice(6)), 'visitor fields')
 need(texts.includes('title') && texts.every(k => allowedText.includes(k)) && ids.length, 'Select the title and at least one package')
 const options: any[] = ids.map(id => {
  const o = source.options.find((o: any) => o.id === id)
  need(o, 'Choose a template package')
  need(!o.tax && !o.taxable && !o.recurrence && !o.discount && !o.discountExpiresOn, 'Taxed, recurring and package-discount pricing needs manual preparation', 409)
  const optionalIds = list(input.optionalIds?.[id] ?? Object.keys(input).filter(k => k.startsWith('optional:'+id+':') && yes(input[k])).map(k => k.slice(('optional:'+id+':').length)), 'optional items')
  const optionalItems = optionalIds.map(itemId => {
   const item = o.optionalItems?.find((v: any) => v.id === itemId)
   need(item && !item.recurrence && !item.taxable, 'Choose a tax-free one-off optional item', 409)
   return pick(item, ['id','label','unitCents','min','max','quantity','editable'])
  })
  const tables = (o.tables ?? []).map((table: any) => ({ ...pick(table, ['name','subtotalCents','groups']), lines: table.lines.map((line: any) => {
   need(!line.recurrence && !line.taxable, 'Public intake requires tax-free one-off pricing', 409)
   return pick(line, ['name','description','quantity','unit','unitPrice','group','lineTotalCents','grossCents','discountBps','discountFixedCents','groupDiscountBps','groupDiscountFixedCents'])
  }) }))
  return { ...pick(o, ['id','label','cents']), ...(tables.length ? {tables} : {}), optionalItems }
 })
 const doc = documentOf(source)
 const selected = [...blocks, ...fields]
 need(new Set(selected).size === selected.length, 'Choose each public block once')
 const publicBlocks = selected.map(id => {
  const block = doc.blocks.find(b => b.id === id)
  need(block && !block.condition && !block.page, 'Choose an unconditional template block')
  if (fields.includes(id)) need(block.type === 'field' && block.recipientRole === 'client', 'Only client text, date and checkbox fields are supported')
  else need(['heading','text','terms','quote','case_study','bio'].includes(block.type), 'Choose a text-only public block')
  return pick(block, ['id','type','title','text','second','headingLevel','fieldKind','required','recipientRole'])
 })
 const terms = source.payment_terms
 need(!terms?.retainer, 'Recurring payment terms need manual preparation', 409)
 const projection: any = { title: source.title, scope: texts.includes('scope') ? source.scope : '', terms: texts.includes('terms') ? source.terms ?? '' : '', currency:'USD', deposit_bps:source.deposit_bps, options, document:{version:1,blocks:publicBlocks}, ...(terms ? {payment_terms:terms} : {}) }
 need(!unfilledVariables(projection).length && !missingMerge(source).length, 'Resolve every template variable before publication', 409)
 for (const o of options) offerSelection(options, source.deposit_bps, o.id, [], {payment_terms:terms})
 return projection
}
export async function publicIntakeCommand(env: Bindings, actor: Actor, name: string, input: Record<string, any>) {
 need(actor.role === 'owner', 'Only the owner reviews public intake', 403)
 const db = env.DB, at = await currentTime(db)
 if (name === 'public-intake.disable') {
  const row = await db.prepare('SELECT * FROM p_public_forms WHERE id=? AND owner_id=?').bind(text(input.id,'a public form'), actor.id).first<any>()
  need(row, 'Public form not found', 404)
  await commit(db, actor, [db.prepare('UPDATE p_public_forms SET disabled_at=COALESCE(disabled_at,?) WHERE id=?').bind(at,row.id),db.prepare('DELETE FROM p_public_form_authority WHERE form_id=?').bind(row.id)], true)
  return {id:row.id}
 }
 const owner = await db.prepare("SELECT version FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first<any>()
 need(owner, 'Current owner authority is required', 403)
 if (name === 'public-intake.review') {
  const template = await ownedTemplate(db,actor,input.templateId); exact(template,input)
  const projection = JSON.stringify(project(parse(template.snapshot),input)), delivery = JSON.stringify(await resolveTemplateDelivery(db,template))
  need(['days','never'].includes(parse(delivery).expiry.mode), 'Use a relative template expiry period before publication', 409)
  const cap = Number(input.submissionCap), expires = Date.parse(String(input.expiresAt))
  need(Number.isInteger(cap) && cap >= 1 && cap <= 10000, 'Choose a submission cap from 1 to 10000')
  need(Number.isFinite(expires) && expires > at && expires <= at+366*86400000, 'Choose a link expiry within the next year')
  const id = crypto.randomUUID(), digest = await hash(JSON.stringify([template.id,template.version,template.snapshot,projection,delivery,cap,expires,actor.id,owner.version]))
  await commit(db,actor,[db.prepare('INSERT INTO p_public_form_reviews(id,owner_id,owner_version,template_id,template_version,template_snapshot,projection,delivery,digest,submission_cap,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,actor.id,owner.version,template.id,template.version,template.snapshot,projection,delivery,digest,cap,expires,at)],true,{sql:'EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND version=? AND snapshot=?)',values:[template.id,template.version,template.snapshot]})
  return {publicIntakeReview:true,id,digest,projection:parse(projection),delivery:parse(delivery),submissionCap:cap,expiresAt:expires,templateVersion:template.version}
 }
 need(name === 'public-intake.publish', 'Unknown public intake action', 404)
 const review = await db.prepare('SELECT * FROM p_public_form_reviews WHERE id=? AND owner_id=?').bind(text(input.id,'a publication review'),actor.id).first<any>()
 need(review && !review.published_id && review.created_at > at-900000 && review.expires_at > at, 'Review expired or already used', 409)
 need(yes(input.consent), 'Explicitly approve the displayed public content, visitor fields, prices and limits')
 need(review.digest === input.digest && review.owner_version === owner.version, 'Reviewed bytes or publication authority changed', 409)
 const id = secret()
 await commit(db,actor,[db.prepare('INSERT INTO p_public_forms(id,template_id,template_version,template_snapshot,projection,delivery,digest,owner_id,owner_version,submission_cap,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,review.template_id,review.template_version,review.template_snapshot,review.projection,review.delivery,review.digest,actor.id,owner.version,review.submission_cap,review.expires_at,at),db.prepare('INSERT INTO p_public_form_authority(form_id,owner_version) VALUES(?,?)').bind(id,owner.version),db.prepare('UPDATE p_public_form_reviews SET published_id=? WHERE id=?').bind(id,review.id)],true,{sql:'EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND version=? AND snapshot=?) AND EXISTS(SELECT 1 FROM p_public_form_reviews WHERE id=? AND published_id IS NULL)',values:[review.template_id,review.template_version,review.template_snapshot,review.id]})
 return {id,shareUrl:env.AUTH_ORIGIN+'/intake/'+id}
}
const activeSql = `f.disabled_at IS NULL AND f.expires_at>MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0)) AND f.submitted_count<f.submission_cap
 AND EXISTS(SELECT 1 FROM p_personal_templates t WHERE t.id=f.template_id AND t.version=f.template_version AND t.snapshot=f.template_snapshot)
 AND EXISTS(SELECT 1 FROM p_public_form_authority g JOIN oa_operators o ON o.id=f.owner_id WHERE g.form_id=f.id AND g.owner_version=f.owner_version AND o.version=f.owner_version AND o.role='owner' AND o.status='active')`
async function live(db: D1Database,id: string,at: number) {
 const form = await db.prepare('SELECT f.* FROM p_public_forms f WHERE f.id=? AND '+activeSql).bind(id,at).first<any>()
 need(form, 'This public form is unavailable. Ask the firm for a new link.', 410)
 return form
}
async function atomic(db: D1Database,form: any,at: number,writes:D1PreparedStatement[],guard='1',values:any[]=[]) {
 try { await db.batch([db.prepare('INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_public_forms f WHERE f.id=? AND '+activeSql+') AND ('+guard+'))').bind(form.id,at,...values),...writes,db.prepare('DELETE FROM p_guard')]) }
 catch(error) { if (/constraint/i.test(String(error))) need(false,'This submission changed or the public form is unavailable',409); throw error }
}
function submission(projection:any,input:Record<string,any>) {
 const allowed = ['name','email','company','optionId','items',...projection.options.flatMap((o:any)=>(o.optionalItems??[]).flatMap((i:any)=>['add.'+o.id+'.'+i.id,'qty.'+o.id+'.'+i.id])),...projection.document.blocks.filter((b:any)=>b.type==='field').map((b:any)=>'field:'+b.id)]
 need(Object.keys(input).every(k=>allowed.includes(k)), 'Visitors cannot change prices, terms or unreviewed fields')
 const visitor={name:text(input.name,'your name'),email:email(input.email),company:text(input.company,'your company'),fields:{} as Record<string,any>}
 const prefix='add.'+String(input.optionId)+'.'
 need(Object.keys(input).filter(k=>k.startsWith('add.')).every(k=>k.startsWith(prefix)),'Choose optional items only for your selected package')
 const raw=input.items!==undefined?selectionItems(input):Object.keys(input).filter(k=>k.startsWith(prefix)).map(k=>({id:k.slice(prefix.length),quantity:input['qty.'+k.slice(4)]}))
 need(Array.isArray(raw)&&raw.every((i:any)=>i&&typeof i==='object'&&Object.keys(i).every(k=>['id','quantity'].includes(k))), 'Visitors cannot change item prices')
 const selection=offerSelection(projection.options,projection.deposit_bps,input.optionId,raw,{payment_terms:projection.payment_terms})
 for(const block of projection.document.blocks.filter((b:any)=>b.type==='field')) {
  const value=input['field:'+block.id]??''
  if(block.fieldKind==='checkbox'){need([true,false,'yes','no',''].includes(value),'Choose a checkbox value');visitor.fields[block.id]=yes(value);need(!block.required||yes(value),'Complete '+block.title)}
  else {need(typeof value==='string'&&value.length<=1000,'Use a short field value');need(!block.required||value.trim(),'Complete '+block.title);if(block.fieldKind==='date'&&value)need(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value,'Enter a valid date');visitor.fields[block.id]=value.trim()}
 }
 return {visitor,selection}
}
/** Intake has its own verification and no proposal, signing or sending credential. */
export async function publicIntakeResponse(request:Request,env:Bindings,readBody:(request:Request,max?:number)=>Promise<Record<string,any>>) {
 const url=new URL(request.url),match=url.pathname.match(/^\/intake\/([a-f0-9]{64})(?:\/(data\.json|challenge|submit))?$/)
 need(match,'Public form not found',404)
 const db=env.DB,at=await currentTime(db),form=await live(db,match[1],at),projection=parse(form.projection)
 if(request.method==='GET') {
  need(!match[2]||match[2]==='data.json','Method not allowed',405)
  return match[2]?Response.json({projection,submissionCap:form.submission_cap,expiresAt:form.expires_at},{headers:{'cache-control':'no-store','referrer-policy':'same-origin'}}):publicIntakePage(form.id,projection)
 }
 need(request.method==='POST'&&['challenge','submit'].includes(match[2]??''),'Method not allowed',405)
 const input=await readBody(request,30000),json=request.headers.get('content-type')?.includes('application/json')
 if(match[2]==='challenge') {
  const payload=submission(projection,input),mailbox=await hash(payload.visitor.email),token=secret(),tokenHash=await hash(token)
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0'),codeHash=await hash(env.SESSION_SECRET+':'+tokenHash+':'+code)
  const limits=await db.prepare('SELECT COUNT(*) AS n,MAX(created_at) AS last FROM p_public_intake_challenges WHERE form_id=? AND mailbox=?').bind(form.id,mailbox).first<any>()
  need(limits.n<10 && (!limits.last||limits.last<=at-60000),'Wait before requesting another code; this mailbox has bounded requests',429)
  const mailId=crypto.randomUUID(),body='Your public intake verification code is '+code+'. It expires in ten minutes. This submits an unsent draft request only.'
  await atomic(db,form,at,[db.prepare('INSERT INTO p_public_intake_challenges(token_hash,form_id,payload,mailbox,code_hash,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(tokenHash,form.id,JSON.stringify(payload),mailbox,codeHash,at,at+600000),db.prepare('INSERT INTO p_public_intake_mail(id,challenge_hash,recipient,subject,body,status,created_at) VALUES(?,?,?,?,?,?,?)').bind(mailId,tokenHash,payload.visitor.email,'Public intake verification code',body,'queued',at)],'(SELECT COUNT(*) FROM p_public_intake_challenges WHERE form_id=? AND mailbox=?)<10 AND NOT EXISTS(SELECT 1 FROM p_public_intake_challenges WHERE form_id=? AND mailbox=? AND created_at>?) AND (SELECT COUNT(*) FROM p_public_intake_challenges WHERE form_id=?)<?',[form.id,mailbox,form.id,mailbox,at-60000,form.id,Math.max(100,form.submission_cap*10)])
  if(env.AUTH_LOCAL==='true')await db.prepare("UPDATE p_public_intake_mail SET status='local' WHERE id=?").bind(mailId).run()
  else {
   const sender=operatorMail(env);need(sender,'Verification mail is not configured',503)
   const claim=await db.prepare("UPDATE p_public_intake_mail SET status='sending' WHERE id=? AND status='queued'").bind(mailId).run()
   if(claim.meta.changes)try{await live(db,form.id,await currentTime(db));const result=await sender.send({from:env.MAIL_FROM!,to:[payload.visitor.email],subject:'Public intake verification code',text:body,html:body,headers:{},deliveryId:mailId});await db.prepare('UPDATE p_public_intake_mail SET status=? WHERE id=?').bind(result.status==='accepted'?'accepted':'uncertain',mailId).run()}catch{await db.prepare("UPDATE p_public_intake_mail SET status='uncertain' WHERE id=?").bind(mailId).run();need(false,'Verification delivery is held. Contact the firm.',503)}
  }
  return json?Response.json({challenge:token,message:'Check your mailbox for a verification code.'}):publicIntakePage(form.id,projection,token)
 }
 need(Object.keys(input).every(k=>['challenge','code'].includes(k)),'Only the verification code may complete this submission')
 const tokenHash=await hash(text(input.challenge,'a verification challenge',64)),challenge=await db.prepare('SELECT * FROM p_public_intake_challenges WHERE token_hash=? AND form_id=?').bind(tokenHash,form.id).first<any>()
 need(challenge&&!challenge.consumed_at&&challenge.expires_at>at&&challenge.attempts<5,'Code expired, was used, or reached its attempt limit',401)
 const code=text(input.code,'the six-digit code',6);need(/^\d{6}$/.test(code),'Enter the six-digit code')
 const correct=await hash(env.SESSION_SECRET+':'+tokenHash+':'+code)===challenge.code_hash
 const challengeGuard='EXISTS(SELECT 1 FROM p_public_intake_challenges WHERE token_hash=? AND consumed_at IS NULL AND attempts=? AND attempts<5 AND expires_at>?)',challengeValues=[tokenHash,challenge.attempts,at]
 if(!correct){await atomic(db,form,at,[db.prepare('UPDATE p_public_intake_challenges SET attempts=attempts+1 WHERE token_hash=?').bind(tokenHash)],challengeGuard,challengeValues);need(false,'Incorrect verification code',401)}
 const payload=parse(challenge.payload),visitor=payload.visitor,selected=payload.selection
 // Revalidate stored choices against the exact reviewed projection before any business write.
 const checked=submission(projection,{...pick(visitor,['name','email','company']),optionId:selected.option.id,items:selected.items.map((i:any)=>({id:i.id,quantity:i.quantity})),...Object.fromEntries(Object.entries(visitor.fields).map(([k,v])=>['field:'+k,v]))})
 need(JSON.stringify(checked)===challenge.payload,'Reviewed submission changed',409)
 const id=crypto.randomUUID(),existing=await db.prepare('SELECT id FROM p_clients WHERE email=?').bind(visitor.email).first<any>()
 // Existing client records are never overwritten or disclosed to a visitor.
 const clientId=existing?.id??crypto.randomUUID(),delivery=parse(form.delivery),expiry=delivery.expiry,deadline=expiryDeadline(expiry.mode,expiry.period_days,expiry.expires_on,at,expiry.time_zone)
 const baseTables=selected.option.tables?.length?selected.option.tables:selected.items.length?[{name:'Package',subtotalCents:selected.baseCents,groups:[],lines:[{name:selected.option.label,description:'',quantity:'1',unit:'package',unitPrice:(selected.baseCents/100).toFixed(2),group:'',lineTotalCents:selected.baseCents}]}]:[]
 const option={...selected.option,optionalItems:[],tables:[...baseTables,...(selected.items.length?[{name:'Selected optional items',subtotalCents:selected.items.reduce((n:number,i:any)=>n+i.totalCents,0),groups:[],lines:selected.items.map((i:any)=>({name:i.label,description:'',quantity:String(i.quantity),unit:'each',unitPrice:(i.unitCents/100).toFixed(2),group:'',lineTotalCents:i.totalCents}))}]:[])]}
 const row={...projection,id,client_id:clientId,revision:1,options:[option],document:bindDocument(projection.document,clientId)}
 await atomic(db,form,at,[
  ...(existing?[]:[db.prepare('INSERT INTO p_clients(id,name,email,variable_fields) VALUES(?,?,?,?)').bind(clientId,visitor.company,visitor.email,JSON.stringify({contactName:visitor.name,custom:{}}))]),
  db.prepare("INSERT INTO p_proposals(id,client_id,title,scope,terms,version,revision,status,deposit_bps,options,prepared_by,created_at,currency,sales_owner_id,sales_owner_name,document,payment_terms) VALUES(?,?,?,?,?,1,1,'draft',?,?,?,?,?,?,?,?,?)").bind(id,clientId,row.title,row.scope,row.terms,row.deposit_bps,JSON.stringify(row.options),'public intake',at,'USD',form.owner_id,'Owner',JSON.stringify(row.document),row.payment_terms?JSON.stringify(row.payment_terms):null),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,1,?,?,?,?)').bind(id,JSON.stringify(snapshot(row)),'public intake',at,'USD'),
  db.prepare('INSERT INTO p_template_sources(proposal_id,template_id,template_version) VALUES(?,?,?)').bind(id,form.template_id,form.template_version),
  db.prepare('INSERT INTO p_proposal_defaults(proposal_id,settings) VALUES(?,?)').bind(id,JSON.stringify(delivery.settings)),
  db.prepare('INSERT INTO p_expiry(proposal_id,mode,period_days,expires_on,time_zone,sent_at,deadline_at,warning_days,owner_id) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,expiry.mode,expiry.period_days,deadline.expiresOn,expiry.time_zone,at,deadline.deadlineAt,expiry.warning_days,form.owner_id),
  db.prepare('INSERT INTO p_public_submissions(proposal_id,form_id,challenge_hash,template_version,digest,visitor,selection,submitted_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,form.id,tokenHash,form.template_version,form.digest,JSON.stringify(visitor),JSON.stringify(selected),at),
  db.prepare('UPDATE p_public_forms SET submitted_count=submitted_count+1 WHERE id=?').bind(form.id),
  db.prepare('UPDATE p_public_intake_challenges SET consumed_at=?,payload=? WHERE token_hash=?').bind(at,'{}',tokenHash),
  db.prepare("UPDATE p_public_intake_mail SET body='Verification code consumed' WHERE challenge_hash=?").bind(tokenHash),
 ],challengeGuard+' AND NOT EXISTS(SELECT 1 FROM p_public_submissions WHERE challenge_hash=?)', [...challengeValues,tokenHash])
 const receipt={message:'Your request was received. The firm must review, approve and send a proposal before you can sign. No payment was collected.',totalCents:selected.option.cents,depositCents:selected.deposit}
 return json?Response.json(receipt,{status:201}):publicIntakePage(form.id,projection,undefined,receipt)
}
export async function publicIntakeState(env:Bindings,actor:Actor) {
 if(actor.role!=='owner')return {}
 const db=env.DB,at=await currentTime(db),forms=(await db.prepare('SELECT f.id,f.template_id,f.template_version,f.submission_cap,f.submitted_count,f.expires_at,f.disabled_at,('+activeSql+') AS active FROM p_public_forms f WHERE owner_id=? ORDER BY created_at DESC').bind(at,actor.id).all<any>()).results
 return {publicForms:forms.map(f=>({...f,url:env.AUTH_ORIGIN+'/intake/'+f.id})),publicSubmissions:(await db.prepare('SELECT * FROM p_public_submissions').all<any>()).results.map(r=>({...r,visitor:parse(r.visitor),selection:parse(r.selection)})),...(env.AUTH_LOCAL==='true'?{publicIntakeMail:(await db.prepare('SELECT recipient,subject,body,status FROM p_public_intake_mail ORDER BY created_at DESC').all<any>()).results}:{})}
}

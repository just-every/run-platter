import { resolveVariables, editableVariableFields } from './variables'
import { proposalFields } from './commands'
import { documentMediaIds } from './documents/media'
import { methodsInput } from './collection-policy'
import { documentOf, bindDocument } from './documents/blocks'
import { agentDeliveryDefaults } from './reminder-message-defaults'
import { assertTemplateLocks } from './section-locks'
import { folderGuard, resourceScope, resourceEditors, requireAudienceConsent } from './folders'
import { templateDefaults, resolveTemplateDelivery, dayList } from './workspace'
import { saveTemplateCosts, startTemplateCosts } from './internal-pricing'
import type { Bindings } from '../auth.server'
import { starterTemplate } from './starter-templates'
import { copyAttachments, vendorDocuments } from './attachments'
import { currentTime } from './expiry'
import { commit, exact, need, proposal, snapshot, text, type Actor } from './model'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { installationZone } from './reports/report-state'

export async function templateState(db: D1Database, a: Actor) {
 need(['owner','admin','manager','sales','content_editor','agent','viewer','billing'].includes(a.role), 'Personal template access is required', 403)
 if(['viewer','billing'].includes(a.role))return []
 const access=resourceScope(a,'r'),rows=(await db.prepare("SELECT r.*,COALESCE(NULLIF(o.display_name,''),o.email) AS ownerName FROM p_personal_templates r JOIN oa_operators o ON o.id=r.owner_id WHERE (r.owner_id=? OR r.shared=1) AND "+access.sql+' ORDER BY r.updated_at DESC,r.id').bind(a.id,...access.values).all<any>()).results
 const search=(await db.prepare('SELECT file_id,content FROM p_attachment_search').all<any>()).results
 const locks=(await db.prepare('SELECT * FROM p_template_locks UNION ALL SELECT * FROM p_template_block_locks ORDER BY section').all<any>()).results
 const delivery=(await db.prepare('SELECT * FROM p_template_defaults').all<any>()).results
 const messages=(await db.prepare('SELECT * FROM p_template_reminder_messages').all<any>()).results
 return rows.map(row => ({reminderTemplateId:messages.some(m=>m.template_id===row.id)?messages.find(m=>m.template_id===row.id).message_id:JSON.parse(delivery.find(d=>d.template_id===row.id)?.settings??'{}').reminderTemplateId??null,deliverySources:JSON.parse(row.delivery_sources),deliveryDefaults:a.role==='agent'?agentDeliveryDefaults(JSON.parse(delivery.find(d=>d.template_id===row.id)?.settings??'{}')):JSON.parse(delivery.find(d=>d.template_id===row.id)?.settings??'{}'),lockedSections:locks.filter(l=>l.template_id===row.id).map(l=>l.section), ...row, attachmentText:(JSON.parse(row.snapshot).attachments??[]).map((f:any)=>search.find(s=>s.file_id===f.id)?.content??'').join('\n'),snapshot:JSON.parse(row.snapshot), expiry: JSON.parse(row.expiry), suggestion_sections: JSON.parse(row.suggestion_sections) }))
}

async function ownTemplate(db: D1Database, a: Actor, id: unknown, editing=false) {
 need(!String(id).startsWith('starter:'), 'Start a draft to customize a built-in starter; save your changes as a personal template', 403)
 const row = await db.prepare('SELECT * FROM p_personal_templates WHERE id=?').bind(text(id, 'a template')).first<any>()
 need(row, 'Template not found', 404)
 need(row.shared===1?(!editing||resourceEditors.includes(a.role)):row.owner_id===a.id,'This template is unavailable for this action',403)
 await folderGuard(db,a,row.folder_id,'template')
 return row
}

export async function templateCommand(env: Bindings, a: Actor, name: string, input: Record<string, unknown>) {
 need(name === 'template.save' || name === 'template.start' || name === 'template.delivery', 'Unknown template command', 404)
 need(['owner','admin','manager','sales','content_editor'].includes(a.role) || (a.role === 'agent' && name === 'template.start'), 'A person saves personal templates', 403)
 const db = env.DB, at = await currentTime(db)
 if(name==='template.delivery')return templateDeliveryCommand(db,a,input,at)
 if (name === 'template.save') {
  const source = await proposal(db, input.id)
  exact(source, input)
  const displayed = negotiatedView(source, await pendingNegotiation(db, source.id))
  need(displayed.currency === 'USD', 'Personal templates require a USD proposal; historical AUD agreements stay unchanged', 409)
  const existing = input.templateId === undefined ? null : await ownTemplate(db, a, input.templateId,true)
  if (existing) exact(existing, { version: input.templateVersion })
  const shared=existing?.shared===1||input.shared===true||input.shared==='yes'
  if(shared)need(resourceEditors.includes(a.role),'Your role cannot edit shared templates',403)
  if(shared&&existing?.shared!==1)need(input.shareConsent===true||input.shareConsent==='yes','Confirm that this content may be shared')
  const folderId=shared?(input.folderId===undefined?existing?.folder_id??null:input.folderId||null):null,folder=await folderGuard(db,a,folderId,'template'),previous=existing?await folderGuard(db,a,existing.folder_id,'template'):{sql:'1',values:[]}
  if(existing?.shared===1)await requireAudienceConsent(db,existing.folder_id,folderId,input.shareConsent)
  const templateName = text(input.name, 'a template name')
  const { id: _id, client_id: _client, revision: _revision, ...content } = snapshot(displayed)
  if(content.document)content.document=bindDocument(content.document)
  if(content.recipient_plan)content.recipient_plan=content.recipient_plan.map((r:any)=>({...r,email:null}))
  if(existing)await assertTemplateLocks(db,existing,content)
  const [pdf, savedExpiry, sections] = await Promise.all([
   db.prepare('SELECT enabled FROM p_pdf_settings WHERE proposal_id=?').bind(source.id).first<any>(),
   db.prepare('SELECT mode,period_days,expires_on,time_zone,warning_days FROM p_expiry WHERE proposal_id=?').bind(source.id).first<any>(),
   db.prepare('SELECT section FROM p_suggestion_sections WHERE proposal_id=? AND revision=? UNION ALL SELECT section FROM p_block_suggestion_sections WHERE proposal_id=? AND revision=? ORDER BY section').bind(source.id, displayed.revision,source.id,displayed.revision).all<{ section: string }>(),
  ])
  const expiry = savedExpiry ? { ...savedExpiry, expires_on: savedExpiry.mode === 'date' ? savedExpiry.expires_on : null }
   : { mode: 'never', period_days: null, expires_on: null, time_zone: await installationZone(db), warning_days: null }
  const id = existing?.id ?? crypto.randomUUID(), version = (existing?.version ?? 0) + 1
  const values = [templateName, JSON.stringify(content), pdf?.enabled === 0 ? 0 : 1, JSON.stringify(expiry), JSON.stringify(sections.results.map(s => s.section))]
  const writes = existing
   ? [db.prepare('UPDATE p_personal_templates SET name=?,snapshot=?,pdf_enabled=?,expiry=?,suggestion_sections=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(...values, at, id, existing.version)]
   : [db.prepare('INSERT INTO p_personal_templates(name,snapshot,pdf_enabled,expiry,suggestion_sections,id,owner_id,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)').bind(...values, id, a.id, at, at)]
  writes.push(db.prepare('UPDATE p_personal_templates SET shared=?,folder_id=? WHERE id=?').bind(shared?1:0,folderId,id))
  writes.push(db.prepare('INSERT OR IGNORE INTO p_template_locks(template_id,section) SELECT ?,section FROM p_proposal_locks WHERE proposal_id=?').bind(id,source.id))
  writes.push(db.prepare('INSERT OR IGNORE INTO p_template_block_locks(template_id,section) SELECT ?,section FROM p_proposal_block_locks WHERE proposal_id=?').bind(id,source.id))
  const mediaIds=documentMediaIds(documentOf(displayed))
  writes.push(db.prepare('DELETE FROM p_template_document_media WHERE template_id=?').bind(id),db.prepare('INSERT INTO p_template_document_media(template_id,file_id) SELECT ?,file_id FROM p_document_media WHERE proposal_id=? AND file_id IN ('+(mediaIds.map(()=>'?').join(',')||'NULL')+')').bind(id,source.id,...mediaIds))
  writes.push(...saveTemplateCosts(db,source.id,displayed.revision,id),...templateDefaults(db,source.id,id))
  await commit(db, a, writes, false, {
   sql: 'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?) AND '+folder.sql+' AND '+previous.sql+(existing?' AND EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND version=?)':''),
   values:[source.id,source.version,...folder.values,...previous.values,...(existing?[id,existing.version]:[])],
  })
  return { id, version }
 }

 const clientId = text(input.clientId ?? input.starterClientId, 'a client')
 const client = await db.prepare('SELECT id,name,email FROM p_clients WHERE id=?').bind(clientId).first<{ id: string; name: string; email: string }>()
 need(client, 'Client not found', 404)
 const starter = starterTemplate(input.id, client, a)
 const template = starter ? { id: starter.id, version: starter.version, pdf_enabled: 1 } : await ownTemplate(db, a, input.id)
 exact(template, input)
 const personal = starter ? null : template as any
 const access=starter?{sql:'1',values:[]}:await folderGuard(db,a,personal.folder_id,'template')
 let content = starter ? { ...starter.content, attachments: await vendorDocuments(db) } : JSON.parse(personal.snapshot)
 if(documentOf(content).merge){const fill=await resolveVariables(env,a,{...editableVariableFields(content),clientId,...(input.deal?{variableDeal:input.deal}:{})},true);content={...content,...proposalFields(fill.fields),recipient_plan:fill.fields.recipientPlan}}
 const resolved=await resolveTemplateDelivery(db,personal),expiry=resolved.expiry
 const sections: string[] = starter ? [] : JSON.parse(personal.suggestion_sections)
 need(content.currency === 'USD', 'Personal templates require USD content', 409)
 const id = crypto.randomUUID(), title = input.title === undefined || input.title === '' ? content.title : text(input.title, 'a title')
 const templateLocks=starter?[]:(await db.prepare('SELECT section FROM p_template_locks WHERE template_id=? UNION ALL SELECT section FROM p_template_block_locks WHERE template_id=?').bind(template.id,template.id).all<any>()).results.map(l=>l.section)
 need(!templateLocks.includes('title')||title===content.title,'The template title is locked',403)
 const attachments = copyAttachments(content.attachments ?? [])
 const row = { ...content, document:bindDocument(content.document,clientId), id, client_id: clientId, title, revision: 1, attachments }
 const preparer = a.role === 'agent' ? `agent:${a.keyId}` : a.email
 await commit(db, a, [
  db.prepare(`INSERT INTO p_proposals(id,client_id,title,scope,terms,version,revision,status,deposit_bps,options,
   prepared_by,created_at,currency,sales_owner_id,sales_owner_name,attachments)
   VALUES(?,?,?,?,?,1,1,'draft',?,?,?,?,?,?,?,?)`)
   .bind(id, clientId, title, row.scope, row.terms ?? '', row.deposit_bps, JSON.stringify(row.options), preparer, at, 'USD', a.id, a.email, JSON.stringify(attachments)),
  db.prepare('INSERT INTO p_template_sources(proposal_id,template_id,template_version) VALUES(?,?,?)').bind(id,template.id,template.version),
  ...(!starter?[db.prepare('INSERT INTO p_proposal_locks(proposal_id,section) SELECT ?,section FROM p_template_locks WHERE template_id=?').bind(id,template.id),db.prepare('INSERT INTO p_proposal_block_locks(proposal_id,section) SELECT ?,section FROM p_template_block_locks WHERE template_id=?').bind(id,template.id)]:[]),
  ...(!starter?[db.prepare('INSERT INTO p_document_media(proposal_id,file_id) SELECT ?,file_id FROM p_template_document_media WHERE template_id=?').bind(id,template.id)]:[]),
  ...(!starter?[startTemplateCosts(db,template.id,id)]:[]),db.prepare('INSERT INTO p_proposal_defaults(proposal_id,settings) VALUES(?,?)').bind(id,JSON.stringify(resolved.settings)),
  db.prepare('UPDATE p_proposals SET recipient_plan=? WHERE id=?').bind(JSON.stringify(row.recipient_plan??[]),id),
  db.prepare('UPDATE p_proposals SET section_conditions=?,document=?,payment_terms=? WHERE id=?').bind(JSON.stringify(row.section_conditions ?? {}),JSON.stringify(documentOf(row)),row.payment_terms?JSON.stringify(row.payment_terms):null, id),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,1,?,?,?,?)').bind(id, JSON.stringify(snapshot(row)), preparer, at, 'USD'),
  db.prepare('INSERT INTO p_pdf_settings(proposal_id,enabled) VALUES(?,?)').bind(id, template.pdf_enabled),
  db.prepare('INSERT INTO p_expiry(proposal_id,mode,period_days,expires_on,time_zone,warning_days) VALUES(?,?,?,?,?,?)').bind(id, expiry.mode, expiry.period_days, expiry.expires_on, expiry.time_zone, expiry.warning_days),
  ...sections.map(section => db.prepare(`INSERT INTO ${section.startsWith('block:')?'p_block_suggestion_sections':'p_suggestion_sections'}(proposal_id,revision,section) VALUES(?,1,?)`).bind(id, section)),
 ], false, {
  sql: (starter ? '' : 'EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND (owner_id=? OR shared=1) AND version=?) AND ') + 'EXISTS(SELECT 1 FROM p_clients WHERE id=?) AND '+access.sql,
  values: [...(starter ? [] : [template.id, a.id, template.version]), clientId,...access.values],
 })
 return { id, revision: 1, version: 1 }
}

async function templateDeliveryCommand(db:D1Database,a:Actor,p:Record<string,unknown>,at:number){
 const row=await ownTemplate(db,a,p.id,true);exact(row,p)
 const access=await folderGuard(db,a,row.folder_id,'template'),oldSources=JSON.parse(row.delivery_sources),sources:any={}
 for(const key of ['reminders','expiry','warning']){const value=p[key+'Source']??oldSources[key];need(['inherit','override'].includes(String(value)),'Choose workspace inheritance or a template override');sources[key]=value}
 const saved=await db.prepare('SELECT settings FROM p_template_defaults WHERE template_id=?').bind(row.id).first<any>(),old=saved?JSON.parse(saved.settings):(await resolveTemplateDelivery(db)).settings,expiry=JSON.parse(row.expiry)
 need(p.remindersEnabled===undefined||[true,false,'yes','no'].includes(p.remindersEnabled as any),'Choose whether reminders are on')
 const cap=p.reminderCap===undefined?old.reminderCap:Number(p.reminderCap);need(Number.isInteger(cap)&&cap>=0&&cap<=365,'Choose a reminder cap from 0 to 365')
 const nullableDays=(value:unknown,fallback:number|null)=>value===undefined?fallback:value===''||value===null?null:Number(value)
 const expiryDays=nullableDays(p.expiryDays,expiry.period_days),warningDays=nullableDays(p.warningDays,expiry.warning_days)
 for(const [label,value] of [['Expiry',expiryDays],['Warning',warningDays]] as const)need(value===null||Number.isInteger(value)&&value>=1&&value<=36500,label+' days must be from 1 to 36500, or empty')
 const methodFields=Object.keys(p).filter(k=>k.startsWith('method:'))
 const paymentMethods=methodsInput(p.paymentMethods===undefined?(p.methodsProvided==='yes'||methodFields.length?methodFields.filter(k=>p[k]==='yes').map(k=>k.slice(7)):old.paymentMethods??[]):p.paymentMethods)
 const settings={...old,paymentMethods,remindersEnabled:p.remindersEnabled===undefined?old.remindersEnabled:p.remindersEnabled===true||p.remindersEnabled==='yes',reminderDays:dayList(p.reminderDays,old.reminderDays),beforeExpiryDays:dayList(p.beforeExpiryDays,old.beforeExpiryDays),reminderCap:cap}
 const messageId=p.reminderTemplateId===undefined?undefined:String(p.reminderTemplateId)||null
 if(messageId)need(await db.prepare('SELECT 1 FROM p_reminder_templates WHERE id=?').bind(messageId).first(),'Reminder template not found',404)
 const nextExpiry={...expiry,...(p.expiryDays!==undefined?{mode:expiryDays===null?'never':'days',period_days:expiryDays,expires_on:null}:{}),warning_days:warningDays}
 await commit(db,a,[...(messageId===undefined?[]:[db.prepare('INSERT INTO p_template_reminder_messages(template_id,message_id) VALUES(?,?) ON CONFLICT(template_id) DO UPDATE SET message_id=excluded.message_id').bind(row.id,messageId)]),db.prepare('UPDATE p_personal_templates SET delivery_sources=?,expiry=?,version=version+1,updated_at=? WHERE id=?').bind(JSON.stringify(sources),JSON.stringify(nextExpiry),at,row.id),db.prepare('INSERT INTO p_template_defaults(template_id,settings) VALUES(?,?) ON CONFLICT(template_id) DO UPDATE SET settings=excluded.settings').bind(row.id,JSON.stringify(settings))],false,{sql:'EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND version=?) AND '+access.sql,values:[row.id,row.version,...access.values]})
 return {id:row.id,version:row.version+1}
}

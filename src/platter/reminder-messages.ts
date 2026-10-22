import { commit, exact, need, text, type Actor } from './model'
import { administrators } from './permissions'
import { expiryFor } from './expiry'
import { currentTime, expiryDeadline } from './expiry-time'

const plain=(value:unknown,label:string,max:number)=>{const result=text(value,label,max);need(!/\/p\/[a-f0-9]{64}/i.test(result),'Remove client invitation links from retained reminder text');return result}
export function reminderText(subject:unknown,message:unknown){const result={subject:plain(subject,'a reminder subject',200),message:plain(message,'a reminder message',10000)};need(!/[\r\n]/.test(result.subject),'The reminder subject must be one line');return result}
export async function reminderTemplates(db:D1Database,a:Actor){return ['owner','admin','manager','sales','content_editor'].includes(a.role)?(await db.prepare('SELECT * FROM p_reminder_templates ORDER BY name,id').all<any>()).results:[]}
export async function saveReminderTemplate(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins manage shared reminder messages',403)
 const old=p.id?await db.prepare('SELECT * FROM p_reminder_templates WHERE id=?').bind(text(p.id,'a reminder template')).first<any>():null
 if(p.id){need(old,'Reminder template not found',404);exact(old,p)}
 const id=old?.id??crypto.randomUUID(),name=text(p.name,'a reminder template name',100),copy=reminderText(p.subject,p.message),locked=p.locked===true||p.locked==='yes',isDefault=p.isDefault===true||p.isDefault==='yes'
 const variables=(copy.subject+'\n'+copy.message).matchAll(/\{([^{}]+)\}/g)
 for(const variable of variables)need(['client.first_name','client.company','proposal.title','sender.name','proposal.expires_on'].includes(variable[1]),'Unknown reminder variable: '+variable[1])
 await commit(db,a,[...(isDefault?[db.prepare('UPDATE p_reminder_templates SET is_default=0 WHERE is_default=1')]:[]),old?db.prepare('UPDATE p_reminder_templates SET name=?,subject=?,message=?,locked=?,is_default=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(name,copy.subject,copy.message,locked?1:0,isDefault?1:0,a.id,Date.now(),id):db.prepare('INSERT INTO p_reminder_templates(id,name,subject,message,locked,is_default,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,name,copy.subject,copy.message,locked?1:0,isDefault?1:0,a.id,Date.now())],true,{sql:old?'EXISTS(SELECT 1 FROM p_reminder_templates WHERE id=? AND version=?)':'1',values:old?[id,old.version]:[]})
 return {id,version:(old?.version??0)+1}
}
/** Values come from current scoped records or a sender-supplied first name, never an inferred identity. */
export async function fillReminder(db:D1Database,a:Actor,row:any,copy:{subject:string;message:string},firstName:unknown=''){
 const client=await db.prepare('SELECT name FROM p_clients WHERE id=?').bind(row.client_id).first<any>(),sender=await db.prepare('SELECT display_name FROM oa_operators WHERE id=?').bind(a.id).first<any>(),expiry=await expiryFor(db,row),deadline=expiryDeadline(expiry.mode,expiry.days,expiry.date,expiry.sentAt??await currentTime(db),expiry.timeZone)
 const values:Record<string,unknown>={'client.first_name':firstName,'client.company':client?.name,'proposal.title':row.title,'sender.name':sender?.display_name,'proposal.expires_on':deadline.expiresOn}
 const fill=(value:string)=>value.replace(/\{([^{}]+)\}/g,(_,key)=>{const value=values[key];need(typeof value==='string'&&value.trim(),'Fill the variable before sending: '+key);return value})
 const result=reminderText(fill(copy.subject),fill(copy.message)),missing=(result.subject+'\n'+result.message).match(/\{([^{}]+)\}/);need(!missing,'Fill the variable before sending: '+(missing?.[1]??''));return result
}
export async function reminderCopy(db:D1Database,a:Actor,row:any,p:Record<string,unknown>,old?:any){
 const defaults=await db.prepare('SELECT settings FROM p_proposal_defaults WHERE proposal_id=?').bind(row.id).first<any>(),base=defaults?JSON.parse(defaults.settings):{},saved=old?JSON.parse(old.settings).messageTemplate:null
 let selected:any=saved??(!old?base.reminderMessageTemplate:null)
 if(p.messageTemplateId!==undefined){
  const id=String(p.messageTemplateId)
  selected=id?(selected?.id===id&&p.loadTemplate!=='yes'?selected:await db.prepare('SELECT * FROM p_reminder_templates WHERE id=?').bind(id).first<any>()):null
  if(id)need(selected,'Reminder template not found',404)
 }else if(!old&&!Object.hasOwn(base,'reminderTemplateId'))selected=await db.prepare('SELECT * FROM p_reminder_templates WHERE is_default=1').first<any>()
 const raw=reminderText(p.loadTemplate==='yes'?selected?.subject??old?.subject??'Reminder: '+row.title:p.subject??selected?.subject??old?.subject??base.reminderSubject??'Reminder: '+row.title,p.loadTemplate==='yes'?selected?.message??old?.message??'Please review your proposal and verify your email before accepting.':p.message??selected?.message??old?.message??base.reminderMessage??'Please review your proposal and verify your email before accepting.')
 if(!selected){const missing=(raw.subject+'\n'+raw.message).match(/\{([^{}]+)\}/);need(!missing,'Fill the variable before sending: '+(missing?.[1]??''));return {...raw,messageTemplate:null}}
 const current=await db.prepare('SELECT locked FROM p_reminder_templates WHERE id=?').bind(selected.id).first<any>()
 const sourceSubject=selected.sourceSubject??selected.subject,sourceMessage=selected.sourceMessage??selected.message
 if((selected.locked||current?.locked)&&!administrators.includes(a.role))need(raw.subject===sourceSubject&&raw.message===sourceMessage,'This reminder template is locked; select it without editing its text',403)
 const firstName=p.clientFirstName===undefined?selected.firstName??'':String(p.clientFirstName).trim();need(firstName.length<=100&&!/[\r\n]/.test(firstName),'Enter a recipient first name up to 100 characters')
 return {...await fillReminder(db,a,row,raw,firstName),messageTemplate:{id:selected.id,name:selected.name,version:selected.version,locked:Boolean(selected.locked||current?.locked),subject:raw.subject,message:raw.message,sourceSubject,sourceMessage,firstName}}
}
export async function scheduledReminderCopy(db:D1Database,a:Actor,row:any,s:any){const template=JSON.parse(s.settings).messageTemplate;return template?fillReminder(db,a,row,template,template.firstName):{subject:s.subject,message:s.message}}

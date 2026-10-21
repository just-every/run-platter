import { commit, need, type Actor } from './model'
import { administrators } from './permissions'
import { installationZone } from './reports/report-state'
// FOLLOW-006 specifies these defaults for fresh installs and future upgraded drafts.
const initial=()=>({remindersEnabled:true,reminderDays:[2,5,9],beforeExpiryDays:[3],reminderCap:3,expiryDays:60 as number|null,warningDays:1 as number|null,paymentMethods:['card']})
export async function workspaceDefaults(db:D1Database){
 const row=await db.prepare('SELECT * FROM p_workspace_defaults WHERE singleton=1').first<any>()
 return {...(row?JSON.parse(row.settings):initial()),version:row?.version??0}
}
const delivery=(settings:any)=>({remindersEnabled:settings.remindersEnabled,reminderDays:settings.reminderDays,beforeExpiryDays:settings.beforeExpiryDays,reminderCap:settings.reminderCap,paymentMethods:settings.paymentMethods})
function dayList(value:unknown,fallback:number[]){
 let days:any=value??fallback
 if(typeof days==='string'){const source=days.trim();if(source.startsWith('[')){try{days=JSON.parse(source)}catch{need(false,'Choose reminder days')}}else days=source?source.split(',').map((v:string)=>Number(v.trim())):[]}
 need(Array.isArray(days)&&days.length<=20&&days.every((d:any)=>Number.isInteger(d)&&d>=1&&d<=365)&&new Set(days).size===days.length,'Choose distinct reminder days from 1 to 365')
 return days.toSorted((a:number,b:number)=>a-b)
}
export async function workspaceCommand(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins change workspace defaults',403)
 const old=await workspaceDefaults(db);need(Number(p.version)===old.version,'Workspace defaults changed. Reload.',409)
 const enabled=p.remindersEnabled===undefined?old.remindersEnabled:p.remindersEnabled===true||p.remindersEnabled==='yes'
 need(p.remindersEnabled===undefined||[true,false,'yes','no'].includes(p.remindersEnabled as any),'Choose whether reminders are on')
 const nullableDays=(value:unknown,fallback:number|null)=>value===undefined?fallback:value===''||value===null?null:Number(value)
 const expiry=nullableDays(p.expiryDays,old.expiryDays),warning=nullableDays(p.warningDays,old.warningDays),cap=p.reminderCap===undefined?old.reminderCap:Number(p.reminderCap)
 for(const [label,value] of [['Expiry',expiry],['Warning',warning]] as const)need(value===null||Number.isInteger(value)&&value>=1&&value<=36500,label+' days must be from 1 to 36500, or empty')
 need(Number.isInteger(cap)&&cap>=0&&cap<=365,'Choose a reminder cap from 0 to 365')
 const methodFields=Object.keys(p).filter(k=>k.startsWith('method:'))
 let methods:any=p.paymentMethods??(p.methodsProvided==='yes'||methodFields.length?methodFields.filter(k=>p[k]==='yes').map(k=>k.slice(7)):old.paymentMethods)
 if(typeof methods==='string'){try{methods=JSON.parse(methods)}catch{need(false,'Choose payment methods')}}
 need(Array.isArray(methods)&&methods.length<=4&&methods.every((m:any)=>['card','ach','apple_pay','google_pay'].includes(m))&&new Set(methods).size===methods.length,'Choose distinct supported payment methods')
 const settings={remindersEnabled:enabled,reminderDays:dayList(p.reminderDays,old.reminderDays),beforeExpiryDays:dayList(p.beforeExpiryDays,old.beforeExpiryDays),reminderCap:cap,expiryDays:expiry,warningDays:warning,paymentMethods:methods}
 await commit(db,a,[db.prepare('INSERT INTO p_workspace_defaults(singleton,settings) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET settings=excluded.settings,version=p_workspace_defaults.version+1').bind(JSON.stringify(settings))],true,{sql:'COALESCE((SELECT version FROM p_workspace_defaults WHERE singleton=1),0)=?',values:[old.version]})
 return {id:'workspace'}
}
export async function defaultStatements(db:D1Database,id:string,expiry=true){
 const defaults=await workspaceDefaults(db),writes=[db.prepare('INSERT INTO p_proposal_defaults(proposal_id,settings) VALUES(?,?)').bind(id,JSON.stringify(delivery(defaults)))]
 if(expiry&&defaults.expiryDays!==null)writes.push(db.prepare("INSERT INTO p_expiry(proposal_id,mode,period_days,time_zone,warning_days) VALUES(?,'days',?,?,?)").bind(id,defaults.expiryDays,await installationZone(db),defaults.warningDays))
 return writes
}
export const copyDefaults=(db:D1Database,from:string,to:string)=>db.prepare('INSERT INTO p_proposal_defaults(proposal_id,settings) SELECT ?,settings FROM p_proposal_defaults WHERE proposal_id=?').bind(to,from)
export const templateDefaults=(db:D1Database,id:string,template:string)=>[db.prepare('DELETE FROM p_template_defaults WHERE template_id=?').bind(template),db.prepare('INSERT INTO p_template_defaults(template_id,settings) SELECT ?,settings FROM p_proposal_defaults WHERE proposal_id=?').bind(template,id)]
export async function startDefaults(db:D1Database,template:string,id:string){
 const row=await db.prepare('SELECT settings FROM p_template_defaults WHERE template_id=?').bind(template).first<any>()
 return row?[db.prepare('INSERT INTO p_proposal_defaults(proposal_id,settings) VALUES(?,?)').bind(id,row.settings)]:defaultStatements(db,id,false)
}

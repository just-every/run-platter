import { commit, need, type Actor } from './model'
import { administrators } from './permissions'
import { installationZone } from './reports/report-state'
export async function workspaceDefaults(db:D1Database){
 const row=await db.prepare('SELECT * FROM p_workspace_defaults WHERE singleton=1').first<any>()
 return row?{reminderDays:JSON.parse(row.reminder_days),expiryDays:row.expiry_days,paymentMethods:JSON.parse(row.payment_methods),version:row.version}:{reminderDays:[],expiryDays:null,paymentMethods:['card'],version:0}
}
export async function workspaceCommand(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(administrators.includes(a.role),'Only owner and admins change workspace defaults',403)
 const old=await workspaceDefaults(db);need(Number(p.version)===old.version,'Workspace defaults changed. Reload.',409)
 let days:any=p.reminderDays??[]
 if(typeof days==='string'){const source=days.trim();if(source.startsWith('[')){try{days=JSON.parse(source)}catch{need(false,'Choose reminder days')}}else days=source?source.split(',').map((v:string)=>Number(v.trim())):[]}
 need(Array.isArray(days)&&days.length<=20&&days.every((d:any)=>Number.isInteger(d)&&d>=1&&d<=365)&&new Set(days).size===days.length,'Choose distinct reminder days from 1 to 365')
 const expiry=p.expiryDays===''||p.expiryDays==null?null:Number(p.expiryDays)
 need(expiry===null||Number.isInteger(expiry)&&expiry>=1&&expiry<=36500,'Expiry days must be from 1 to 36500, or empty')
 let methods:any=p.paymentMethods??Object.keys(p).filter(k=>k.startsWith('method:')&&p[k]==='yes').map(k=>k.slice(7))
 if(typeof methods==='string'){try{methods=JSON.parse(methods)}catch{need(false,'Choose payment methods')}}
 need(Array.isArray(methods)&&methods.length<=4&&methods.every((m:any)=>['card','ach','apple_pay','google_pay'].includes(m))&&new Set(methods).size===methods.length,'Choose distinct supported payment methods')
 await commit(db,a,[db.prepare('INSERT INTO p_workspace_defaults(singleton,reminder_days,expiry_days,payment_methods) VALUES(1,?,?,?) ON CONFLICT(singleton) DO UPDATE SET reminder_days=excluded.reminder_days,expiry_days=excluded.expiry_days,payment_methods=excluded.payment_methods,version=p_workspace_defaults.version+1').bind(JSON.stringify(days.toSorted((a:number,b:number)=>a-b)),expiry,JSON.stringify(methods))],true,{sql:'COALESCE((SELECT version FROM p_workspace_defaults WHERE singleton=1),0)=?',values:[old.version]})
 return {id:'workspace'}
}
export async function defaultStatements(db:D1Database,id:string,expiry=true){
 const defaults=await workspaceDefaults(db),writes=[db.prepare('INSERT INTO p_proposal_defaults(proposal_id,reminder_days,payment_methods) VALUES(?,?,?)').bind(id,JSON.stringify(defaults.reminderDays),JSON.stringify(defaults.paymentMethods))]
 if(expiry&&defaults.expiryDays!==null)writes.push(db.prepare("INSERT INTO p_expiry(proposal_id,mode,period_days,time_zone) VALUES(?,'days',?,?)").bind(id,defaults.expiryDays,await installationZone(db)))
 return writes
}
export const copyDefaults=(db:D1Database,from:string,to:string)=>db.prepare('INSERT INTO p_proposal_defaults(proposal_id,reminder_days,payment_methods) SELECT ?,reminder_days,payment_methods FROM p_proposal_defaults WHERE proposal_id=?').bind(to,from)
export const templateDefaults=(db:D1Database,id:string,template:string)=>[db.prepare('DELETE FROM p_template_defaults WHERE template_id=?').bind(template),db.prepare('INSERT INTO p_template_defaults(template_id,reminder_days,payment_methods) SELECT ?,reminder_days,payment_methods FROM p_proposal_defaults WHERE proposal_id=?').bind(template,id)]
export async function startDefaults(db:D1Database,template:string,id:string){
 const row=await db.prepare('SELECT * FROM p_template_defaults WHERE template_id=?').bind(template).first<any>()
 return row?[db.prepare('INSERT INTO p_proposal_defaults(proposal_id,reminder_days,payment_methods) VALUES(?,?,?)').bind(id,row.reminder_days,row.payment_methods)]:defaultStatements(db,id,false)
}

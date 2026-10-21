import { sectionConditions } from './conditional'
import { copyAttachments } from './attachments'
export interface Actor { id:string; email:string; role:'owner'|'admin'|'manager'|'sales'|'content_editor'|'viewer'|'billing'|'member'|'agent'; keyId?:string; memberVersion?:number; permission?:{sql:string;values:any[]} }
export const fail = (message:string,status=400):never => { throw Object.assign(new Error(message),{status}) }
export function need(value:unknown,message:string,status=400):asserts value { if(!value)fail(message,status) }
export function text(value:unknown,label:string,max=200) { need(typeof value==='string'&&value.trim().length>0&&value.length<=max,`Enter ${label} (up to ${max} characters)`);return value.trim() }
export const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')
export const secret=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','')
export function email(value:unknown){const v=text(value,'an email address',254).toLowerCase();need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),'Enter a valid email address');return v}
export function dollars(value:unknown,field?:string){const written=String(value??'').trim(),v=/^\$?\s*\d{1,3}(,\d{3}){1,2}(\.\d{1,2})?$/.test(written)?written.replace(/[$,\s]/g,''):written.replace(/^\$\s*/,'');if(!/^\d{1,8}(\.\d{1,2})?$/.test(v))throw Object.assign(new Error('Enter a positive price with at most two decimal places'),{status:400,field});const n=Math.round(Number(v)*100);need(n>0&&n<=1000000000,'Price must be between $0.01 and $10,000,000');return n}
export function exact(row:any,input:Record<string,unknown>){need(row.version===Number(input.version),'This proposal changed. Reload before continuing.',409)}
export function authority(db:D1Database,a:Actor,owner=false){
 if(owner)need(['owner','admin'].includes(a.role)||a.permission,'Scoped proposal authority required',403)
 const sql=a.role==='agent'?`EXISTS(SELECT 1 FROM p_agent_keys k JOIN oa_operators o ON o.id=k.owner_id WHERE k.id=? AND k.owner_id=? AND k.revoked_at IS NULL AND k.expires_at>? AND o.role='owner' AND o.status='active' AND o.version=k.owner_version)`:`EXISTS(SELECT 1 FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=? AND o.status='active' AND ${a.role==='owner'?"o.role='owner'": "o.role IN ('member','admin') AND CASE WHEN o.role='admin' THEN 'admin' ELSE COALESCE(m.role,'sales') END=? AND COALESCE(m.version,0)=?"})`
 const values:any[]=a.role==='agent'?[a.keyId!,a.id,Date.now()]:a.role==='owner'?[a.id]:[a.id,a.role,a.memberVersion??0]
 const permission=a.permission
 return db.prepare(`INSERT INTO p_guard(ok) VALUES((${sql})${permission?' AND ('+permission.sql+')':''})`).bind(...values,...(permission?.values??[]))
}
export async function commit(db:D1Database,a:Actor,writes:D1PreparedStatement[],owner=false,guard?:{sql:string,values:any[]}){
 try{await db.batch([authority(db,a,owner),...(guard?[db.prepare(`INSERT INTO p_guard(ok) VALUES((${guard.sql}))`).bind(...guard.values)]:[]),...writes,db.prepare('DELETE FROM p_guard')])}catch(e){if(String(e).includes('CHECK constraint')||String(e).includes('UNIQUE constraint')||String(e).includes('FOREIGN KEY'))fail('The record changed or is already in use. Reload before continuing.',409);throw e}
}
export async function proposal(db:D1Database,id:unknown){const row=await db.prepare('SELECT * FROM p_proposals WHERE id=?').bind(text(id,'proposal')).first<any>();need(row,'Proposal not found',404);const withdrawal=await db.prepare('SELECT id FROM p_withdrawals WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).first();return withdrawal?{...row,status:'withdrawn'}:row}
export const snapshot=(row:any)=>({id:row.id,client_id:row.client_id,title:row.title,scope:row.scope,...(Object.keys(sectionConditions(row.section_conditions)).length?{section_conditions:sectionConditions(row.section_conditions)}:{}),...(row.terms?{terms:row.terms}:{}),revision:row.revision,deposit_bps:row.deposit_bps,...(row.attachments&&row.attachments!=='[]'&&(!Array.isArray(row.attachments)||row.attachments.length)?{attachments:copyAttachments(typeof row.attachments==='string'?JSON.parse(row.attachments):row.attachments)}:{}),options:typeof row.options==='string'?JSON.parse(row.options):row.options,currency:row.currency??'AUD'})

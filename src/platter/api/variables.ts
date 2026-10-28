import type { Bindings } from '../../auth.server'
import { command } from '../commands'
import { need,proposal,snapshot,type Actor } from '../model'
import { editablePackages,pricingInput } from '../pricing'
import { editableTerms } from '../payment-terms'
const token=/\{\{\s*([A-Za-z][A-Za-z0-9_.]{0,99})\s*\}\}/g
export function unfilledVariables(value:unknown){const found=new Set<string>();const visit=(v:unknown)=>{if(typeof v==='string')for(const match of v.matchAll(token))found.add(match[1]);else if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')Object.entries(v).filter(([key])=>key!=='merge').forEach(([,item])=>visit(item))};visit(value);return [...found].sort()}
export async function fillVariables(env:Bindings,a:Actor,id:string,p:Record<string,unknown>){
 const row=await proposal(env.DB,id),source=snapshot(row),values=p.values
 if(source.document?.merge){need(['draft','approved'].includes(row.status),'Sent and accepted variables are frozen',400);return command(env,a,'proposal.variables',{id,version:p.version,values})}
 need(values&&typeof values==='object'&&!Array.isArray(values),'Provide variable values')
 const expected=unfilledVariables(source),entries=Object.entries(values as Record<string,unknown>)
 need(entries.length>0&&entries.every(([key,value])=>expected.includes(key)&&typeof value==='string'&&value.length<=10000&&!unfilledVariables(value).length),'Provide known variable names and plain text values')
 const replace=(value:any):any=>typeof value==='string'?value.replace(token,(original,key)=>Object.hasOwn(values,key)?String((values as any)[key]):original):Array.isArray(value)?value.map(replace):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,replace(item)])):value
 const filled=replace(source)
 return command(env,a,'proposal.revise',{id,version:p.version,clientId:row.client_id,title:filled.title,scope:filled.scope,terms:filled.terms??'',depositPercent:filled.deposit_bps/100,packages:editablePackages(filled.options),pricingTables:pricingInput(filled.options),sectionConditions:filled.section_conditions??{},document:filled.document,paymentTerms:editableTerms(filled)})
}

import type { Bindings } from '../auth.server'
import { providerCredential, providerJson } from './connections'
import { hubspotJson } from './crm/hubspot-request'
import { editablePackages, pricingInput } from './pricing'
import { editableTerms } from './payment-terms'
import { need, type Actor } from './model'
import { currentTime } from './expiry-time'
export const variableToken=/\{\{\s*([A-Za-z][A-Za-z0-9_.]{0,99})\s*\}\}/g
export type MergeFields={patterns:Record<string,string>;values:Record<string,string>;deal?:{provider:string;id:string};conditions?:string[]}
export function variableNames(value:unknown):string[]{const names=new Set<string>();walk(value,(v)=>{for(const m of v.matchAll(variableToken))names.add(m[1]);return v});return [...names].sort()}
function walk(value:any,fn:(v:string,path:string)=>any,path=''):any{return typeof value==='string'?fn(value,path):Array.isArray(value)?value.map((v,i)=>walk(v,fn,path+'/'+i)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>k!=='merge').map(([k,v])=>[k,walk(v,fn,path+'/'+k)])):value}
export function mergeFields(value:any):MergeFields|undefined{
 if(!value)return undefined
 need(value&&typeof value==='object'&&!Array.isArray(value)&&value.patterns&&value.values,'Invalid variable bindings')
 const patterns:Record<string,string>={},values:Record<string,string>={}
 for(const [key,v]of Object.entries(value.patterns)){need(!key.split('/').some(k=>['__proto__','constructor','prototype'].includes(k))&&/^\/(title|scope|terms|optionOne|optionTwo|priceOne|priceTwo|packages|pricingTables|document|recipientPlan)(?:\/[A-Za-z0-9_-]+)*$/.test(key)&&typeof v==='string'&&v.length<=10000&&variableNames(v).length,'Invalid variable field');patterns[key]=v}
 for(const [key,v]of Object.entries(value.values)){need(/^[A-Za-z][A-Za-z0-9_.]{0,99}$/.test(key)&&typeof v==='string'&&v.length<=10000&&!variableNames(v).length,'Use plain text variable values');values[key]=v}
 need(Object.keys(patterns).length<=500,'Use at most 500 variable fields')
 const deal=value.deal;if(deal)need(['hubspot','salesforce','orbit'].includes(deal.provider)&&typeof deal.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(deal.id),'Choose a valid linked deal')
 const conditions=value.conditions??[];need(Array.isArray(conditions)&&conditions.length<=500&&conditions.every(k=>typeof k==='string'&&/^[A-Za-z][A-Za-z0-9_.]{0,99}$/.test(k)),'Use named visibility variables')
 return {patterns,values,...(conditions.length?{conditions:[...new Set(conditions)]}:{}),...(deal?{deal:{provider:deal.provider,id:deal.id}}:{})}
}
const replace=(text:string,values:Record<string,string>)=>text.replace(variableToken,(original,key)=>Object.hasOwn(values,key)?values[key]:original)
export function editableVariableFields(row:any){return {clientId:row.client_id,title:row.title,scope:row.scope,terms:row.terms??'',depositPercent:row.deposit_bps/100,packages:editablePackages(typeof row.options==='string'?JSON.parse(row.options):row.options),pricingTables:pricingInput(typeof row.options==='string'?JSON.parse(row.options):row.options),recipientPlan:typeof row.recipient_plan==='string'?JSON.parse(row.recipient_plan):row.recipient_plan??[],sectionConditions:row.section_conditions??{},document:typeof row.document==='string'?JSON.parse(row.document):row.document,paymentTerms:editableTerms(row)}}
async function recordValues(env:Bindings,a:Actor,clientId:string,deal?:MergeFields['deal']){
 const c=await env.DB.prepare('SELECT * FROM p_clients WHERE id=?').bind(clientId).first<any>();need(c,'Client not found',404)
 const profile=JSON.parse(c.variable_fields??'{}'),sender=await env.DB.prepare('SELECT display_name FROM oa_operators WHERE id=?').bind(a.id).first<any>(),name=sender?.display_name??''
 const values:Record<string,string>={'Client.Company':c.name,'Client.Email':c.email,'Client.LastName':profile.lastName??profile.contactName?.split(' ').slice(1).join(' ')??'','Client.Name':profile.contactName??'','Client.FirstName':profile.firstName??profile.contactName?.split(' ')[0]??'','Client.Title':profile.title??'','Contact.Name':profile.contactName??'','Contact.Title':profile.title??'','Client.Address':profile.address??'','Sender.Name':name,'Sender.LastName':name.split(' ').slice(1).join(' '),'Date.Today':new Date(await currentTime(env.DB)).toISOString().slice(0,10),'Sender.FirstName':name.split(' ')[0],'Sender.Email':a.email,...Object.fromEntries(Object.entries(profile.custom??{}).map(([k,v])=>['Custom.'+k,String(v)]))}
 for(const key of Object.keys(values))if(!values[key])delete values[key]
 if(deal){
  need(['owner','admin'].includes(a.role),'Only owner and admins read connected deals',403)
  need(deal.provider!=='orbit','Orbit currently exposes deal fields but no scoped contact-read route. Its contact API is required for complete variable refill.',409)
  const {connection,secret}=await providerCredential(env,'workspace:'+deal.provider)
  if(deal.provider==='salesforce'){
   need(typeof secret.instanceOrigin==='string','Reconnect Salesforce with a verified REST instance before reading opportunities',409)
   const d=await providerJson(secret.instanceOrigin+'/services/data/v64.0/sobjects/Opportunity/'+encodeURIComponent(deal.id)+'?fields=Name,Amount,Account.Name,Account.BillingStreet',secret.token)
   if(d.Name)values['Deal.Name']=String(d.Name);if(d.Amount!==undefined&&d.Amount!==null)values['Deal.Amount']=String(d.Amount);if(d.Account?.Name)values['Client.Company']=String(d.Account.Name);if(d.Account?.BillingStreet)values['Client.Address']=String(d.Account.BillingStreet)
   const roles=await providerJson(secret.instanceOrigin+'/services/data/v64.0/query?q='+encodeURIComponent("SELECT Contact.FirstName,Contact.LastName,Contact.Title,Contact.Email FROM OpportunityContactRole WHERE OpportunityId = '"+deal.id+"' AND IsPrimary = true"),secret.token),contact=roles.records?.[0]?.Contact
   if(contact){for(const [key,v]of Object.entries({'Client.FirstName':contact.FirstName,'Client.LastName':contact.LastName,'Client.Name':[contact.FirstName,contact.LastName].filter(Boolean).join(' '),'Contact.Name':[contact.FirstName,contact.LastName].filter(Boolean).join(' '),'Contact.Title':contact.Title,'Client.Title':contact.Title,'Client.Email':contact.Email}))if(v)values[key]=String(v)}
   return values
  }
  const d=await hubspotJson(env,connection,secret.token,'https://api.hubapi.com/crm/v3/objects/deals/'+encodeURIComponent(deal.id)+'?properties=dealname,amount&associations=contacts'),props=d.properties??{}
  if(props.dealname)values['Deal.Name']=String(props.dealname)
  if(props.amount!==undefined&&props.amount!==null)values['Deal.Amount']=String(props.amount)
  const id=d.associations?.contacts?.results?.[0]?.id
  if(id){const contact=await hubspotJson(env,connection,secret.token,'https://api.hubapi.com/crm/v3/objects/contacts/'+encodeURIComponent(id)+'?properties=firstname,lastname,jobtitle,company,address,email'),p=contact.properties??{}
   for(const [key,v]of Object.entries({'Client.Company':p.company,'Client.FirstName':p.firstname,'Client.LastName':p.lastname,'Client.Name':[p.firstname,p.lastname].filter(Boolean).join(' '),'Contact.Name':[p.firstname,p.lastname].filter(Boolean).join(' '),'Client.Title':p.jobtitle,'Contact.Title':p.jobtitle,'Client.Address':p.address,'Client.Email':p.email}))if(v)values[key]=String(v)
  }
 }
 return values
}
/** Resolve only requested token fields. Original patterns survive for independent destination refills. */
export async function resolveVariables(env:Bindings,a:Actor,input:Record<string,any>,rebind=false){
 let p=structuredClone(input);for(const key of ['packages','pricingTables','document','sectionConditions'])if(typeof p[key]==='string'){try{p[key]=JSON.parse(p[key])}catch{}}
 if(!p.packages&&[p.optionOne,p.optionTwo,p.priceOne,p.priceTwo].some(v=>variableNames(v).length))p.packages=[{id:'one',label:p.optionOne,price:p.priceOne},{id:'two',label:p.optionTwo,price:p.priceTwo}]
 const old=mergeFields(p.document?.merge),patterns:Record<string,string>={},previous=old?.values??{},deal=p.variableDeal===undefined?(rebind?undefined:old?.deal):p.variableDeal||undefined
 const conditionNames=new Set<string>();walk(p,v=>{const parsed=variableCondition(v);if(parsed)conditionNames.add(parsed[1]);return v})
 if(!old&&!p.variableValues&&!p.variableDeal&&!conditionNames.size)return {fields:p,merge:undefined}
 const context=await recordValues(env,a,String(p.clientId),p.variableDeal!==undefined?deal:undefined)
 const values=rebind?{...context,...(p.variableValues??{})}:p.variableDeal!==undefined?{...previous,...context,...(p.variableValues??{})}:{...context,...previous,...(p.variableValues??{})}
 for(const [key,value]of Object.entries(values))need(typeof value==='string'&&value.length<=10000&&!variableNames(value).length,'Use plain text variable values')
 if(rebind&&old)for(const [path,pattern]of Object.entries(old.patterns)){const keys=path.slice(1).split('/');let parent=p;for(const key of keys.slice(0,-1)){if(parent[key]===undefined)break;parent=parent[key]}if(parent&&typeof parent==='object')parent[keys.at(-1)!]=pattern}
 p=walk(p,(v,path)=>{
  if(path.startsWith('/variable'))return v
  const original=old?.patterns[path],rendered=original?replace(original,previous):'',numeric=/(?:price|priceOne|priceTwo|unitPrice|quantity)$/i.test(path)
  const sameNumber=numeric&&/^-?\d+(?:\.\d+)?$/.test(rendered)&&/^-?\d+(?:\.\d+)?$/.test(v)&&Number(rendered)===Number(v)
  const retained=original&&(rebind||rendered===v||sameNumber||numeric&&variableNames(rendered).length>0)
  const pattern=retained?original:variableNames(v).length?v:undefined
  if(!pattern)return v
  patterns[path]=pattern;const filled=replace(pattern,values)
  return variableNames(filled).length&&numeric?'0.01':filled
 })
 if(!Object.keys(patterns).length&&!conditionNames.size)return {fields:p,merge:undefined}
 const used=[...new Set([...variableNames(Object.values(patterns)),...conditionNames])],merge=mergeFields({patterns,conditions:[...conditionNames],values:Object.fromEntries(Object.entries(values).filter(([k])=>used.includes(k))),...(deal?{deal}:{})})!
 p.document={...(p.document??{version:1,blocks:[]}),merge}
 return {fields:p,merge}
}
export function clientVariableFields(value:any){
 need(value&&typeof value==='object'&&!Array.isArray(value),'Use client variable fields')
 const result:Record<string,any>={}
 for(const key of ['contactName','firstName','lastName','title','address'])if(value[key]!==undefined){need(typeof value[key]==='string'&&value[key].length<=1000,'Use plain text client fields');result[key]=value[key]}
 const custom=value.custom??{};need(custom&&typeof custom==='object'&&!Array.isArray(custom)&&Object.keys(custom).length<=50,'Use at most 50 custom fields');result.custom={}
 for(const [key,v]of Object.entries(custom)){need(/^[A-Za-z][A-Za-z0-9_]{0,50}$/.test(key)&&typeof v==='string'&&v.length<=1000,'Use named plain text custom fields');result.custom[key]=v}
 return result
}
export function missingMerge(row:any){const doc=typeof row.document==='string'?JSON.parse(row.document):row.document,merge=mergeFields(doc?.merge);return merge?[...new Set([...variableNames(Object.values(merge.patterns)),...(merge.conditions??[])])].filter(k=>!Object.hasOwn(merge.values,k)):[]}

export const variableCondition=(value:string)=>/^variable:([A-Za-z][A-Za-z0-9_.]{0,99})=(.{0,200})$/.exec(value)
export function variableVisible(condition:string,values:Record<string,string>={}){const parsed=variableCondition(condition);return Boolean(parsed&&Object.hasOwn(values,parsed[1])&&values[parsed[1]]===parsed[2])}

/** Copy reviewed contact values; no provider credential or execution grant travels. */
export function copiedContactFields(contact:{name:string;firstName:string;lastName:string;title:string},address:string){
 return clientVariableFields({contactName:contact.name,firstName:contact.firstName,lastName:contact.lastName,title:contact.title,address})
}

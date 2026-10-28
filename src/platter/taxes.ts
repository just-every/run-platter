import { allocateNet, percentBps } from './discounts'
import { calendarDate } from './expiry-time'
import { commit, need, text, type Actor } from './model'

export type TaxAddress = { line1:string; city:string; region:string; postalCode:string; country:'US'; county:string; districts:string[] }
export type TaxRate = { level:'state'|'county'|'city'|'district'; region:string; jurisdiction:string; startsOn:string; bps:number }
export type TaxSnapshot = { method:'owner'; addressKind:'service'|'billing'; serviceAddress:TaxAddress; billingAddress:TaxAddress; calculatedOn:string; settingsVersion:number; components:TaxRate[] }
const parse=(value:any)=>{if(typeof value!=='string')return value;try{return JSON.parse(value)}catch{need(false,'Enter valid tax settings')}}
const key=(value:string)=>value.trim().toLowerCase()
export function taxFlags(input:any){
 const raw=input.taxable??false
 need([true,false,'yes','no'].includes(raw),'Choose whether this item is taxable')
 const taxable=raw===true||raw==='yes',taxCode=input.taxCode?text(input.taxCode,'a tax code',80):''
 need(!taxable||taxCode,'Enter a tax code for each taxable item')
 return taxable||taxCode?{taxable,taxCode}:{}
}
function address(input:any):TaxAddress {
 need(input&&typeof input==='object'&&!Array.isArray(input),'Supply both service and billing addresses')
 need(input.country==='US','Only US tax addresses are supported')
 const region=text(input.region,'a two-letter state',2).toUpperCase();need(/^[A-Z]{2}$/.test(region),'Enter a two-letter state')
 let districts=input.districts??[];if(typeof districts==='string')districts=districts.split(',').map((s:string)=>s.trim()).filter(Boolean)
 need(Array.isArray(districts)&&districts.length<=20,'Enter the applicable special districts')
 districts=districts.map((s:any)=>text(s,'a special district',100));need(new Set(districts.map(key)).size===districts.length,'Enter each special district once')
 return {line1:text(input.line1,'a street address',200),city:text(input.city,'a city',100),region,postalCode:text(input.postalCode,'a ZIP code',10),country:'US',county:input.county?text(input.county,'a county',100):'',districts}
}
export async function taxSettings(db:D1Database){const row=await db.prepare('SELECT * FROM p_tax_settings WHERE singleton=1').first<any>();return {version:row?.version??0,rates:row?JSON.parse(row.rates) as TaxRate[]:[]}}
export async function saveTaxRate(db:D1Database,a:Actor,p:Record<string,any>){
 need(a.role==='owner','Only the owner configures tax rates',403)
 const old=await taxSettings(db);need(Number(p.version)===old.version,'Tax rates changed. Reload before saving.',409)
 const level=String(p.level) as TaxRate['level'];need(['state','county','city','district'].includes(level),'Choose a jurisdiction component')
 const region=text(p.region,'a two-letter state',2).toUpperCase();need(/^[A-Z]{2}$/.test(region),'Enter a two-letter state')
 const jurisdiction=level==='state'?region:text(p.jurisdiction,'a jurisdiction',100),startsOn=calendarDate(p.startsOn),bps=percentBps(p.percent,'a tax rate')
 const rate={level,region,jurisdiction,startsOn,bps},rates=old.rates.filter(r=>!(r.level===level&&r.region===region&&key(r.jurisdiction)===key(jurisdiction)&&r.startsOn===startsOn))
 rates.push(rate)
 await commit(db,a,[db.prepare('INSERT INTO p_tax_settings(singleton,rates,version) VALUES(1,?,1) ON CONFLICT(singleton) DO UPDATE SET rates=excluded.rates,version=p_tax_settings.version+1').bind(JSON.stringify(rates))],false,{sql:'COALESCE((SELECT version FROM p_tax_settings WHERE singleton=1),0)=?',values:[old.version]})
 return {version:old.version+1}
}
/** A revision carries explicit owner-entered jurisdiction facts, never a geolocation guess. */
export async function resolveTax(db:D1Database,a:Actor,input:any,at:number):Promise<TaxSnapshot|undefined>{
 need(a.role==='owner','Only the owner selects tax addresses and methods',403)
 const p=parse(input);need(p&&typeof p==='object'&&!Array.isArray(p),'Choose a tax method')
 if(p.method==='none')return undefined
 need(p.method==='owner','Stripe Tax and AvaTax are not supported. Use owner-configured rates.',409)
 need(['service','billing'].includes(p.addressKind),'Choose the service or billing address for tax')
 const serviceAddress=address(p.serviceAddress),billingAddress=address(p.billingAddress),selected=p.addressKind==='service'?serviceAddress:billingAddress,calculatedOn=new Date(at).toISOString().slice(0,10),settings=await taxSettings(db),latest=new Map<string,TaxRate>()
 for(const r of settings.rates){
  const matches=r.region===selected.region&&(r.level==='state'||r.level==='city'&&key(r.jurisdiction)===key(selected.city)||r.level==='county'&&key(r.jurisdiction)===key(selected.county)||r.level==='district'&&selected.districts.some(d=>key(d)===key(r.jurisdiction)))
  if(!matches||r.startsOn>calculatedOn)continue
  const id=r.level+':'+key(r.jurisdiction),prior=latest.get(id);if(!prior||prior.startsOn<r.startsOn)latest.set(id,r)
 }
 const components=[...latest.values()];need(components.some(c=>c.level==='state'),'Configure an effective state rate, including an explicit zero rate, before quoting this address.',409)
 return {method:'owner',addressKind:p.addressKind,serviceAddress,billingAddress,calculatedOn,settingsVersion:settings.version,components}
}
export const optionTax=(options:any[]):TaxSnapshot|undefined=>options.find(o=>o.tax)?.tax
export function validateTaxOptions(options:any[],terms?:any){
 if(!optionTax(options))return
 need(!terms?.retainer&&!options.some(o=>o.optionalItems?.some((i:any)=>i.recurrence)||o.tables?.some((t:any)=>t.lines.some((l:any)=>l.recurrence))),'Tax on recurring pricing or retainers is not supported. Use a one-off offer.',409)
}
/** Allocate the package reduction across net lines and chosen extras before each jurisdiction rounds. */
export function selectionTax(option:any,items:any[],subtotalCents:number){
 if(!option.tax)return undefined
 const lines=(option.tables??[]).flatMap((t:any)=>t.lines),parts=[...(lines.length?lines.map((l:any)=>({label:l.name,cents:l.lineTotalCents,taxable:Boolean(l.taxable),taxCode:l.taxCode??''})):[{label:option.label,cents:option.discount?.grossCents??option.cents,taxable:Boolean(option.taxable),taxCode:option.taxCode??''}]),...items.map(i=>({label:i.label,cents:i.totalCents,taxable:Boolean(i.taxable),taxCode:i.taxCode??''}))]
 const net=allocateNet(parts.map(p=>p.cents),subtotalCents),taxableCents=parts.reduce((n,p,i)=>n+(p.taxable?net[i]:0),0)
 const components=option.tax.components.map((r:TaxRate)=>({...r,taxableCents,taxCents:Number((BigInt(taxableCents)*BigInt(r.bps)+5000n)/10000n)})),taxCents=components.reduce((n:number,r:any)=>n+r.taxCents,0)
 return {...option.tax,subtotalCents,taxableCents,taxCents,components,lines:parts.map((p,i)=>({label:p.label,taxable:p.taxable,taxCode:p.taxCode,netCents:net[i]}))}
}
export function taxLines(tax:any,currency='USD'){
 if(!tax)return []
 const money=(n:number)=>currency+' '+(n/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),a=tax.addressKind==='service'?tax.serviceAddress:tax.billingAddress
 return ['Subtotal before tax: '+money(tax.subtotalCents),'Sales tax: '+money(tax.taxCents),...tax.components.map((c:any)=>c.jurisdiction+' '+c.level+' tax ('+c.bps/100+'%): '+money(c.taxCents)), 'Tax address ('+tax.addressKind+'): '+[a.line1,a.city,a.region,a.postalCode,a.country].join(', ')]
}

export function taxRequest(p:Record<string,any>){
 if(p.tax!==undefined)return p.tax
 if(p.taxMethod===undefined||p.taxMethod==='keep')return undefined
 return {method:p.taxMethod,addressKind:p.taxAddressKind,...Object.fromEntries(['service','billing'].map(kind=>[kind+'Address',Object.fromEntries(['line1','city','region','postalCode','county','districts','country'].map(k=>[k,p['tax.'+kind+'.'+k]]))]))}
}
export const hasTaxable=(options:any[])=>options.some(o=>o.taxable||o.optionalItems?.some((i:any)=>i.taxable)||o.tables?.some((t:any)=>t.lines.some((l:any)=>l.taxable)))
export const withoutTaxAddresses=(options:any[])=>options.map(({tax,...o})=>o)

import type { Bindings } from '../auth.server'
import { exact, hash, need, snapshot, type Actor } from './model'
import { permitted } from './permissions'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { editablePackages, pricingInput } from './pricing'
import { PdfText } from './documents/pdf-text'
import { pdfFonts } from './documents/pdf-fonts'
export const costReaders=['owner','admin','manager','billing']
export interface CostPatch {key:string;cents:number}
const exactInteger=(n:bigint):number|string=>n<=BigInt(Number.MAX_SAFE_INTEGER)&&n>=BigInt(Number.MIN_SAFE_INTEGER)?Number(n):n.toString()
const marginRate=(margin:bigint,revenue:number)=>{if(revenue===0)return null;const negative=margin<0n,absolute=(negative?-margin:margin)*10000n,denominator=BigInt(revenue);return exactInteger((negative?-1n:1n)*((absolute+denominator/2n)/denominator))}
const fixed=(value:number|string)=>{const n=BigInt(value),absolute=n<0n?-n:n;return (n<0n?'-':'')+(absolute/100n).toString()+'.'+(absolute%100n).toString().padStart(2,'0')}
export const costMoney=(value:number|string,currency:string)=>currency+' '+fixed(value)
export const costPercent=(value:number|string)=>fixed(value)+'%'
export const copyCosts=(db:D1Database,source:string,from:number,destination:string,to:number)=>db.prepare('INSERT INTO p_internal_costs(proposal_id,revision,line_key,unit_cost_cents) SELECT ?,?,line_key,unit_cost_cents FROM p_internal_costs WHERE proposal_id=? AND revision=?').bind(destination,to,source,from)
export const patchCosts=(db:D1Database,id:string,revision:number,patch:CostPatch[])=>patch.map(p=>db.prepare('INSERT INTO p_internal_costs(proposal_id,revision,line_key,unit_cost_cents) VALUES(?,?,?,?) ON CONFLICT(proposal_id,revision,line_key) DO UPDATE SET unit_cost_cents=excluded.unit_cost_cents').bind(id,revision,p.key,p.cents))
export const saveTemplateCosts=(db:D1Database,id:string,revision:number,template:string)=>[db.prepare('DELETE FROM p_template_costs WHERE template_id=?').bind(template),db.prepare('INSERT INTO p_template_costs(template_id,line_key,unit_cost_cents) SELECT ?,line_key,unit_cost_cents FROM p_internal_costs WHERE proposal_id=? AND revision=?').bind(template,id,revision)]
export const startTemplateCosts=(db:D1Database,template:string,id:string)=>db.prepare('INSERT INTO p_internal_costs(proposal_id,revision,line_key,unit_cost_cents) SELECT ?,1,line_key,unit_cost_cents FROM p_template_costs WHERE template_id=?').bind(id,template)

/** Private amounts never enter the public offer snapshot or its option objects. */
export async function internalPricing(db:D1Database,row:any,a:Actor){
 if(!costReaders.includes(a.role))return undefined
 const options=typeof row.options==='string'?JSON.parse(row.options):row.options
 if(!options.some((o:any)=>o.tables?.length))return undefined
 const records=(await db.prepare('SELECT line_key,unit_cost_cents FROM p_internal_costs WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).all<any>()).results
 const lines:any[]=[]
 for(const option of options)for(const [ti,table] of (option.tables??[]).entries())for(const [li,line] of table.lines.entries()){
  const key=await hash(JSON.stringify([option.id,ti,li,table.name,line.name,line.description,line.unit])),record=records.find(r=>r.line_key===key),unitCostCents=record?.unit_cost_cents??null
  const [whole,fraction='']=String(line.quantity).split('.'),mills=BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'))
  const extended=unitCostCents===null?null:(BigInt(unitCostCents)*mills+500n)/1000n
  need(extended===null||extended<=BigInt(Number.MAX_SAFE_INTEGER),'Internal cost exceeds the supported range')
  const costCents=extended===null?null:Number(extended),marginCents=costCents===null?null:line.lineTotalCents-costCents
  lines.push({key,optionId:option.id,option:option.label,table:table.name,tableIndex:ti,lineIndex:li,name:line.name,quantity:line.quantity,unit:line.unit,revenueCents:line.lineTotalCents,unitCostCents,costCents,marginCents,marginBps:marginCents===null?null:marginRate(BigInt(marginCents),line.lineTotalCents)})
 }
 const packages=options.map((o:any)=>{const rows=lines.filter(l=>l.optionId===o.id),known=rows.length>0&&rows.every(l=>l.costCents!==null),cost=known?rows.reduce((n,l)=>n+BigInt(l.costCents),0n):null,margin=cost===null?null:BigInt(o.cents)-cost;return {id:o.id,label:o.label,revenueCents:o.cents,costCents:cost===null?null:exactInteger(cost),marginCents:margin===null?null:exactInteger(margin),marginBps:margin===null?null:marginRate(margin,o.cents)}})

 return {lines,packages}
}

export async function saveCost(env:Bindings,a:Actor,p:Record<string,unknown>,revise:(fields:Record<string,unknown>,patch:CostPatch[])=>Promise<unknown>){
 need(costReaders.includes(a.role),'Your role cannot read or change internal costs',403)
 const original=await permitted(env.DB,a,p.id,'edit');exact(original,p)
 const row=negotiatedView(original,await pendingNegotiation(env.DB,original.id))
 need(['draft','approved'].includes(row.status),'Change costs on an unsent draft or negotiated revision',409)
 const detail=await internalPricing(env.DB,row,a),line=detail?.lines.find(l=>l.key===p.lineKey)
 need(line,'Choose a current pricing line')
 const written=String(p.unitCost??'');need(/^\d{1,8}(\.\d{1,2})?$/.test(written),'Enter a nonnegative unit cost with at most two decimal places')
 const cents=Math.round(Number(written)*100);need(cents<=1000000000,'Unit cost must not exceed $10,000,000')
 const publicOffer=snapshot(row)
 return revise({id:row.id,version:original.version,clientId:row.client_id,title:row.title,scope:row.scope,terms:row.terms??'',sectionConditions:publicOffer.section_conditions??{},depositPercent:row.deposit_bps/100,packages:editablePackages(publicOffer.options),pricingTables:pricingInput(publicOffer.options)},[{key:line.key,cents}])
}

/** A separately authorized internal PDF; public offer PDFs never call this renderer. */
export async function internalPricingPdf(env:Bindings,a:Actor,query:URLSearchParams){
 need(costReaders.includes(a.role),'Your role cannot export internal pricing',403)
 const original=await permitted(env.DB,a,query.get('id')),row=negotiatedView(original,await pendingNegotiation(env.DB,original.id))
 need(Number(query.get('revision'))===row.revision,'This revision changed. Reload before exporting.',409)
 const detail=await internalPricing(env.DB,row,a);need(detail,'This proposal has no pricing-table lines',409)
 const pdf=await PdfText.create(row.revision,await pdfFonts(env)),money=(n:number|string)=>costMoney(n,row.currency)
 pdf.document.setTitle('Internal pricing: '+row.title);pdf.document.setSubject('Internal use only')
 pdf.text('Internal pricing — firm use only',20);pdf.text(row.title,16);pdf.text('Revision '+row.revision)
 for(const line of detail.lines){pdf.heading(line.option+' / '+line.table+' / '+line.name);pdf.text('Revenue: '+money(line.revenueCents));pdf.text(line.costCents===null?'Cost and margin not recorded':`Internal cost: ${money(line.costCents)}; margin: ${money(line.marginCents)}${line.marginBps===null?'':` (${costPercent(line.marginBps)})`}`)}
 return new Response(new Uint8Array(await pdf.document.save()).buffer,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="internal-pricing.pdf"','cache-control':'no-store','x-content-type-options':'nosniff'}})
}

import { need, exact, snapshot, type Actor } from './model'
import { editableTerms } from './payment-terms'
import type { Bindings } from '../auth.server'
import { permitted } from './permissions'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { editablePackages, pricingInput } from './pricing'
import { performanceHistory } from './reports/performance'

/** Observed unit prices, not a forecast: same item, unit, currency and explicit segment. */
export function priceSuggestions(history:any[],proposal:any,segment:string) {
 if(!segment)return []
 return proposal.options.flatMap((o:any)=>(o.tables??[]).flatMap((t:any,ti:number)=>t.lines.flatMap((l:any,li:number)=>{
  if(!l.catalogId)return []
  const samples=history.filter(r=>(r.accepted||!r.won)&&r.id!==proposal.id&&r.segment===segment&&r.currency===proposal.currency).flatMap(r=>{
   const prices=r.lines.filter((v:any)=>v.catalogId===l.catalogId&&v.unit===l.unit).map((v:any)=>Math.round(Number(v.unitPrice)*100))
   return prices.length?[{id:r.id,title:r.title,outcome:r.won?'won':'lost',prices}]:[]
  }).sort((a,b)=>a.id.localeCompare(b.id))
  if(!samples.length)return []
  const prices=samples.flatMap(s=>s.prices).sort((a,b)=>a-b),n=prices.length,suggestedCents=Math.round((prices[Math.floor((n-1)/2)]+prices[Math.floor(n/2)])/2)
  return [{optionId:o.id,tableIndex:ti,lineIndex:li,catalogId:l.catalogId,name:l.name,segment,unit:l.unit,currentCents:Math.round(Number(l.unitPrice)*100),minCents:prices[0],maxCents:prices[n-1],suggestedCents,sampleSize:samples.length,examples:samples.slice(0,3).map(({prices,...s})=>({...s,minCents:Math.min(...prices),maxCents:Math.max(...prices)}))}]
 })))
}
export async function applyPriceSuggestion(env:Bindings,a:Actor,p:Record<string,unknown>,revise:(fields:any)=>Promise<any>) {
 need(a.role==='owner','Only the owner uses historical price suggestions',403)
 const original=await permitted(env.DB,a,p.id,'edit');exact(original,p)
 const current=negotiatedView(original,await pendingNegotiation(env.DB,original.id));need(['draft','approved'].includes(current.status),'Apply suggestions to an unsent draft',409)
 const client=await env.DB.prepare('SELECT segment FROM p_clients WHERE id=?').bind(current.client_id).first<any>()
 const suggestion=priceSuggestions(await performanceHistory(env.DB,a),{...current,options:snapshot(current).options},client.segment).find((s:any)=>s.optionId===p.optionId&&s.tableIndex===Number(p.tableIndex)&&s.lineIndex===Number(p.lineIndex))
 need(suggestion,'No matching historical prices are available',409);need(Number(p.suggestedCents)===suggestion.suggestedCents,'The historical suggestion changed. Reload before applying.',409)
 const content=snapshot(current),tables=pricingInput(content.options),table=tables.filter(t=>t.optionId===p.optionId)[suggestion.tableIndex]
 table.lines[suggestion.lineIndex].unitPrice=(suggestion.suggestedCents/100).toFixed(2)
 return revise({id:original.id,version:original.version,clientId:current.client_id,title:current.title,scope:current.scope,terms:current.terms??'',sectionConditions:content.section_conditions??{},document:content.document,paymentTerms:editableTerms(current),depositPercent:current.deposit_bps/100,packages:editablePackages(content.options),pricingTables:tables})
}

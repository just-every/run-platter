import { allocateNet } from '../discounts'
import { need, text } from '../model'
import { itemMapping, providerId, quickbooks, type QuickBooksAuthority } from './quickbooks'
import { canonical } from './jobs'

export function acceptedLines(snapshot:any,accepted:any) {
 const option=snapshot.options.find((o:any)=>o.id===accepted.option_id)
 need(option,'The accepted package is unavailable',409)
 const base=(option.tables??[]).flatMap((t:any)=>t.lines)
 const parts=[...(base.length?base.map((l:any)=>({...l,label:l.name,cents:l.lineTotalCents})):[{label:option.label,cents:option.discount?.grossCents??option.cents,taxable:option.taxable,taxCode:option.taxCode}]),...(snapshot.selection?.items??[]).map((i:any)=>({...i,cents:i.totalCents}))]
 const net=allocateNet(parts.map(p=>p.cents),accepted.total_cents-(snapshot.selection?.tax?.taxCents??0))
 return parts.map((p,index)=>({key:String(index),label:p.label,netCents:net[index],taxable:Boolean(p.taxable),taxCode:p.taxCode??'',incomeAccount:p.incomeAccount??'',catalogId:p.catalogId??null,recurrence:p.recurrence??null}))
}
export async function reviewedLines(authorize:QuickBooksAuthority,snapshot:any,accepted:any,input:Record<string,unknown>) {
 const sources=acceptedLines(snapshot,accepted)
 let mappings:any=input.lineMappings??sources.map(source=>({key:source.key,itemId:input['line.item.'+source.key],incomeAccountId:input['line.account.'+source.key]}))
 if(typeof mappings==='string'){try{mappings=JSON.parse(mappings)}catch{need(false,'Enter the reviewed line mappings as JSON')}}
 need(Array.isArray(mappings)&&mappings.length===sources.length,'Explicitly map each accepted line once',409)
 const lines=[]
 for(const source of sources) {
  const choices=mappings.filter((m:any)=>m?.key===source.key)
  need(choices.length===1,'Explicitly map each accepted line once',409)
  const choice=choices[0],mapping=await itemMapping(authorize,providerId(choice.itemId),providerId(choice.incomeAccountId))
  need(!source.incomeAccount||[mapping.accountId,mapping.accountName].includes(source.incomeAccount),'The mapping must retain the income account frozen from the catalog',409)
  lines.push({...source,mapping})
 }
 const tax=snapshot.selection?.tax??null
 let taxMapping:any=null
 if(tax) {
  const id=providerId(input.taxGroupId),code=(await quickbooks(authorize,'/taxcode/'+encodeURIComponent(id))).TaxCode
  need(code?.Id===id&&code.Active===true&&code.Taxable===true,'Choose an active QuickBooks sales tax group',409)
  const details=code.SalesTaxRateList?.TaxRateDetail,components=tax.components.map((c:any,index:number)=>({...c,index}))
  need(Array.isArray(details)&&details.length<=components.length&&details.length>=components.filter((c:any)=>c.bps>0).length,'The QuickBooks tax group must match every frozen jurisdiction rate',409)
  const rates=[]
  for(const detail of details) {
   const rateId=providerId(detail.TaxRateRef?.value),rate=(await quickbooks(authorize,'/taxrate/'+encodeURIComponent(rateId))).TaxRate
   need(rate?.Id===rateId&&rate.Active===true&&typeof rate.RateValue==='number','Choose active QuickBooks tax rates',409)
   const index=components.findIndex((c:any)=>Math.abs(c.bps-rate.RateValue*100)<0.000001)
   need(index>=0,'The QuickBooks tax rates differ from the immutable accepted rates',409)
   rates.push({id:rateId,name:text(rate.Name,'the tax rate name'),...components.splice(index,1)[0]})
  }
  need(components.every((c:any)=>c.bps===0),'The tax group omits an accepted jurisdiction rate',409)
  need(new Set(rates.map(r=>r.id)).size===rates.length,'The tax group repeats a rate',409)
  taxMapping={id,name:text(code.Name,'the tax group name'),rates}
 }
 return {lines,tax,taxMapping}
}
export async function recheckLines(authorize:QuickBooksAuthority,plan:any) {
 for(const line of plan.lineDetails.lines)need(canonical(await itemMapping(authorize,line.mapping.itemId,line.mapping.accountId))===canonical(line.mapping),'An accepted line mapping changed. Reconcile before issuing another invoice.',409)
 if(plan.lineDetails.taxMapping) {
  const details=await reviewedLines(authorize,{options:[{id:'accepted',tables:[{lines:plan.lineDetails.lines.map((l:any)=>({...l,name:l.label,lineTotalCents:l.netCents}))}]}],selection:{tax:plan.lineDetails.tax}},{option_id:'accepted',total_cents:plan.totalCents},{lineMappings:plan.lineDetails.lines.map((l:any)=>({key:l.key,itemId:l.mapping.itemId,incomeAccountId:l.mapping.accountId})),taxGroupId:plan.lineDetails.taxMapping.id})
  need(canonical(details.taxMapping)===canonical(plan.lineDetails.taxMapping),'The reviewed tax group changed',409)
 }
}
export function invoiceLines(plan:any,amountCents:number,amountIndex=0) {
 const details=plan.lineDetails
 if(!details)return {GlobalTaxCalculation:'NotApplicable',Line:[{Amount:amountCents/100,DetailType:'SalesItemLineDetail',Description:amountIndex?plan.schedule[amountIndex].label:'Deposit: '+plan.title,SalesItemLineDetail:{ItemRef:{value:plan.mapping.itemId},Qty:1,UnitPrice:amountCents/100,TaxCodeRef:{value:'NON'}}}]}
 let sources=details.lines
 const row=plan.schedule?.[amountIndex]
 if(row?.kind==='recurring'){sources=sources.filter((l:any)=>l.recurrence&&l.label===row.label);need(sources.length===1,'Repeated recurring line labels require explicit accounting reconciliation',409)}
 else if(row&&['milestone','balance'].includes(row.kind)&&sources.some((l:any)=>l.recurrence))sources=sources.filter((l:any)=>!l.recurrence)
 need(sources.length,'The accepted invoice has no unambiguous source lines',409)
 const amounts=plan.schedule?.map((r:any)=>r.amountCents)??[plan.depositCents,plan.totalCents-plan.depositCents]
 if(details.tax)need(amounts.reduce((sum:number,n:number)=>sum+n,0)===plan.totalCents,'Tax allocations require the complete accepted schedule',409)
 const taxParts=(details.tax?.components??[]).map((c:any)=>({...c,cents:allocateNet(amounts,c.taxCents)[amountIndex]})),taxCents=taxParts.reduce((sum:number,c:any)=>sum+c.cents,0)
 const nets=allocateNet(sources.map((l:any)=>l.netCents),amountCents-taxCents)
 need(nets.reduce((sum:number,n:number)=>sum+n,0)+taxCents===amountCents,'The invoice cannot allocate the accepted amount',409)
 const taxable=nets.reduce((sum:number,n:number,index:number)=>sum+(sources[index].taxable?n:0),0)
 return {GlobalTaxCalculation:details.tax?'TaxExcluded':'NotApplicable',Line:sources.map((l:any,index:number)=>({Amount:nets[index]/100,DetailType:'SalesItemLineDetail',Description:(amountIndex?'':'Deposit: ')+l.label,SalesItemLineDetail:{ItemRef:{value:l.mapping.itemId},Qty:1,UnitPrice:nets[index]/100,TaxCodeRef:{value:details.tax&&l.taxable?'TAX':'NON'}}})),...(details.taxMapping?{TxnTaxDetail:{TxnTaxCodeRef:{value:details.taxMapping.id},TotalTax:taxCents/100,TaxLine:details.taxMapping.rates.map((r:any)=>({Amount:taxParts[r.index].cents/100,DetailType:'TaxLineDetail',TaxLineDetail:{TaxRateRef:{value:r.id},PercentBased:true,TaxPercent:r.bps/100,NetAmountTaxable:taxable/100}}))}}:{})}
}

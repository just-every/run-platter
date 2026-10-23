import type { Bindings } from '../../auth.server'
import { permitted } from '../permissions'
import { negotiatedView, pendingNegotiation } from '../negotiation'
import { exact, dollars, need, type Actor } from '../model'
import { editablePackages, pricingInput } from '../pricing'
import { scheduleInput, type Amount } from './schedule'
export async function termsFields(env:Bindings,a:Actor,p:Record<string,unknown>){
 const original=await permitted(env.DB,a,p.id,'edit');exact(original,p)
 const row=negotiatedView(original,await pendingNegotiation(env.DB,original.id))
 need(['draft','approved'].includes(row.status),'Edit payment terms on an unsent draft',409)
 const options=typeof row.options==='string'?JSON.parse(row.options):row.options
 const amount=(kind:unknown,value:unknown):Amount=>kind==='balance'?{kind:'balance'}:kind==='percent'?{kind:'percent',bps:Math.round(Number(value)*100)}:{kind:'fixed',cents:dollars(value)}
 let schedule:any=p.paymentSchedule
 if(schedule===undefined){
  const milestones=[],recurring=[]
  for(let i=0;i<24;i++)if(p['milestoneLabel'+i])milestones.push({id:p['milestoneId'+i]||'milestone-'+i,label:p['milestoneLabel'+i],date:p['milestoneDate'+i]||null,amount:amount(p['milestoneKind'+i],p['milestoneAmount'+i])})
  for(let i=0;i<12;i++)if(p['recurringLabel'+i])recurring.push({id:p['recurringId'+i]||'retainer-'+i,label:p['recurringLabel'+i],startOn:p['recurringDate'+i],interval:'monthly',amount:amount(p['recurringKind'+i],p['recurringAmount'+i])})
  schedule={netDays:Number(p.netDays),milestones,recurring}
 }
 return{id:row.id,version:original.version,clientId:row.client_id,title:row.title,scope:row.scope,terms:row.terms??'',sectionConditions:row.section_conditions??{},depositPercent:p.depositPercent??row.deposit_bps/100,packages:editablePackages(options),pricingTables:pricingInput(options),paymentSchedule:scheduleInput(schedule)}
}

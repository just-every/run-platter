import type { Bindings } from '../auth.server'
import { need } from './model'
import { clientView, type clientContext } from './signing'
// An explicit public projection; private operator state is never serialized here.
export async function clientData(env:Bindings,c:Awaited<ReturnType<typeof clientContext>>){
 need(c.verified,'Verify your email before reading proposal data',401)
 const v:any=await clientView(env,c),line=(r:any)=>({name:r.name,description:r.description,quantity:r.quantity,unit:r.unit,unitPrice:r.unitPrice,group:r.group,lineTotalCents:r.lineTotalCents})
 const options=v.options.map((o:any)=>({id:o.id,label:o.label,cents:o.cents,...(o.tables?{tables:o.tables.map((t:any)=>({name:t.name,lines:t.lines.map(line),groups:t.groups.map((g:any)=>({name:g.name,subtotalCents:g.subtotalCents})),subtotalCents:t.subtotalCents}))}:{}),...(o.optionalItems?{optionalItems:o.optionalItems.map((i:any)=>({id:i.id,label:i.label,unitCents:i.unitCents,min:i.min,max:i.max,quantity:i.quantity,editable:i.editable}))}:{})}))
 const selected=v.selection,items=(selected?.items??[]).map((i:any)=>({id:i.id,label:i.label,quantity:i.quantity,unitCents:i.unitCents,totalCents:i.totalCents}))
 return {title:v.title,scope:v.scope,terms:v.terms??'',revision:v.revision,currency:v.currency,status:v.status,depositBps:v.deposit_bps,options,selection:{optionId:v.selectedOptionId,items,totalCents:selected?.totalCents??selected?.option?.cents,depositCents:selected?.depositCents??selected?.deposit},...(v.acceptance?{acceptance:{name:v.acceptance.name,email:v.acceptance.email,optionId:v.acceptance.optionId,totalCents:v.acceptance.totalCents,depositCents:v.acceptance.depositCents,acceptedAt:v.acceptance.acceptedAt,revision:v.acceptance.revision,currency:v.acceptance.currency}}:{})}
}

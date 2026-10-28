import { calendarDate } from './expiry-time'
import { allocateNet } from './discounts'
import { need } from './model'

export const catalogIntervals=['one-off','weekly','monthly','quarterly','annual'] as const
export function catalogInterval(input:unknown){
 need(typeof input==='string'&&(catalogIntervals as readonly string[]).includes(input),'Choose a supported catalog recurrence')
 return input as typeof catalogIntervals[number]
}
export type Recurrence={interval:'weekly'|'monthly'|'quarterly'|'annual';term:number;startsOn:string}
export function recurrenceInput(input:any):{recurrence?:Recurrence} {
 const interval=input.interval??input.recurrence?.interval
 if(!interval||interval==='one-off')return {}
 need(['weekly','monthly','quarterly','annual'].includes(interval),'Choose a supported recurring interval')
 const term=Number(input.term??input.recurrence?.term)
 need(Number.isInteger(term)&&term>=1&&term<=120,'Recurring term must be 1 to 120 installments')
 const recurrence:Recurrence={interval,term,startsOn:calendarDate(input.startsOn??input.recurrence?.startsOn)}
 calendarDate(occurrence(recurrence,term))
 return {recurrence}
}
export function occurrence(r:Recurrence,index:number):string {
 const [y,m,d]=r.startsOn.split('-').map(Number)
 if(r.interval==='weekly'){const date=new Date(Date.UTC(y,m-1,d+7*index));return date.toISOString().slice(0,10)}
 const date=new Date(Date.UTC(y,m-1+index*({monthly:1,quarterly:3,annual:12}[r.interval]),1)),last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()
 date.setUTCDate(Math.min(d,last));return date.toISOString().slice(0,10)
}
/** Allocate discounts and prepayments once; every displayed schedule uses these cents. */
export function recurringSelection(option:any,items:any[],total:number,deposit:number,terms:any) {
 const base:any[]=(option.tables??[]).flatMap((t:any)=>t.lines).map((l:any)=>({label:l.name,cents:l.lineTotalCents,recurrence:l.recurrence}))
 if(!base.length)base.push({label:option.label,cents:option.discount?.grossCents??option.cents})
 const parts=[...base,...items.map(i=>({label:i.label,cents:i.totalCents,recurrence:i.recurrence}))]
 if(!parts.some(p=>p.recurrence))return undefined
 const net=allocateNet(parts.map(p=>p.cents),total),starts=parts.filter(p=>p.recurrence).map(p=>p.recurrence.startsOn).sort(),start=starts[0]
 const until=occurrence({interval:'annual',term:1,startsOn:start},1),recurring:any[]=[],rows:any[]=[],oneOffCents=parts.reduce((n,p,i)=>n+(p.recurrence?0:net[i]),0)
 let firstYearCents=oneOffCents
 parts.forEach((p,i)=>{
  if(!p.recurrence)return
  const r=p.recurrence,amounts=allocateNet(Array(r.term).fill(1),net[i])
  recurring.push({label:p.label,...r,amountCents:amounts[0],totalCents:net[i],renewalOn:occurrence(r,r.term)})
  amounts.forEach((amountCents,index)=>{const date=occurrence(r,index);if(date<until)firstYearCents+=amountCents;rows.push({kind:'recurring',label:p.label,date,amountCents,netDays:terms?.netDays??0})})
 })
 rows.sort((a,b)=>a.date.localeCompare(b.date))
 // The existing deposit is a prepayment of the agreed term total, never an added fee.
 let credit=deposit
 const oneOffCredit=Math.min(credit,oneOffCents);credit-=oneOffCredit
 const balance=oneOffCents-oneOffCredit
 const due:any[]=[]
 if(terms?.milestones?.length){let allocated=0,bps=0;for(const m of terms.milestones){bps+=m.bps;const amount=Math.round(balance*bps/10000)-allocated;allocated+=amount;due.push({kind:'milestone',label:m.label,...(m.date?{date:m.date}:{event:m.event}),amountCents:amount,netDays:terms.netDays})}}
 else if(balance)due.push({kind:'balance',label:'One-off balance',event:'Acceptance',amountCents:balance,netDays:terms?.netDays??0})
 for(const row of rows){const applied=Math.min(credit,row.amountCents);credit-=applied;if(applied)row.prepaidCents=applied;row.amountCents-=applied}
 need(credit===0,'Deposit exceeds the agreed term value')
 return {fees:{oneOffCents,firstYearCents,termTotalCents:total,recurring},paymentSchedule:{netDays:terms?.netDays??0,rows:[{kind:'deposit',label:'Deposit',event:'Acceptance',amountCents:deposit,netDays:0},...due,...rows]}}
}
export function feeLines(fees:any,currency:string):string[] {
 if(!fees)return []
 const money=(n:number)=>currency+' '+(n/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
 return ['One-off total: '+money(fees.oneOffCents),...fees.recurring.map((r:any)=>money(r.amountCents)+' per '+({weekly:'week',monthly:'month',quarterly:'quarter',annual:'year'}[r.interval as Recurrence['interval']])+' · '+r.label+' · '+r.term+' installments from '+r.startsOn+' · renewal date '+r.renewalOn),'First-year value: '+money(fees.firstYearCents)]
}

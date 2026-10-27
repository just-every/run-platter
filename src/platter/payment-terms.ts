import { dollars, need, text } from './model'

/** Absent terms stay absent, including in historical AUD snapshots. */
export function paymentTerms(row:any):any {
 const value=row?.payment_terms
 return typeof value==='string'?JSON.parse(value):value??null
}
const bps=(v:unknown)=>{const s=String(v??'');need(/^\d+(\.\d{1,2})?$/.test(s),'Enter a percentage with at most two decimals');const n=Math.round(Number(s)*100);need(n>0&&n<=10000,'Percentage must be above zero and at most 100');return n}
const day=(v:unknown)=>{const s=String(v??'');need(/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s&&s>='0100-01-01'&&s<='9998-12-31','Enter a valid schedule date');return s}
export function scheduleInput(p:Record<string,any>):any {
 if(p.scheduleEnabled==='no')return null
 let v=p.paymentTerms
 if(p.scheduleEnabled==='yes')v={depositFixed:p.depositKind==='fixed'?p.depositAmount:null,netDays:p.netDays,milestones:Array.from({length:12},(_,i)=>i+1).filter(i=>p['milestoneLabel'+i]).map(i=>({label:p['milestoneLabel'+i],percent:p['milestonePercent'+i],...(p['milestoneKind'+i]==='event'?{event:p['milestoneWhen'+i]}:{date:p['milestoneWhen'+i]})})),retainer:p.retainerPercent?{percent:p.retainerPercent,startsOn:p.retainerStartsOn,months:p.retainerMonths}:null}
 if(v===undefined||v===null||v==='')return null
 if(typeof v==='string'){try{v=JSON.parse(v)}catch{need(false,'Invalid payment terms')}}
 need(v&&typeof v==='object'&&!Array.isArray(v),'Invalid payment terms')
 need([15,30].includes(Number(v.netDays)),'Choose net 15 or net 30')
 need(Array.isArray(v.milestones)&&v.milestones.length<=12,'Use at most twelve milestones')
 const milestones=v.milestones.map((m:any)=>{need(m&&typeof m==='object'&&Boolean(m.date)!==Boolean(m.event),'Give each milestone a date or event');return{label:text(m.label,'a milestone label'),bps:bps(m.percent),...(m.date?{date:day(m.date)}:{event:text(m.event,'a milestone event')})}})
 need(!milestones.length||milestones.reduce((n:number,m:any)=>n+m.bps,0)===10000,'Milestones must allocate 100% of the balance after the deposit')
 const r=v.retainer;let retainer=null
 if(r){const months=Number(r.months);need(Number.isInteger(months)&&months>=1&&months<=120,'Retainer must last 1 to 120 months');retainer={bps:bps(r.percent),startsOn:day(r.startsOn),months}}
 return{netDays:Number(v.netDays),depositFixedCents:v.depositFixed?dollars(v.depositFixed):null,milestones,retainer}
}
export function editableTerms(row:any):any {
 const t=paymentTerms(row);return t?{netDays:t.netDays,depositFixed:t.depositFixedCents==null?null:(t.depositFixedCents/100).toFixed(2),milestones:t.milestones.map(({bps,...m}:any)=>({...m,percent:bps/100})),retainer:t.retainer?{percent:t.retainer.bps/100,startsOn:t.retainer.startsOn,months:t.retainer.months}:null}:null
}
export function depositCents(total:number,bps:number,terms:any):number {return paymentTerms(terms)?.depositFixedCents??Math.round(total*bps/10000)}
export function paymentSchedule(total:number,deposit:number,t:any):any {
 if(!t)return undefined
 need(deposit<=total,'The fixed deposit exceeds the selected package total')
 const rows:any[]=[{kind:'deposit',label:'Deposit',event:'Acceptance',amountCents:deposit,netDays:0}]
 const balance=total-deposit;let allocated=0,allocatedBps=0
 for(const [i,m] of t.milestones.entries()){allocatedBps+=m.bps;const amount=Math.round(balance*allocatedBps/10000)-allocated;allocated+=amount;rows.push({kind:'milestone',label:m.label,...(m.date?{date:m.date}:{event:m.event}),amountCents:amount,netDays:t.netDays})}
 if(t.retainer){const r=t.retainer,[y,m,d]=r.startsOn.split('-').map(Number),amount=Math.round(total*r.bps/10000);for(let i=0;i<r.months;i++){const month=new Date(Date.UTC(y,m-1+i,1));const last=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();month.setUTCDate(Math.min(d,last));rows.push({kind:'retainer',label:'Monthly retainer',date:month.toISOString().slice(0,10),amountCents:amount,netDays:t.netDays})}}
 return {netDays:t.netDays,rows}
}
export function scheduleLines(schedule:any,currency:string):string[]{return schedule.rows.map((r:any)=>`${r.label}: ${currency} ${(r.amountCents/100).toFixed(2)} · ${r.date??r.event}${r.prepaidCents?` · deposit credit ${currency} ${(r.prepaidCents/100).toFixed(2)}`:""} · net ${r.netDays}`)}

import { need, text } from '../model'
import { offerSelection } from '../selection'
export type Amount = {kind:'percent';bps:number}|{kind:'fixed';cents:number}|{kind:'balance'}
export type Schedule = {netDays:number;milestones:{id:string;label:string;amount:Amount;date:string|null}[];recurring:{id:string;label:string;amount:Amount;startOn:string;interval:'monthly'}[]}
export function calendar(value:unknown){const v=text(value,'a calendar date',10);need(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v,'Use a valid YYYY-MM-DD date');need(v>='0100-01-01'&&v<='9998-12-31','Choose a date between years 0100 and 9998');return v}
export function scheduleInput(value:unknown):Schedule|null {
 if(value===undefined||value===null||value==='')return null
 let v:any=value;if(typeof v==='string'){try{v=JSON.parse(v)}catch{need(false,'Use valid payment schedule JSON')}}
 need(v&&typeof v==='object'&&!Array.isArray(v),'Provide payment terms')
 const netDays=Number(v.netDays);need(Number.isInteger(netDays)&&netDays>=0&&netDays<=365,'Net terms must be 0 to 365 days')
 need(Array.isArray(v.milestones)&&v.milestones.length<=24&&Array.isArray(v.recurring)&&v.recurring.length<=12,'Use at most 24 milestones and 12 recurring amounts')
 const ids=new Set(['deposit'])
 const amount=(a:any,recurring=false):Amount=>{need(a&&typeof a==='object','Provide an amount');if(a.kind==='percent'){need(Number.isInteger(a.bps)&&a.bps>0&&a.bps<=10000,'Use a percentage from 0.01 to 100');return{kind:'percent',bps:a.bps}}if(a.kind==='fixed'){need(Number.isSafeInteger(a.cents)&&a.cents>0&&a.cents<=1000000000,'Use positive integer cents');return{kind:'fixed',cents:a.cents}}need(!recurring&&a.kind==='balance','Choose fixed, percent or remaining balance');return{kind:'balance'}}
 const identity=(a:any)=>{need(a&&typeof a==='object','Provide a scheduled amount');const id=text(a.id,'a schedule id',80);need(/^[A-Za-z0-9_-]+$/.test(id)&&!ids.has(id),'Use distinct schedule ids');ids.add(id);return{id,label:text(a.label,'a schedule label',200)}}
 const milestones=v.milestones.map((a:any)=>({...identity(a),amount:amount(a.amount),date:a.date?calendar(a.date):null}))
 need(milestones.filter((a:any)=>a.amount.kind==='balance').length<=1&&(!milestones.some((a:any)=>a.amount.kind==='balance')||milestones.at(-1).amount.kind==='balance'),'Only the final milestone may be the remaining balance')
 const recurring=v.recurring.map((a:any)=>{need(a.interval==='monthly','Choose monthly recurrence');return{...identity(a),amount:amount(a.amount,true),startOn:calendar(a.startOn),interval:'monthly' as const}})
 return{netDays,milestones,recurring}
}
export const scheduleOf=(options:any[])=>scheduleInput(options[0]?.paymentSchedule)
export function scheduleAmounts(spec:Schedule|null,total:number,deposit:number){
 if(!spec)return[]
 const cents=(a:Amount)=>a.kind==='fixed'?a.cents:a.kind==='percent'?Math.round(total*a.bps/10000):0
 let used=deposit
 const milestones=spec.milestones.map(m=>{const n=m.amount.kind==='balance'?total-used:cents(m.amount);need(n>0&&used+n<=total,'Deposit and milestones must fit the selected total');used+=n;return{id:m.id,label:m.label,cents:n,kind:'milestone',issueOn:m.date,netDays:spec.netDays}})
 return [{id:'deposit',label:'Deposit',cents:deposit,kind:'deposit',issueOn:null,netDays:0},...milestones,...spec.recurring.map(r=>({id:r.id,label:r.label,cents:cents(r.amount),kind:'recurring',issueOn:r.startOn,interval:r.interval,netDays:spec.netDays}))]
}
export function chosenSchedule(view:any,optionId:string,items:any[]=[]){
 const options=typeof view.options==='string'?JSON.parse(view.options):view.options
 const selection=offerSelection(options,view.deposit_bps,optionId,items)
 return scheduleAmounts(scheduleOf(options),selection.option.cents,selection.deposit)
}
export function scheduleText(rows:any[],currency:string){return rows.length?'Payment schedule (no automatic payment authorization):\n'+rows.map(r=>r.label+': '+currency+' '+(r.cents/100).toFixed(2)+'; '+(r.kind==='deposit'?'at acceptance':r.issueOn??'when marked done')+(r.kind==='recurring'?'; monthly':'')+'; net '+r.netDays).join('\n'):''}

import { addDays, localDate } from './expiry-time'
import { localHour } from './reports/zone'

/** One calendar calculation serves the send preview and the Worker scheduler. */
export function reminderSlots(settings:{afterDays:number[];beforeDays:number[]},sentAt:number,zone:string,expiry:{date:string|null;deadlineAt:number|null},policy:{quiet_end:number}){
 const wall=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(sentAt).map(p=>[p.type,p.value]))
 const minute=Number(wall.minute)*60000+Number(wall.second)*1000+sentAt%1000
 const slots=settings.afterDays.map(day=>{const [y,m,d]=addDays(localDate(sentAt,zone),day).split('-').map(Number);return {id:'after:'+day,at:localHour(y,m,d,Number(wall.hour),zone)+minute}})
 if(expiry.date)for(const day of settings.beforeDays){const [y,m,d]=addDays(expiry.deadlineAt===null?expiry.date:localDate(expiry.deadlineAt,zone),-day).split('-').map(Number);slots.push({id:'before:'+expiry.date+':'+day,at:localHour(y,m,d,policy.quiet_end,zone)})}
 return slots.sort((a,b)=>a.at-b.at)
}
export function reminderQuiet(at:number,zone:string,p:{quiet_start:number;quiet_end:number}){const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',hourCycle:'h23'}).format(at));return p.quiet_start<p.quiet_end?hour>=p.quiet_start&&hour<p.quiet_end:hour>=p.quiet_start||hour<p.quiet_end}
export function afterQuietHours(at:number,zone:string,p:{quiet_start:number;quiet_end:number}){
 if(!reminderQuiet(at,zone,p))return at
 const date=localDate(at,zone),[y,m,d]=date.split('-').map(Number),end=localHour(y,m,d,p.quiet_end,zone)
 if(end>at)return end
 const [ny,nm,nd]=addDays(date,1).split('-').map(Number);return localHour(ny,nm,nd,p.quiet_end,zone)
}

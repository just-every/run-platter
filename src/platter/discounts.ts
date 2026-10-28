import { dollars, need } from './model'
export function percentBps(value:unknown,label='a percentage',maximum=10000){
 const raw=String(value??'0').trim()||'0';need(/^\d{1,3}(\.\d{1,2})?$/.test(raw),'Enter '+label+' with at most two decimal places')
 const [whole,fraction='']=raw.split('.'),bps=Number(whole)*100+Number(fraction.padEnd(2,'0'));need(bps<=maximum,'Enter '+label+' between 0 and '+maximum/100);return bps
}
export function discountedCents(gross:number,bps:number){need(Number.isSafeInteger(gross)&&gross>=0&&Number.isSafeInteger(bps)&&bps>=0&&bps<=10000,'Invalid package discount');return Number((BigInt(gross)*BigInt(10000-bps)+5000n)/10000n)}
/** Allocate the exact net total without losing or inventing a cent. Ties follow line order. */
export function allocateNet(gross:number[],net:number){
 const sum=gross.reduce((n,v)=>n+BigInt(v),0n);if(sum===0n)return gross.map(()=>0)
 const parts=gross.map((v,i)=>{const n=BigInt(v)*BigInt(net);return{i,cents:Number(n/sum),remainder:n%sum}}),left=net-parts.reduce((n,p)=>n+p.cents,0)
 const ranked=[...parts].sort((a,b)=>a.remainder===b.remainder?a.i-b.i:a.remainder>b.remainder?-1:1);for(let i=0;i<left;i++)ranked[i].cents++
 return parts.map(p=>p.cents)
}

/** Fixed reductions follow the percentage reduction and cannot exceed that scope. */
export function fixedDiscount(value:unknown){return value===undefined||String(value).trim()===''||/^0(?:[.]0{1,2})?$/.test(String(value).trim())?0:dollars(value)}
export function scopedNet(gross:number,bps:number,fixed=0){const net=discountedCents(gross,bps)-fixed;need(net>=0,'Discount cannot exceed its line, group or package amount');return net}
export function discountThreshold(option:any){
 const gross=option.pricingGrossCents??option.discount?.grossCents??option.cents
 return Math.max(option.discount?.bps??0,gross?Math.ceil((gross-option.cents)*10000/gross):0,...(option.tables??[]).flatMap((t:any)=>[t.thresholdBps??0,...t.lines.flatMap((l:any)=>[l.discountBps??0,l.groupDiscountBps??0])]))
}

/** Expiry holds the frozen offer; it never silently raises the client's price. */
export function assertDiscountDates(options:any[],at:number){for(const option of options)if(option.discountExpiresOn)need(new Date(option.discountExpiresOn+'T23:59:59.999Z').getTime()>=at,'This discount expired. Prepare a new revision before sending or accepting.',409)}
/** Concealed reductions expose only allocated net line amounts. */
export function displayOptions(options:any[]){return options.map(option=>{
 if(!option.concealDiscount)return option
 const {discount,pricingGrossCents,...visible}=option,all=(option.tables??[]).flatMap((t:any)=>t.lines),allocated=allocateNet(all.map((l:any)=>l.lineTotalCents),option.cents);let index=0
 return {...visible,...(all.length?{tables:option.tables.map((t:any)=>{const lines=t.lines.map((l:any)=>({...(l.recurrence?{recurrence:l.recurrence}:{}),name:l.name,description:l.description,quantity:l.quantity,unit:l.unit,group:l.group,lineTotalCents:allocated[index++]}));return {name:t.name,lines,subtotalCents:lines.reduce((n:number,l:any)=>n+l.lineTotalCents,0),groups:[...new Set<string>(lines.map((l:any)=>l.group))].map(name=>({name,subtotalCents:lines.filter((l:any)=>l.group===name).reduce((n:number,l:any)=>n+l.lineTotalCents,0)}))}})}:{})}
})}

export function discountDeadline(options:any[]){return Math.min(Number.MAX_SAFE_INTEGER,...options.filter(o=>o.discountExpiresOn).map(o=>new Date(o.discountExpiresOn+'T23:59:59.999Z').getTime()))}

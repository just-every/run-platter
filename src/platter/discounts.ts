import { need } from './model'
export function percentBps(value:unknown,label='a percentage',maximum=10000){
 const raw=String(value??'0').trim()||'0';need(/^\d{1,3}(\.\d{1,2})?$/.test(raw),'Enter '+label+' with at most two decimal places')
 const [whole,fraction='']=raw.split('.'),bps=Number(whole)*100+Number(fraction.padEnd(2,'0'));need(bps<=maximum,'Enter '+label+' between 0 and '+maximum/100);return bps
}
export function discountedCents(gross:number,bps:number){need(Number.isSafeInteger(gross)&&gross>=0&&Number.isSafeInteger(bps)&&bps>=0&&bps<10000,'Invalid package discount');return Number((BigInt(gross)*BigInt(10000-bps)+5000n)/10000n)}
/** Allocate the exact net total without losing or inventing a cent. Ties follow line order. */
export function allocateNet(gross:number[],net:number){
 const sum=gross.reduce((n,v)=>n+BigInt(v),0n);if(sum===0n)return gross.map(()=>0)
 const parts=gross.map((v,i)=>{const n=BigInt(v)*BigInt(net);return{i,cents:Number(n/sum),remainder:n%sum}}),left=net-parts.reduce((n,p)=>n+p.cents,0)
 const ranked=[...parts].sort((a,b)=>a.remainder===b.remainder?a.i-b.i:a.remainder>b.remainder?-1:1);for(let i=0;i<left;i++)ranked[i].cents++
 return parts.map(p=>p.cents)
}

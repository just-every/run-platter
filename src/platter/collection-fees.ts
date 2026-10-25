import { commit, need, type Actor } from './model'

export async function surchargeSettings(db:D1Database){
 const row=await db.prepare('SELECT * FROM p_collection_fees WHERE singleton=1').first<any>()
 return {bps:row?.bps??0,allowedStates:row?JSON.parse(row.allowed_states):[],prohibitedStates:row?JSON.parse(row.prohibited_states):[],version:row?.version??0}
}
export async function surchargeCommand(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(['owner','admin'].includes(a.role),'Only owner and admins configure card fees',403)
 const old=await surchargeSettings(db),bps=Math.round(Number(p.percent??0)*100)
 need(Number(p.version)===old.version,'Card fee settings changed. Reload.',409)
 need(Number.isInteger(bps)&&bps>=0&&bps<=300,'Choose a card fee from zero to three percent')
 need(bps===0||p.consent===true||p.consent==='yes','Confirm the fee is permitted in the listed billing states')
 const states=(value:unknown)=>{
  const list=String(value??'').toUpperCase().split(/[\s,]+/).filter(Boolean)
  need(list.every(s=>/^[A-Z]{2}$/.test(s))&&new Set(list).size===list.length,'Use distinct two-letter billing state codes')
  return list
 }
 const allowed=states(p.allowedStates),prohibited=states(p.prohibitedStates)
 await commit(db,a,[db.prepare('INSERT INTO p_collection_fees(singleton,bps,allowed_states,prohibited_states) VALUES(1,?,?,?) ON CONFLICT(singleton) DO UPDATE SET bps=excluded.bps,allowed_states=excluded.allowed_states,prohibited_states=excluded.prohibited_states,version=p_collection_fees.version+1').bind(bps,JSON.stringify(allowed),JSON.stringify(prohibited))],true,{sql:'COALESCE((SELECT version FROM p_collection_fees WHERE singleton=1),0)=?',values:[old.version]})
 return {id:'card-fees'}
}
export async function collectionQuote(db:D1Database,cents:number,method:string,state:unknown){
 const settings=await surchargeSettings(db),billingState=String(state??'').trim().toUpperCase()
 need(!billingState||/^[A-Z]{2}$/.test(billingState),'Use a two-letter billing state')
 const fee=method==='ach'||!settings.allowedStates.includes(billingState)||settings.prohibitedStates.includes(billingState)?0:Math.round(cents*settings.bps/10000)
 return {depositCents:cents,feeCents:fee,cents:cents+fee,billingState}
}

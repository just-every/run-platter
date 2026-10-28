import assert from 'node:assert/strict'
import { recurringFixture } from './recurring-journey.mjs'

export function revenueOffer(term=12){
 const fixture=recurringFixture(term)
 return {...fixture,packages:[{id:'two',label:'Setup and care',price:'1'}],title:'Setup and care',scope:'Agreed setup and recurring care',depositPercent:'1'}
}

// Advance only the installation fixture clock; each agreement is accepted through its real invitation.
export async function acceptRevenue(h,{clientId,cookie=h.owner,term=12,interval='monthly',rate='1200',currency='USD',date='2099-01-15',title='Setup and care',approver=h.owner}){
 const old=await h.db.prepare('SELECT observed_at FROM p_expiry_clock WHERE singleton=1').first()
 try{
  await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(Date.parse(date+'T12:00:00Z')).run()
  const fixture=revenueOffer(term);Object.assign(fixture.pricingTables[0].lines[1],{interval,unitPrice:rate})
  const input={...fixture,clientId,title},p=await h.cmd('proposal.prepare',input,cookie)
  // Current creation offers USD; this seeded historical currency is never inferred or converted.
  if(currency!=='USD')await h.db.prepare('UPDATE p_proposals SET currency=? WHERE id=?').bind(currency,p.id).run()
  let row=(await h.state()).proposals.find(r=>r.id===p.id)
  if(!row.approval.complete){await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:row.revision},approver);row=(await h.state()).proposals.find(r=>r.id===p.id)}
  const path=new URL((await h.cmd('proposal.send',{id:p.id,version:row.version},cookie)).shareUrl).pathname
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const mail=await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC LIMIT 1").bind(p.id).first()
  const verified=await h.send(path+'/action?name=code.verify',{code:mail.body.match(/\b\d{6}\b/)[0]})
  assert.equal(verified.status,200,verified.text)
  const accepted=await h.send(path+'/action?name=accept',{name:'Synthetic client',optionId:'two',consent:true},verified.cookie)
  assert.equal(accepted.status,200,accepted.text)
  return {...p,input,path,cookie:verified.cookie}
 }finally{
  if(old)await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(old.observed_at).run()
  else await h.db.prepare('DELETE FROM p_expiry_clock WHERE singleton=1').run()
 }
}

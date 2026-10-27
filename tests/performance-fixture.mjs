import assert from 'node:assert/strict'
export const baseOffer={title:'Synthetic scope',scope:'A documented service.',packages:[{id:'one',label:'Service',price:'100'}],depositPercent:'25'}
export async function performanceFixture(h,{singleOwner=false,asymmetric=false}={}){
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 await h.cmd('outcome.settings',{version:0,reasons:['Budget','Timing']})
 if(!singleOwner)await h.send('/auth/invite',{email:'sales@studio.example',displayName:'Sales colleague',role:'member',returnTo:'/app'},h.owner)
 const sales=singleOwner?h.owner:await h.signIn('sales@studio.example'),salesId=(await h.state(sales)).actor.id,ownerId=(await h.state()).actor.id
 const clients=[],catalog=[],templates=[]
 for(let group=0;group<2;group++){
  clients.push(await h.cmd('client.save',{name:['Small client','Enterprise client'][group],email:`client${group}@studio.example`,segment:['Small business','Enterprise'][group]}))
  catalog.push(await h.cmd('catalog.save',{sku:`synthetic-platter-${group}`,name:['Brand','Support'][group],unit:'project',unitPrice:'100',description:'Recorded service'}))
  const source=await h.cmd('proposal.prepare',{...baseOffer,clientId:clients[group].id,pricingTables:[{optionId:'one',name:'Services',lines:[{catalogId:catalog[group].id,name:['Brand','Support'][group],unit:'project',unitPrice:'100',quantity:'1'}]}]})
  templates.push(await h.cmd('template.save',{id:source.id,version:source.version,name:['Plan A','Plan B'][group],shared:true,shareConsent:true}))
 }
 const clock=async at=>h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(at).run()
 const ids=[]
 for(let i=0;i<100;i++){
  const group=i%2,j=Math.floor(i/2),cookie=group?sales:h.owner,price=100+group*100+(j%5)*20
  let p=await h.cmd('template.start',{id:templates[group].id,version:templates[group].version,clientId:clients[group].id,title:`History ${String(i).padStart(3,'0')}`},cookie)
  p=await h.cmd('proposal.revise',{...baseOffer,id:p.id,version:p.version,clientId:clients[group].id,title:`History ${String(i).padStart(3,'0')}`,pricingTables:[{optionId:'one',name:'Services',lines:[{catalogId:catalog[group].id,name:['Brand','Support'][group],unit:'project',unitPrice:String(price),quantity:'1'}]}]},cookie)
  await h.cmd('proposal.approve',{id:p.id,version:p.version,revision:p.revision})
  const sentAt=Date.parse(group?'2099-04-15T00:00:00Z':'2099-01-15T00:00:00Z'),signDays=asymmetric?(j<37?(group?4:1):(group?20:9)):(group?4:2),acceptedAt=sentAt+signDays*86400000
  await clock(sentAt)
  const share=await h.cmd('proposal.send',{id:p.id,version:p.version+1},cookie),path=new URL(share.shareUrl).pathname
  await clock(acceptedAt)
  if(j%5!==4){
   assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
   const mail=await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject LIKE '%verification code%' ORDER BY created_at DESC LIMIT 1").bind(p.id).first()
   const verified=await h.send(path+'/action?name=code.verify',{code:mail.body.match(/\b\d{6}\b/)[0]})
   assert.equal(verified.status,200,verified.text)
   const accepted=await h.send(path+'/action?name=accept',{name:'Synthetic Client',optionId:'one',consent:true},verified.cookie)
   assert.equal(accepted.status,200,accepted.text)
   await h.cmd('payment.record',{id:p.id,method:'wire',receivedOn:asymmetric?new Date(acceptedAt+(j<37?(group?5:2):(group?21:14))*86400000).toISOString().slice(0,10):group?'2099-04-24':'2099-01-20',amount:String(price),reference:`synthetic-platter-${i}`,consent:true})
  }else{
   await h.cmd('proposal.lose',{id:p.id,version:p.version+2,reason:group?'Timing':'Budget',notice:false},cookie)
  }
  ids.push(p.id)
 }
 return {clients,catalog,templates,ids,sales,salesId,ownerId}
}
export async function suggestionDraft(h,fixture){
 return h.cmd('proposal.prepare',{...baseOffer,title:'Suggested draft',clientId:fixture.clients[0].id,pricingTables:[{optionId:'one',name:'Services',lines:[{catalogId:fixture.catalog[0].id,name:'Brand',unit:'project',unitPrice:'500',quantity:'1'}]}]})
}

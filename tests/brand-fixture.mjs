import assert from 'node:assert/strict'
export const brandOffer={title:'Synthetic brand preparation',scope:'A private unsent scope.',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'}
export const kit={name:'Synthetic brand B',accent:'#173f65',ink:'#202020',paper:'#ffffff',font:'serif',cover:'A separate studio'}
export async function brandFixture(h){
 const a=await h.cmd('client.save',{name:'Brand A client',email:'synthetic-platter-1501'+String.fromCharCode(64)+'example.test'})
 const pa=await h.cmd('proposal.prepare',{...brandOffer,title:'Brand A draft',clientId:a.id})
 const ta=await h.cmd('template.save',{id:pa.id,version:1,name:'Brand A template',shared:true,shareConsent:true})
 const la=await h.cmd('library.save',{title:'Brand A library',kind:'bio',content:'Private A content'})
 const ca=await h.cmd('catalog.save',{sku:'synthetic-platter-1501',name:'Brand A service',unit:'project',unitPrice:'100'})
 const b=await h.cmd('brand.save',{name:'Brand B',kit})
 await h.cmd('brand.select',{brandId:b.id})
 const client=await h.cmd('client.save',{name:'Brand B client',email:'synthetic-platter-1502'+String.fromCharCode(64)+'example.test'})
 const pb=await h.cmd('proposal.prepare',{...brandOffer,title:'Brand B draft',clientId:client.id})
 const tb=await h.cmd('template.save',{id:pb.id,version:1,name:'Brand B template',shared:true,shareConsent:true})
 const lb=await h.cmd('library.save',{title:'Brand B library',kind:'bio',content:'Private B content'})
 const cb=await h.cmd('catalog.save',{sku:'synthetic-platter-1502',name:'Brand B service',unit:'project',unitPrice:'200'})
 const before=await h.state()
 assert.deepEqual(before.clients.map(r=>r.id),[client.id]);assert.deepEqual(before.proposals.map(r=>r.id),[pb.id]);assert.deepEqual(before.templates.map(r=>r.id),[tb.id]);assert.deepEqual(before.libraryItems.map(r=>r.id),[lb.id]);assert.deepEqual(before.catalogItems.map(r=>r.id),[cb.id]);assert.deepEqual(before.proposals[0].document.brand,kit)
 await h.cmd('brand.select',{brandId:'default'})
 return {a,pa,ta,la,ca,b,client,pb,tb,lb,cb}
}
export async function restoredBrands(h,cookie,fixture){
 const {b,client,pb,tb,lb,cb}=fixture
 await h.cmd('brand.select',{brandId:b.id},cookie)
 const restored=await h.state(cookie)
 assert.deepEqual(restored.clients.map(r=>r.id),[client.id]);assert.deepEqual(restored.proposals.map(r=>r.id),[pb.id]);assert.deepEqual(restored.templates.map(r=>r.id),[tb.id]);assert.deepEqual(restored.libraryItems.map(r=>r.id),[lb.id]);assert.deepEqual(restored.catalogItems.map(r=>r.id),[cb.id]);assert.deepEqual(restored.proposals[0].document.brand,kit)
 const copy=await h.cmd('template.start',{id:tb.id,version:1,clientId:client.id},cookie)
 assert.equal((await h.state(cookie)).proposals.find(r=>r.id===copy.id).status,'draft')
 await h.cmd('proposal.send',{id:copy.id,version:1},cookie,409)
 await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-1503',consent:true},cookie,409)
 assert.equal((await h.send('/api/platter/v1/keys',{label:'No brand execution',scopes:['proposals.read']},cookie)).status,403)
 await h.cmd('brand.select',{brandId:'default'},cookie)
}

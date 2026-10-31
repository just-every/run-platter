import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
export const brandOffer={title:'Synthetic brand preparation',scope:'A private unsent scope.',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'}
export const kit={name:'Synthetic brand B',accent:'#173f65',ink:'#202020',paper:'#ffffff',font:'serif',cover:'A separate studio'}
export async function brandFixture(h){
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const a=await h.cmd('client.save',{name:'Brand A client',email:'synthetic-platter-1501'+String.fromCharCode(64)+'example.test'})
 const pa=await h.cmd('proposal.prepare',{...brandOffer,title:'Brand A draft',clientId:a.id})
 const ta=await h.cmd('template.save',{id:pa.id,version:1,name:'Brand A template',shared:true,shareConsent:true})
 const la=await h.cmd('library.save',{title:'Brand A library',kind:'bio',content:'Private A content'})
 const ca=await h.cmd('catalog.save',{sku:'synthetic-platter-1501',name:'Brand A service',unit:'project',unitPrice:'100'})
 const b=await h.cmd('brand.save',{name:'Brand B',kit})
 await h.cmd('brand.select',{brandId:b.id})
 const client=await h.cmd('client.save',{name:'Brand B client',email:'synthetic-platter-1502'+String.fromCharCode(64)+'example.test'})
 const pb=await h.cmd('proposal.prepare',{...brandOffer,title:'Brand B draft',clientId:client.id})
 const bytes=await readFile('fixtures/business/brand.png'),form=new FormData();form.set('id',pb.id);form.set('version','1');form.set('consent','yes');form.set('file',new File([bytes],'synthetic-platter-150.png',{type:'image/png'}))
 const request=new Request(h.origin+'/app/document-media',{method:'POST',headers:{origin:h.origin,cookie:h.owner,accept:'application/json'},body:form});const response=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});assert.equal(response.status,200,await response.clone().text());const media=(await response.json()).media
 const expectedKit={...kit,logoId:media.id}
 const changed=await h.cmd('proposal.document',{id:pb.id,version:1,document:{version:1,blocks:[],brand:expectedKit}});Object.assign(pb,changed)
 await h.cmd('brand.capture',{id:b.id,version:1,sourceId:pb.id,sourceVersion:pb.version,consent:true});b.version=2
 const tb=await h.cmd('template.save',{id:pb.id,version:pb.version,name:'Brand B template',shared:true,shareConsent:true})
 const lb=await h.cmd('library.save',{title:'Brand B library',kind:'bio',content:'Private B content'})
 const cb=await h.cmd('catalog.save',{sku:'synthetic-platter-1502',name:'Brand B service',unit:'project',unitPrice:'200'})
 const before=await h.state()
 assert.deepEqual(before.clients.map(r=>r.id),[client.id]);assert.deepEqual(before.proposals.map(r=>r.id),[pb.id]);assert.deepEqual(before.templates.map(r=>r.id),[tb.id]);assert.deepEqual(before.libraryItems.map(r=>r.id),[lb.id]);assert.deepEqual(before.catalogItems.map(r=>r.id),[cb.id]);assert.deepEqual(before.proposals[0].document.brand,expectedKit)
 await h.cmd('brand.select',{brandId:'default'})
 return {a,pa,ta,la,ca,b,client,pb,tb,lb,cb,expectedKit,media}
}
export async function restoredBrands(h,cookie,fixture){
 const {b,client,pb,tb,lb,cb,expectedKit,media}=fixture
 await h.cmd('brand.select',{brandId:b.id},cookie)
 const restored=await h.state(cookie)
 assert.deepEqual(restored.clients.map(r=>r.id),[client.id]);assert.deepEqual(restored.proposals.map(r=>r.id),[pb.id]);assert.deepEqual(restored.templates.map(r=>r.id),[tb.id]);assert.deepEqual(restored.libraryItems.map(r=>r.id),[lb.id]);assert.deepEqual(restored.catalogItems.map(r=>r.id),[cb.id]);assert.deepEqual(restored.proposals[0].document.brand,expectedKit)
 const copy=await h.cmd('template.start',{id:tb.id,version:1,clientId:client.id},cookie)
 assert.equal((await h.state(cookie)).proposals.find(r=>r.id===copy.id).status,'draft')
 const original=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+copy.id+'/'+media.id,{headers:{cookie}});assert.equal(original.status,200);assert.deepEqual(Buffer.from(await original.arrayBuffer()),await readFile('fixtures/business/brand.png'))
 await h.cmd('proposal.send',{id:copy.id,version:1},cookie,409)
 await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-1503',consent:true},cookie,409)
 assert.equal((await h.send('/api/platter/v1/keys',{label:'No brand execution',scopes:['proposals.read']},cookie)).status,403)
 await h.cmd('brand.select',{brandId:'default'},cookie)
}

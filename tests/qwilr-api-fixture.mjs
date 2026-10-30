import assert from 'node:assert/strict'
import { sourceExportFixture, uploadMovein, hash } from './document-movein-fixture.mjs'

export function qwilrApiFixture() {
 const requests=[],originals=new Map()
 const links={pdfUrl:'https://files.example.invalid/synthetic-platter.pdf',publicUrl:'https://pages.example.invalid/synthetic-platter',editorUrl:'https://edit.example.invalid/synthetic-platter',collaboratorUrl:'https://collaborate.example.invalid/synthetic-platter'}
 const page=(id,name,status)=>({id,name,status,tags:[],folderId:null,ownerId:'synthetic-platter-owner',expiry:{enabled:false},links,metadata:{source:'synthetic-platter-1'}})
 const pages=[page('synthetic-platter-1','Review','accepted'),page('synthetic-platter-2','Open','live')]
 pages[0].acceptance={acceptersTotal:1,acceptersCount:1,accepters:[{name:'Synthetic accepter',email:['synthetic-platter-1','example.invalid'].join('@'),legalEntity:'Synthetic client',esigned:true,acceptedAt:'2026-01-15T12:00:00Z'}],quote:{amount:2400,amountExcludingTax:2400,quoteSections:[{selected:true,lineItems:[{type:'fixedCost',unitPrice:1200,quantity:2,selected:true,billingSchedule:'monthly',metadata:{service:'synthetic-platter-1'}}]}]}}
 pages[1].acceptance=null;pages[1].previewAcceptance=null
 const summaries=pages.map(p=>({...p,createdAt:'2026-01-15T12:00:00Z'}))
 let fault=0,beforeResponse
 return {requests,originals,pages,setFault:value=>{fault=value},setBeforeResponse:fn=>{beforeResponse=fn},async fetch(request) {
  const url=new URL(request.url)
  requests.push({host:url.host,path:url.pathname,query:url.search,method:request.method})
  assert.equal(request.method,'GET');assert.equal(url.origin,'https://api.qwilr.com')
  assert.equal(request.headers.get('authorization'),'Bearer synthetic-platter-991')
  if(beforeResponse)await beforeResponse(url)
  if(fault)return new Response(null,{status:fault,headers:fault===302?{location:'https://outside.example.invalid/'}:{}})
  let value
  if(url.pathname==='/v1/pages')value=url.searchParams.get('tags')==='archived'?{data:[summaries[0]],nextCursor:null}:url.searchParams.has('cursor')?{data:[summaries[1]],nextCursor:null}:{data:[summaries[0]],nextCursor:'synthetic-platter-next'}
  else if(url.pathname.startsWith('/v1/pages/'))value=pages.find(p=>p.id===url.pathname.split('/').at(-1))
  else if(url.pathname==='/v1/blocks/saved')value=[{id:'synthetic-platter-block',name:'Source terms',type:'text'}]
  else return new Response(null,{status:404})
  const text=JSON.stringify(value)
  originals.set(url.pathname+url.search,Buffer.from(text))
  return new Response(text,{headers:{'content-type':'application/json'}})
 }}
}

export async function qwilrApiJourney() {
 const {harness}=await import('./harness.mjs'),provider=qwilrApiFixture()
 const h=await harness({outboundService:request=>provider.fetch(request)})
 try {
  const fixture=await sourceExportFixture('qwilr'),{id}=await h.cmd('document-import.create',{label:'Synthetic Qwilr API evidence',sourceProvider:'qwilr'})
  const capture={id,token:'synthetic-platter-991',consent:true}
  const originalOwner=(await h.state()).actor,memberEmail=['synthetic-platter-api-member','example.invalid'].join('@')
  assert.equal((await h.send('/auth/invite',{email:memberEmail,displayName:'Synthetic API member',role:'member',returnTo:'/app'},h.owner)).status,202)
  const member=await h.signIn(memberEmail),memberId=(await h.state(member)).actor.id
  await h.cmd('document-import.qwilr-capture',capture,member,403)
  await h.cmd('document-import.qwilr-capture',{...capture,consent:false},h.owner,400)
  assert.equal(provider.requests.length,0)
  for(const status of [401,429,302]) {
   provider.setFault(status)
   const before=(await h.state()).documentMoveins.find(m=>m.id===id).uploads
   await h.cmd('document-import.qwilr-capture',capture,h.owner,status===429?429:400)
   assert.deepEqual((await h.state()).documentMoveins.find(m=>m.id===id).uploads,before)
  }
  provider.setFault(0)
  await h.cmd('document-import.qwilr-capture',capture)
  assert.ok(provider.requests.some(r=>r.query.includes('cursor=')),'capture traverses the real cursor door')
  assert.ok(provider.requests.some(r=>r.query.includes('archived')),'archived pages are explicitly enumerated')
  for(const [n,bytes] of fixture.originals.entries())await uploadMovein(h,id,{filename:['first.pdf','second.pdf','open.pdf'][n],bytes})
  const initial=await h.cmd('document-import.preview',{id})
  assert.equal(initial.canApply,false)
  const key='binding:qwilr:api-pages:synthetic-platter-1:document',choices={[key]:hash(fixture.originals[0])}
  const reviewed=await h.cmd('document-import.preview',{id,choices})
  assert.equal(reviewed.canApply,true)
  assert.equal(reviewed.report.exports.counts.proposals,2)
  assert.ok(reviewed.report.exports.unmapped.some(item=>/editable|rebuild|content/i.test(item)))
  await h.cmd('document-import.apply',{id,choices:{...choices,[key]:hash(fixture.originals[1])},fingerprint:reviewed.fingerprint},h.owner,409)
  let result=await h.cmd('document-import.apply',{id,choices,fingerprint:reviewed.fingerprint})
  while(result.job.state!=='completed')result=await h.cmd('document-import.continue',{id})
  const state=await h.state(),facts=state.importedSourceFacts
  assert.equal(facts.length,3)
  assert.ok(facts.every(f=>f.execution==='source-evidence-only'))
  const journal=await h.cmd('document-import.journal',{id})
  for(const bytes of provider.originals.values()) {
   const original=journal.originals.find(o=>o.name==='exports/'+hash(bytes)+'.json')
   assert.ok(original,'every API response remains an exact original')
   assert.deepEqual(Buffer.from(original.original.base64,'base64'),bytes)
  }
  assert.equal(JSON.stringify(journal).includes('synthetic-platter-991'),false)
  assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_connection_secrets').first()).n,0)
  const calls=provider.requests.length
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2027-03-01T12:00:00Z'),cron:'*/15 * * * *'})
  assert.equal(provider.requests.length,calls)
  assert.equal((await h.state()).catalogItems.length,0)
  assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_invoices').first()).n,0)
  await h.cmd('document-import.qwilr-capture',capture,h.owner,409)
  assert.equal(provider.requests.length,calls,'frozen reviews authorize no fresh provider I/O')
  let undo=await h.cmd('document-import.undo',{id})
  while(undo.job.state!=='undone')undo=await h.cmd('document-import.undo',{id})
  assert.deepEqual((await h.state()).importedSourceFacts,[])
  const authorityMove=await h.cmd('document-import.create',{label:'Synthetic revoked API read',sourceProvider:'qwilr'})
  assert.equal((await h.send('/auth/operator/role',{operatorId:memberId,role:'owner'},h.owner)).status,200)
  const successor=await h.signIn(memberEmail)
  h.owner=await h.signIn(originalOwner.email)
  let demoted=false
  provider.setBeforeResponse(async()=>{
   if(demoted)return
   demoted=true
   assert.equal((await h.send('/auth/operator/role',{operatorId:originalOwner.id,role:'admin'},successor)).status,200)
  })
  const beforeDemotion=provider.requests.length
  await h.cmd('document-import.qwilr-capture',{...capture,id:authorityMove.id},h.owner,403)
  assert.equal(provider.requests.length,beforeDemotion+1,'authority loss stops subsequent provider reads')
  assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_document_uploads WHERE movein_id=?').bind(authorityMove.id).first()).n,0)
  assert.equal((await h.send('/auth/operator/role',{operatorId:originalOwner.id,role:'owner'},successor)).status,200)
  h.owner=await h.signIn(originalOwner.email)
  console.log('PROBE MIG-004 API: paginated Qwilr GET capture -> exact source JSON, reviewed PDF bindings, held editable content, no billing execution, journaled undo')
 }finally{await h.close()}
}

import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { hubspotSyncFixture, syncMapping } from './hubspot-sync-fixture.mjs'
import { clientFileBlocks, clientPdfBytes, uploadClientOriginal, verifiedClient } from './client-files-fixture.mjs'

export function collectedFieldsEdge(){
 const crm=hubspotSyncFixture(),invoices=[],reads=[]
 crm.metadata.synthetic_po={name:'synthetic_po',type:'string',hubspotDefined:false,modificationMetadata:{readOnlyValue:false}}
 crm.metadata.synthetic_billing={name:'synthetic_billing',type:'string',hubspotDefined:false,modificationMetadata:{readOnlyValue:false}}
 Object.assign(crm.state.deal.properties,{synthetic_po:'',synthetic_billing:''})
 let hook,uncertain=false,customerEmail
 const request=async req=>{
  if(new URL(req.url).hostname==='api.hubapi.com')return crm.request(req)
  const url=new URL(req.url);assert.equal(url.hostname,'quickbooks.api.intuit.com');assert.equal(req.headers.get('authorization'),'Bearer synthetic-platter-9810')
  if(hook)await hook(req)
  if(req.method==='GET'){
   reads.push(url.pathname)
   if(url.pathname.includes('/companyinfo/'))return Response.json({CompanyInfo:{CompanyName:'Synthetic accounting company'}})
   if(url.pathname.endsWith('/customer/synthetic-platter-9811'))return Response.json({Customer:{Id:'synthetic-platter-9811',Active:true,PrimaryEmailAddr:{Address:customerEmail??crm.state.contacts[0].properties.email}}})
   if(url.pathname.endsWith('/item/synthetic-platter-9812'))return Response.json({Item:{Id:'synthetic-platter-9812',Type:'Service',Active:true,IncomeAccountRef:{value:'synthetic-platter-9813'}}})
   throw Error('Unexpected accounting read')
  }
  assert.equal(req.method,'POST');assert.ok(url.pathname.endsWith('/invoice'));assert.ok(url.searchParams.get('requestid').startsWith('platter-'))
  const payload=await req.json(),row={...payload,Id:'synthetic-platter-invoice-'+(invoices.length+1),TotalAmt:payload.Line.reduce((n,line)=>n+line.Amount,0)};invoices.push(row)
  if(uncertain)return new Response(null,{status:503})
  return Response.json({Invoice:row})
 }
 return {crm,request,invoices,reads,setCustomerEmail(value){customerEmail=value},beforeRequest(fn){hook=fn},loseResponse(){uncertain=true}}
}
export async function collectedFieldsPropagation(){
 const edge=collectedFieldsEdge(),h=await harness({assetsDirectory:'public',outboundService:edge.request})
 try{
  await h.cmd('provider.connect',{provider:'hubspot',version:0,token:'synthetic-platter-4607',consent:true})
  await h.cmd('provider.connect',{provider:'quickbooks',version:0,realmId:'synthetic-platter-9814',token:'synthetic-platter-9810',consent:true})
  await h.cmd('invoice.authority',{provider:'quickbooks',consent:false},h.owner,400)
  await h.cmd('invoice.authority',{provider:'quickbooks',consent:true})
  const make=async title=>{
   const checked=await h.cmd('crm.deal.review',edge.crm.selected),p=await h.cmd('crm.deal.apply',{id:checked.id,digest:checked.digest,consent:true})
   await h.cmd('proposal.document',{id:p.id,version:1,document:{version:1,blocks:[...clientFileBlocks(),{id:'po',type:'field',title:'PO number',text:'',recipientRole:'client',fieldKind:'text',required:true}]}})
   await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const path=new URL((await h.cmd('proposal.send',{id:p.id,version:3})).shareUrl).pathname,cookie=await verifiedClient(h,path),bytes=await clientPdfBytes()
   const upload=await uploadClientOriginal(h,path,cookie,{bytes});assert.equal(upload.status,200);const file=await upload.json()
   const fields={'field:billing':'50 Synthetic Street','field:po':title,'field:purchase-file':file.id},input={name:'Synthetic client',optionId:'one',consent:true,...fields}
   assert.equal((await h.send(path+'/action?name=accept',{...input,'field:po':''},cookie)).status,400)
   assert.equal((await h.send(path+'/action?name=accept',input,cookie)).status,200)
   return {id:p.id,path,cookie,file,fields}
  }
  const signed=await make('synthetic-platter-9815'),current=async id=>(await h.state()).proposals.find(p=>p.id===id),mapping={customerId:'synthetic-platter-9811',itemId:'synthetic-platter-9812',poField:'po',billingField:'billing'}
  const review=async id=>h.cmd('invoice.qbo.review',{id,version:(await current(id)).version,...mapping}),apply=(r,cookie=h.owner,status=200,extra={})=>h.cmd('invoice.qbo.apply',{id:r.id,digest:r.digest,consent:true,...extra},cookie,status)
  const checked=await review(signed.id)
  assert.equal(checked.payload.CustomerMemo.value,'PO number: synthetic-platter-9815');assert.deepEqual(checked.payload.BillAddr,{Line1:'50 Synthetic Street'})
  await apply(checked,h.owner,400,{consent:false});await apply(checked,h.owner,409,{digest:'synthetic-platter-changed'});assert.equal(edge.invoices.length,0)
  const raceApply=()=>h.send('/api/platter/command',{name:'invoice.qbo.apply',input:{id:checked.id,digest:checked.digest,consent:true}},h.owner)
  const outcomes=await Promise.all([raceApply(),raceApply()])
  assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,409]);assert.equal(edge.invoices.length,1);assert.equal(outcomes.find(r=>r.status===200).value.status,'confirmed')
  assert.equal(edge.invoices[0].CustomerMemo.value,'PO number: synthetic-platter-9815');assert.equal(edge.invoices[0].BillAddr.Line1,'50 Synthetic Street');assert.equal(edge.invoices[0].TotalAmt,90.31)
  await apply(checked,h.owner,409);await h.cmd('invoice.export',{id:signed.id},h.owner,409);assert.equal(edge.invoices.length,1)
  const acceptedFields=[{fieldId:'po',property:'synthetic_po'},{fieldId:'billing',property:'synthetic_billing'}]
  const crmInput={proposalId:signed.id,version:(await current(signed.id)).version,...syncMapping,acceptedFields}
  edge.crm.metadata.synthetic_po.modificationMetadata.readOnlyValue=true
  await h.cmd('crm.sync.review',crmInput,h.owner,409);assert.equal(edge.crm.writes.length,0)
  edge.crm.metadata.synthetic_po.modificationMetadata.readOnlyValue=false
  await h.cmd('crm.sync.review',{...crmInput,acceptedFields:[{fieldId:'not-collected',property:'synthetic_po'}]},h.owner,409);assert.equal(edge.crm.writes.length,0)
  const crmReview=await h.cmd('crm.sync.review',{proposalId:signed.id,version:(await current(signed.id)).version,...syncMapping,acceptedFields})
  const crmApplied=await h.cmd('crm.sync.apply',{id:crmReview.id,digest:crmReview.digest,consent:true});assert.equal(crmApplied.held,0)
  assert.equal(edge.crm.state.deal.properties.synthetic_po,'synthetic-platter-9815');assert.equal(edge.crm.state.deal.properties.synthetic_billing,'50 Synthetic Street')
  assert.ok(!JSON.stringify(edge.crm.writes).includes(signed.file.filename));assert.ok(!JSON.stringify(edge.invoices).includes(signed.file.filename),'original bytes remain download-only')
  await h.send(signed.path+'/action?name=accept',{name:'Changed',optionId:'one',consent:true,'field:po':'Changed','field:billing':'Changed'},signed.cookie)
  assert.equal((await current(signed.id)).acceptance.fieldValues.po,'synthetic-platter-9815')
  const another=await make('synthetic-platter-9816'),stale=await review(another.id)
  await h.cmd('provider.disconnect',{provider:'quickbooks',version:1})
  await apply(stale,h.owner,409);assert.equal(edge.invoices.length,1)
  await h.cmd('provider.connect',{provider:'quickbooks',version:2,realmId:'synthetic-platter-9814',token:'synthetic-platter-9810',consent:true})
  await h.cmd('invoice.qbo.review',{id:another.id,version:(await current(another.id)).version,...mapping},h.owner,409)
  await h.cmd('invoice.authority',{provider:'quickbooks',consent:true})
  const uncertain=await review(another.id);edge.loseResponse();assert.equal((await apply(uncertain)).status,'uncertain');assert.equal(edge.invoices.length,2)
  await apply(uncertain,h.owner,409);assert.equal(edge.invoices.length,2)
  const email=['synthetic-platter-9817','example.test'].join('@');await h.send('/auth/invite',{email,displayName:'Synthetic sales',role:'member',returnTo:'/app'},h.owner);const sales=await h.signIn(email),before=edge.reads.length
  await h.cmd('invoice.qbo.review',{id:signed.id,version:(await current(signed.id)).version,...mapping},sales,403);assert.equal(edge.reads.length,before)
  const revoked=await make('synthetic-platter-9818'),revokedReview=await review(revoked.id),invoiceCount=edge.invoices.length
  let disconnected=false
  edge.beforeRequest(async request=>{if(!disconnected&&request.url.includes('/customer/')){disconnected=true;await h.cmd('provider.disconnect',{provider:'quickbooks',version:3})}})
  await apply(revokedReview,h.owner,409);assert.equal(edge.invoices.length,invoiceCount);await h.cmd('invoice.qbo.status',{id:revoked.id},h.owner,404)
 }finally{await h.close()}
}

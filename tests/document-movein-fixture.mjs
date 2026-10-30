import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { zipSync, strToU8 } from 'fflate'

export const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function moveinFixture() {
 const make=async(title,label,signed=true)=>{
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica)
  pdf.setTitle(title);pdf.setSubject('Synthetic platter client');pdf.setCreationDate(new Date('2026-01-15T12:00:00Z'))
  pdf.addPage().drawText(label,{x:40,y:700,size:16,font})
  if(signed)pdf.addPage().drawText(label==='Synthetic platter 2'?'Signature page':'Certificate of completion',{x:40,y:700,size:16,font})
  return Buffer.from(await pdf.save())
 }
 const originals=await Promise.all([make('Alpha','Synthetic platter 1'),make('Beta','Synthetic platter 2'),make('Review','Synthetic platter 3'),make('Review','Synthetic platter 4'),make('Open','Synthetic platter 5',false)])
 const csv='Title,Client,Date,Status,Value\nAlpha,Synthetic platter client,2026-01-15,Completed,1200\nReview,Synthetic platter client,2026-01-15,Completed,2400\nBeta,Another client,2025-01-15,Completed,3600'
 const zips=[
  {filename:'first.zip',bytes:Buffer.from(zipSync({'Completed/Alpha.pdf':originals[0],'Completed/Beta.pdf':originals[1],'Review/first.pdf':originals[2],'readme.txt':strToU8('Synthetic export note')}))},
  {filename:'second.zip',bytes:Buffer.from(zipSync({'Completed/copy.pdf':originals[0],'Review/second.pdf':originals[3]}))},
  {filename:'third.zip',bytes:Buffer.from(zipSync({'Open/open.pdf':originals[4],'report.csv':strToU8(csv)}))},
 ]
 return {originals,zips,csv}
}
export async function uploadMovein(h,id,file,cookie=h.owner,position=0) {
 const sha256=hash(file.bytes),started=await h.cmd('document-import.upload-start',{id,filename:file.filename,sha256,size:file.bytes.length},cookie)
 for(let offset=Math.max(position,started.received);offset<file.bytes.length;offset+=48000){
  const bytes=file.bytes.subarray(offset,offset+48000)
  await h.cmd('document-import.upload-chunk',{id,sha256,position:offset,base64:bytes.toString('base64')},cookie)
 }
 if(!started.complete)await h.cmd('document-import.upload-finish',{id,sha256},cookie)
 return sha256
}
export async function applyMovein(h,fixture,cookie=h.owner) {
 const {id}=await h.cmd('document-import.create',{label:'Synthetic document move-in'},cookie)
 for(const file of fixture.zips)await uploadMovein(h,id,file,cookie)
 const preview=await h.cmd('document-import.preview',{id},cookie)
 assert.equal(preview.canApply,false)
 const ambiguous=preview.report.rows.find(r=>r.candidates.length===2)
 const choices={[ambiguous.id]:hash(fixture.originals[2])}
 const reviewed=await h.cmd('document-import.preview',{id,choices},cookie)
 let result=await h.cmd('document-import.apply',{id,choices,fingerprint:reviewed.fingerprint},cookie)
 while(result.job.state!=='completed')result=await h.cmd('document-import.continue',{id},cookie)
 return {id,reviewed,result}
}

export async function sourceExportFixture(provider='ignition') {
 const base=await moveinFixture()
 const files=provider==='ignition'?{
  'clients.csv':'Client ID,Client Name,Original Note\nc-1,Synthetic retained client,Exact source note\nc-2,Synthetic retained client,Second distinct client',
  'services.csv':'#ID,Service Name,Service Description,Exported Price,Currency\ns-1,Synthetic monthly service,Fixed source description,1200.00,USD\ns-2,Synthetic euro service,No currency conversion,81.12500,EUR',
  'proposals.csv':'Proposal ID,Proposal Name,Client ID,Created Date,Status,Currency,Value,PDF\np-1,Alpha,c-1,2026-01-15,Accepted,USD,14400.00,signed.pdf\np-2,Open,,2026-01-15,Sent,EUR,81.12500,open.pdf\np-3,Missing,c-1,2026-01-16,Draft,USD,19.00,missing.pdf',
  'billing-schedules.csv':'Billing Schedule ID,Proposal ID,Service ID,Status,Start Date,Currency,Amount,Frequency\nb-1,p-1,s-1,Active,2026-02-01,USD,1200.00,Monthly',
 }:{'proposals.csv':'Page ID,Title,Client,Date,Status,Currency,Value,PDF\nq-1,Review,Synthetic retained client,2026-01-15,Accepted,GBP,2500.00,unknown.pdf\nq-2,Open,Synthetic retained client,2026-01-15,Sent,GBP,120.00,open.pdf'}
 const originals=provider==='ignition'?await Promise.all([base.originals[0],base.originals[4]].map(async bytes=>{const pdf=await PDFDocument.load(bytes);pdf.setSubject('Synthetic ignition retained client');return Buffer.from(await pdf.save())})):[base.originals[2],base.originals[3],base.originals[4]]
 const pdfs=provider==='ignition'?{'signed.pdf':originals[0],'open.pdf':originals[1]}:{'first.pdf':originals[0],'second.pdf':originals[1],'open.pdf':originals[2]}
 const bytes=Buffer.from(zipSync({...pdfs,...Object.fromEntries(Object.entries(files).map(([name,text])=>[name,strToU8(text)]))}))
 const choices=provider==='ignition'?{'binding:ignition:proposals:p-2:clientId':'ignition:clients:c-2','binding:ignition:proposals:p-3:document':'unmapped'}:{'binding:qwilr:proposals:q-1:document':hash(originals[0])}
 const mapping=provider==='ignition'?{services:{id:'#ID',name:'Service Name',description:'Service Description',price:'Exported Price',currency:'Currency'}}:{}
 return {provider,files,originals,zips:[{filename:provider+'-export.zip',bytes}],choices,mapping}
}
export async function applySourceExport(h,fixture,cookie=h.owner) {
 const {id}=await h.cmd('document-import.create',{label:'Synthetic '+fixture.provider+' export',sourceProvider:fixture.provider},cookie)
 for(const file of fixture.zips)await uploadMovein(h,id,file,cookie)
 const initial=await h.cmd('document-import.preview',{id},cookie)
 assert.equal(initial.canApply,false)
 const reviewed=await h.cmd('document-import.preview',{id,choices:fixture.choices,mapping:fixture.mapping},cookie)
 assert.equal(reviewed.canApply,true)
 let result=await h.cmd('document-import.apply',{id,choices:fixture.choices,mapping:fixture.mapping,fingerprint:reviewed.fingerprint},cookie)
 const resumed=result.job.state!=='completed'
 while(result.job.state!=='completed')result=await h.cmd('document-import.continue',{id},cookie)
 return {id,initial,reviewed,result,resumed}
}

export async function sourceExportJourney() {
 const {harness}=await import('./harness.mjs')
 let providerCalls=0
 const h=await harness({outboundService:()=>{providerCalls++;return new Response(null,{status:500})}})
 const originalCommand=h.cmd,originalState=h.state
 h.cmd=(name,input,cookie=h.owner,status=200)=>originalCommand(name,input,cookie,status)
 h.state=(cookie=h.owner,status=200)=>originalState(cookie,status)
 try {
 for(const provider of ['ignition','qwilr']) {
  const fixture=await sourceExportFixture(provider),{id}=await h.cmd('document-import.create',{label:'Synthetic '+provider+' review',sourceProvider:provider})
  for(const file of fixture.zips)await uploadMovein(h,id,file)
  const initial=await h.cmd('document-import.preview',{id})
  assert.equal(initial.canApply,false)
  assert.deepEqual(initial.report.exports.counts,provider==='ignition'?{clients:2,services:0,proposals:3,billingSchedules:1}:{clients:0,services:0,proposals:2,billingSchedules:0})
  assert.deepEqual([initial.report.arrived,initial.report.held,initial.report.unmapped],provider==='ignition'?[1,5,1]:[2,2,0])
  assert.equal((await h.state()).importedSourceFacts.length,0)
  await h.cmd('document-import.apply',{id,fingerprint:initial.fingerprint},h.owner,409)
  await h.cmd('document-import.preview',{id,choices:{...fixture.choices,['binding:'+provider+':proposals:'+(provider==='ignition'?'p-2:clientId':'q-1:document')]:'absent'}},h.owner,409)
  const reviewed=await h.cmd('document-import.preview',{id,choices:fixture.choices,mapping:fixture.mapping})
  assert.equal(reviewed.canApply,true)
  assert.deepEqual([reviewed.report.arrived,reviewed.report.held,reviewed.report.unmapped],provider==='ignition'?[1,1,2]:[2,1,0])
  await h.cmd('document-import.apply',{id,choices:fixture.choices,mapping:fixture.mapping,fingerprint:initial.fingerprint},h.owner,409)
  if(provider==='ignition') {
   const changed={services:{...reviewed.report.exports.mappings.services,price:'Service Name'}}
   await h.cmd('document-import.apply',{id,choices:fixture.choices,mapping:changed,fingerprint:reviewed.fingerprint},h.owner,409)
  }
  await uploadMovein(h,id,{filename:'source-note.csv',bytes:Buffer.from('Supplied note\nRetained original')})
  await h.cmd('document-import.apply',{id,choices:fixture.choices,mapping:fixture.mapping,fingerprint:reviewed.fingerprint},h.owner,409)
  const current=await h.cmd('document-import.preview',{id,choices:fixture.choices,mapping:fixture.mapping})
  let applied=await h.cmd('document-import.apply',{id,choices:fixture.choices,mapping:fixture.mapping,fingerprint:current.fingerprint})
  if(provider==='ignition')assert.notEqual(applied.job.state,'completed','multi-batch application is resumable')
  if(provider==='ignition') {
   const actor=(await h.state()).actor,email=['synthetic-platter-successor','example.invalid'].join('@')
   await h.send('/auth/invite',{email,displayName:'Synthetic source successor',role:'member',returnTo:'/app'},h.owner)
   const member=await h.signIn(email),memberId=(await h.state(member)).actor.id
   await h.cmd('document-import.continue',{id},member,403)
   h.owner=await h.signIn(actor.email)
   const promoted=await h.send('/auth/operator/role',{operatorId:memberId,role:'owner'},h.owner);assert.equal(promoted.status,200,promoted.text)
   const successor=await h.signIn(email)
   assert.equal((await h.send('/auth/operator/role',{operatorId:actor.id,role:'admin'},successor)).status,200)
   const demoted=await h.signIn(actor.email),before=(await h.db.prepare('SELECT * FROM ik_jobs WHERE id=?').bind(applied.job.id).first())
   await h.cmd('document-import.continue',{id},demoted,403)
   await h.cmd('document-import.preview',{id},demoted,403)
   assert.deepEqual((await h.state(demoted)).importedSourceFacts,[])
   assert.equal((await h.send('/api/platter/imported-original?id='+id+'&name=reviewed-report-choices.json',undefined,demoted)).status,403)
   assert.deepEqual(await h.db.prepare('SELECT * FROM ik_jobs WHERE id=?').bind(applied.job.id).first(),before)
   assert.equal((await h.send('/auth/operator/role',{operatorId:actor.id,role:'owner'},successor)).status,200)
   h.owner=await h.signIn(actor.email)
  }
  while(applied.job.state!=='completed')applied=await h.cmd('document-import.continue',{id})
  await Promise.all([h.cmd('document-import.apply',{id,choices:fixture.choices,mapping:fixture.mapping,fingerprint:current.fingerprint}),h.cmd('document-import.apply',{id,choices:fixture.choices,mapping:fixture.mapping,fingerprint:current.fingerprint})])
  const state=await h.state(),facts=state.importedSourceFacts
  assert.equal(facts.length,provider==='ignition'?8:2)
  assert.ok(facts.every(f=>f.execution==='source-evidence-only'))
  assert.equal(state.importedDocuments.length,provider==='ignition'?2:3)
  assert.ok(state.importedDocuments.every(d=>d.contentMode==='fixed-pdf'))
  assert.equal(state.importedDocuments.filter(d=>d.disposition==='held-open-document').length,1)
  const journal=await h.cmd('document-import.journal',{id})
  for(const [name,text] of Object.entries(fixture.files)) {
   const bytes=Buffer.from(text),original=journal.originals.find(o=>o.name==='exports/'+hash(bytes)+'.csv')
   assert.deepEqual(Buffer.from(original.original.base64,'base64'),bytes)
   for(const fact of facts.filter(f=>f.sourceFile.endsWith(name)))assert.equal(fact.sourceHash,hash(bytes))
  }
  for(const bytes of fixture.originals){const response=await h.mf.dispatchFetch(h.origin+'/api/platter/imported-original?document='+hash(bytes),{headers:{cookie:h.owner}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes)}
  if(provider==='ignition') {
   assert.equal(state.businessRecords.companies.length,2)
   assert.deepEqual(state.businessRecords.catalog.map(r=>[r.id,r.price,r.currency,r.pricing_status]),[['ignition:services:s-1','1200.00','USD','retained-for-review'],['ignition:services:s-2','81.12500','EUR','retained-for-review']])
   const schedule=facts.find(f=>f.kind==='billingSchedules')
   assert.deepEqual(schedule.fields,{id:'b-1',proposalId:'p-1',serviceId:'s-1',status:'Active',date:'2026-02-01',currency:'USD',value:'1200.00',frequency:'Monthly'})
   assert.deepEqual(schedule.bindings,{proposalId:'ignition:proposals:p-1',serviceId:'ignition:services:s-1'})
   assert.equal(facts.find(f=>f.sourceId==='p-2').bindings.clientId,'ignition:clients:c-2')
  }
  const baseline=await Promise.all(['p_invoices','p_payment_records','p_proposals','p_mail'].map(t=>h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().then(r=>r.results)))
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2027-02-01T12:00:00Z'),cron:'*/15 * * * *'})
  assert.equal(providerCalls,0,'source export import and clock advancement make no provider calls')
  assert.deepEqual(await Promise.all(['p_invoices','p_payment_records','p_proposals','p_mail'].map(t=>h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().then(r=>r.results))),baseline,'advancing a source billing schedule creates no invoices, proposals or outbound work')
  const repeated=await h.cmd('document-import.create',{label:'Synthetic replay',sourceProvider:provider})
  for(const file of fixture.zips)await uploadMovein(h,repeated.id,file)
  const replay=await h.cmd('document-import.preview',{id:repeated.id,choices:fixture.choices,mapping:fixture.mapping})
  assert.equal(replay.canApply,false);assert.ok(replay.existing.length>0)
  await h.cmd('document-import.apply',{id:repeated.id,choices:fixture.choices,mapping:fixture.mapping,fingerprint:replay.fingerprint},h.owner,409)
  const client=await h.cmd('client.save',{name:'Synthetic source dependency',email:['synthetic-platter-'+provider+'-dependency','example.invalid'].join('@')})
  const proposal=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic source dependency',scope:'Retain source fact',optionOne:'One',priceOne:'100',optionTwo:'Two',priceTwo:'200',depositPercent:'25'})
  await h.db.prepare('INSERT INTO p_imported_source_dependencies(fact_id,proposal_id) VALUES(?,?)').bind(facts[0].id,proposal.id).run()
  await h.cmd('document-import.undo',{id},h.owner,409)
  assert.deepEqual((await h.state()).importedSourceFacts,facts)
  await h.db.prepare('DELETE FROM p_imported_source_dependencies WHERE fact_id=?').bind(facts[0].id).run()
  let undo=await h.cmd('document-import.undo',{id})
  while(undo.job.state!=='undone')undo=await h.cmd('document-import.undo',{id})
  assert.deepEqual((await h.state()).importedSourceFacts,[])
  assert.deepEqual((await h.state()).businessRecords,{companies:[],contacts:[],catalog:[]})
  assert.ok((await h.cmd('document-import.journal',{id})).provenance.every(p=>p.reversed))
  console.log('PROBE MIG-004 '+provider+': reviewed export -> exact originals, source bindings, non-executable schedules, replay refusal and dependency-safe undo')
 }
 } finally {await h.close()}
}

export async function sourceExportBrowser({page,context,app,capture}) {
 const fixture=await sourceExportFixture('ignition')
 await page.getByLabel('Move-in name',{exact:true}).fill('Synthetic Ignition source export')
 await page.getByLabel('Export source',{exact:true}).selectOption('ignition')
 await page.getByRole('button',{name:'Start document move-in',exact:true}).click()
 const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Synthetic Ignition source export',exact:true})})
 await section.getByLabel('Exported files').setInputFiles(fixture.zips.map(z=>({name:z.filename,mimeType:'application/zip',buffer:z.bytes})))
 await section.getByRole('button',{name:'Upload or resume files',exact:true}).click()
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-document-upload]')).every(f=>!f.querySelector('input[type=file]').files.length))
 await section.getByRole('button',{name:'Preview document move-in',exact:true}).click()
 assert.equal(await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).count(),0)
 assert.match(await section.innerText(),/Clients\s+2\s+Services\s+0\s+Proposals\s+3\s+Billing schedules\s+1/)
 assert.match(await section.innerText(),/map missing fields price/)
 const mapping=JSON.parse(await section.getByLabel('Export column mapping (JSON)').inputValue())
 assert.equal(mapping.services.price,'Price')
 mapping.services=fixture.mapping.services
 await section.getByLabel('Export column mapping (JSON)').fill(JSON.stringify(mapping))
 for(const [key,value] of Object.entries(fixture.choices))await section.locator('select[name="match:'+key+'"]').selectOption(value)
 await section.getByRole('button',{name:'Review report matches',exact:true}).click()
 assert.match(await section.innerText(),/Clients\s+2\s+Services\s+2\s+Proposals\s+3\s+Billing schedules\s+1/)
 await section.getByText('Source facts, dates, currencies and provenance',{exact:true}).click()
 assert.match(await section.innerText(),/1200.00/)
 assert.match(await section.innerText(),/2026-02-01/)
 await capture('ignition-review')
 await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).click()
 while(await section.getByRole('button',{name:'Continue document move-in',exact:true}).count())await section.getByRole('button',{name:'Continue document move-in',exact:true}).click()
 const facts=page.locator('section').filter({has:page.getByRole('heading',{name:'Retained source facts',exact:true})})
 assert.equal(await facts.locator('li').count(),8)
 assert.match(await facts.innerText(),/Billing schedules cannot execute/)
 const retained=page.locator('section').filter({has:page.getByRole('heading',{name:'Retained imported originals',exact:true})})
 assert.equal(await retained.getByRole('link',{name:'Download original PDF',exact:true}).count(),2)
 for(const bytes of fixture.originals){const response=await context.request.get(app.origin+'/api/platter/imported-original?document='+hash(bytes));assert.equal(response.status(),200);assert.deepEqual(await response.body(),bytes)}
 await capture('ignition-retained')
 await section.getByRole('button',{name:'Open document journal',exact:true}).click()
 assert.match(await section.innerText(),/14 document changes recorded/)
 await capture('ignition-journal')
 while(await section.getByRole('button',{name:/^(Undo document move-in|Continue document undo)$/}).count())await section.getByRole('button',{name:/^(Undo document move-in|Continue document undo)$/}).click()
 assert.equal(await page.getByRole('heading',{name:'Retained source facts',exact:true}).count(),0)
 assert.match(await section.innerText(),/Import undone/)
 console.log('PROBE MIG-004 controls: compiled import page -> reviewed mappings, missing bindings, 8 retained facts, exact PDF downloads, journal and undo')
}

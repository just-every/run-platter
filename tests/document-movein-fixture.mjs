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

// Deliberately shuffled report columns and PDF filenames require an explicit source mapping.
export const proposifyMapping={title:'Proposal',client:'Customer',createdDate:'Created',signedDate:'Completed',status:'Stage',value:'Amount',currency:'Money'}
export async function proposifyFixture() {
 const originals=[],expected=[]
 for(let i=1;i<=30;i++){
  const title=i===2||i===3?'Repeated title':'Synthetic proposal '+i,signed=i<=24
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica)
  pdf.setTitle(title);pdf.setSubject('Synthetic Proposify client');pdf.setCreationDate(new Date('2026-02-01T12:00:00Z'))
  pdf.addPage().drawText('Synthetic Proposify original '+i,{x:40,y:700,size:16,font})
  if(signed)pdf.addPage().drawText('Signature page',{x:40,y:700,size:16,font})
  originals.push(Buffer.from(await pdf.save()))
  expected.push({title,client:'Synthetic Proposify client',createdDate:'2026-02-01',signedDate:signed?'2026-02-14':'',status:signed?'Signed':'Sent',value:i===1?'1,200.50':String(i*100),currency:i===30?'EUR':'USD'})
 }
 const pdf=await PDFDocument.create();pdf.setTitle('Synthetic template');pdf.addPage().drawText('Synthetic template fixed page',{x:40,y:700,size:16})
 const template=Buffer.from(await pdf.save()),csv='Money,Amount,Stage,Customer,Completed,Proposal,Created\n'+expected.slice().reverse().map(r=>[r.currency,JSON.stringify(r.value),r.status,r.client,r.signedDate,r.title,r.createdDate].join(',')).join('\n')
 const files=Object.fromEntries(originals.map((bytes,i)=>['exports/source-'+(30-i)+'.pdf',bytes]))
 return {originals,expected,template,csv,zips:[{filename:'proposify.zip',bytes:Buffer.from(zipSync({...files,'templates/rebuild.pdf':template}))},{filename:'documents.csv',bytes:Buffer.from(csv)}]}
}
export async function applyProposify(h,fixture,cookie=h.owner) {
 const {id}=await h.cmd('document-import.create',{label:'Synthetic Proposify move-in',provider:'proposify'},cookie)
 for(const file of fixture.zips)await uploadMovein(h,id,file,cookie)
 const review={columns:proposifyMapping,templateDocument:hash(fixture.template)}
 const initial=await h.cmd('document-import.preview',{id,...review},cookie)
 assert.equal(initial.canApply,false,'indistinguishable report matches are held')
 const repeated=initial.report.rows.filter(r=>r.title==='Repeated title')
 assert.equal(repeated.length,2)
 const choices=Object.fromEntries(repeated.map(r=>[r.id,hash(fixture.originals[Number(r.evidence.value)/100-1])]))
 const reviewed=await h.cmd('document-import.preview',{id,...review,choices},cookie)
 assert.equal(reviewed.canApply,true)
 let result=await h.cmd('document-import.apply',{id,...review,choices,fingerprint:reviewed.fingerprint},cookie)
 while(result.job.state!=='completed')result=await h.cmd('document-import.continue',{id},cookie)
 return {id,review,choices,reviewed,result}
}
export async function fixedTemplate(h,movein,cookie=h.owner) {
 const client=(await h.state(cookie)).clients.find(c=>c.email===h.auth.OWNER_EMAIL)??await h.cmd('client.save',{name:'Synthetic template client',email:h.auth.OWNER_EMAIL},cookie)
 const draft=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic owner-priced draft',scope:'Owner-supplied work',packages:[{id:'chosen',label:'Owner priced',price:'725.25'}],depositPercent:'25'},cookie)
 const input={id:movein.id,proposalId:draft.id,version:draft.version,templateName:'Synthetic independent template',consent:true}
 const preview=await h.cmd('document-import.template-preview',input,cookie)
 const before=(await h.state(cookie)).templates.length
 const attempts=await Promise.all([1,2].map(()=>h.send('/api/platter/command',{name:'document-import.template-apply',input:{...input,fingerprint:preview.fingerprint}},cookie)))
 assert.ok(attempts.every(r=>[200,409].includes(r.status))&&attempts.some(r=>r.status===200),'concurrent application is served once or held without duplicate output')
 const served=attempts.find(r=>r.status===200).value,applied=served.result??served
 assert.equal((await h.state(cookie)).templates.length,before+1)
 return {client,draft,input,preview,applied}
}
export async function proposifyJourney(h) {
 const fixture=await proposifyFixture(),start=await h.cmd('document-import.create',{provider:'proposify',label:'Synthetic mapping review'})
 for(const file of fixture.zips)await uploadMovein(h,start.id,file)
 const missing=await h.cmd('document-import.preview',{id:start.id})
 assert.equal(missing.canApply,false);assert.equal(missing.report.mappingRequired,true)
 await h.cmd('document-import.apply',{id:start.id,fingerprint:missing.fingerprint},h.owner,409)
 const review={columns:proposifyMapping,templateDocument:hash(fixture.template)}
 const initial=await h.cmd('document-import.preview',{id:start.id,...review})
 const choices={}
 for(const r of initial.report.rows.filter(r=>r.title==='Repeated title'))choices[r.id]=hash(fixture.originals[Number(r.evidence.value)/100-1])
 const reviewed=await h.cmd('document-import.preview',{id:start.id,...review,choices})
 await h.cmd('document-import.apply',{id:start.id,...review,columns:{...proposifyMapping,value:'Money',currency:'Amount'},choices,fingerprint:reviewed.fingerprint},h.owner,409)
 await h.cmd('document-import.preview',{id:start.id,columns:proposifyMapping,templateDocument:hash(fixture.originals[0])},h.owner,409)
 let result=await h.cmd('document-import.apply',{id:start.id,...review,choices,fingerprint:reviewed.fingerprint})
 while(result.job.state!=='completed')result=await h.cmd('document-import.continue',{id:start.id})
 const documents=(await h.state()).importedDocuments
 assert.equal(documents.length,31)
 assert.equal(documents.filter(d=>d.disposition==='retained-agreement').length,24)
 assert.equal(documents.filter(d=>d.disposition==='held-open-document').length,6)
 for(let i=0;i<30;i++){
  const found=documents.find(d=>d.id===hash(fixture.originals[i]))
  assert.deepEqual(found.sourceEvidence,fixture.expected[i],'independently expected report facts for original '+(i+1))
  assert.equal(found.report.Amount,fixture.expected[i].value)
  const response=await h.mf.dispatchFetch(h.origin+'/api/platter/imported-original?document='+found.id,{headers:{cookie:h.owner}})
  assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),fixture.originals[i])
 }
 assert.equal(documents.find(d=>d.id===hash(fixture.template)).disposition,'held-template')
 const movein={id:start.id},fixed=await fixedTemplate(h,movein)
 const state=await h.state(),draft=state.proposals.find(p=>p.id===fixed.draft.id),template=state.templates.find(t=>t.id===fixed.applied.templateId)
 assert.equal(draft.options[0].cents,72525,'source report values never become executable prices')
 assert.equal(draft.status,'draft');assert.equal(draft.document.fixedPdf.source,'proposify')
 assert.match(template.name,/rebuild in the editor/)
 const original=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+draft.id+'/'+draft.document.fixedPdf.fileId,{headers:{cookie:h.owner}})
 assert.equal(original.status,200);assert.deepEqual(Buffer.from(await original.arrayBuffer()),fixture.template)
 const exported=await h.mf.dispatchFetch(h.origin+'/api/platter/document-export?id='+draft.id+'&format=pdf',{headers:{cookie:h.owner}})
 assert.equal(exported.status,200)
 const {pdfPages}=await import('./pdf-document.mjs'),pages=await pdfPages(await exported.arrayBuffer())
 assert.match(pages[0],/Synthetic template fixed page/);assert.match(pages.slice(1).join(' '),/725.25/)
 assert.equal((await h.send('/api/platter/document-export?id='+draft.id+'&format=docx',undefined,h.owner)).status,409)
 assert.deepEqual(await h.cmd('document-import.template-apply',{...fixed.input,fingerprint:fixed.preview.fingerprint}),fixed.applied,'replay returns the recorded outputs')
 await h.cmd('document-import.undo',{id:start.id},h.owner,409)
 const unchanged=await h.state()
 await h.cmd('document-import.template-apply',{...fixed.input,templateName:'Changed choice',fingerprint:fixed.preview.fingerprint+'0'},h.owner,409)
 assert.deepEqual((await h.state()).importedDocuments,unchanged.importedDocuments)
 await h.cmd('document-import.template-undo',{id:start.id,applicationId:fixed.applied.applicationId})
 await h.cmd('document-import.template-apply',{...fixed.input,fingerprint:fixed.preview.fingerprint},h.owner,409)
 assert.equal((await h.state()).templates.some(t=>t.id===template.id),false)
 const another=await fixedTemplate(h,movein)
 const started=await h.cmd('template.start',{id:another.applied.templateId,version:1,clientId:fixed.client.id,title:'Synthetic independent child'})
 const child=(await h.state()).proposals.find(p=>p.id===started.id)
 assert.equal(child.document.fixedPdf.source,'proposify');assert.equal(child.options[0].cents,72525);assert.equal(child.status,'draft')
 await h.cmd('document-import.template-undo',{id:start.id,applicationId:another.applied.applicationId},h.owner,409)
 await h.cmd('document-import.undo',{id:start.id},h.owner,409)
 const journal=await h.cmd('document-import.journal',{id:start.id})
 assert.equal(journal.provenance.length,31)
 assert.deepEqual(Buffer.from(journal.originals.find(o=>o.name.endsWith('/documents.csv')).original.base64,'base64'),Buffer.from(fixture.csv))
 // A separate source with no downstream outputs remains undoable through the public door.
 const undoPdf=await PDFDocument.create();undoPdf.setTitle('Synthetic undo document');undoPdf.setCreationDate(new Date('2026-02-01T12:00:00Z'));undoPdf.addPage().drawText('Synthetic independent original')
 const undoBytes=Buffer.from(await undoPdf.save())
 const {id:undoable}=await h.cmd('document-import.create',{provider:'proposify',label:'Synthetic undo-only report'})
 await uploadMovein(h,undoable,{filename:'undo.pdf',bytes:undoBytes})
 await uploadMovein(h,undoable,{filename:'documents.csv',bytes:Buffer.from('Money,Amount,Stage,Customer,Completed,Proposal,Created\nUSD,100,Sent,Absent,,Synthetic undo document,2026-02-01')})
 const empty=await h.cmd('document-import.preview',{id:undoable,columns:proposifyMapping})
 await h.cmd('document-import.apply',{id:undoable,columns:proposifyMapping,fingerprint:empty.fingerprint})
 await h.cmd('document-import.undo',{id:undoable})
 return {fixture,movein,fixed:another,documents: (await h.state()).importedDocuments}
}

export async function proposifyBrowser(page,context,app) {
 const fixture=await proposifyFixture(),{mkdir}=await import('node:fs/promises'),{join}=await import('node:path')
 const api=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());const value=await r.json();return value.result??value}
 const capture=async phase=>{
  if(!process.env.PLATTER_SCREENSHOTS)return
  await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true})
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.evaluate(async()=>document.fonts.ready)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'MIG-002-'+phase+'-'+width+'.png')})
  }
  await page.setViewportSize({width:1440,height:1000})
 }
 const actor=(await (await context.request.get(app.origin+'/api/platter/state')).json()).actor
 const client=await api('client.save',{name:'Synthetic browser client',email:actor.email})
 const draft=await api('proposal.prepare',{clientId:client.id,title:'Synthetic browser priced draft',scope:'Owner-priced browser work',packages:[{id:'owner',label:'Owner price',price:'725.25'}],depositPercent:'25'})
 await page.goto(app.origin+'/app/import')
 await page.getByLabel('Move-in name',{exact:true}).fill('Synthetic Proposify browser move-in')
 await page.getByLabel('Export source').selectOption('proposify')
 await page.getByRole('button',{name:'Start document move-in',exact:true}).click()
 const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Synthetic Proposify browser move-in',exact:true})})
 await section.getByLabel('Exported files').setInputFiles(fixture.zips.map(file=>({name:file.filename,mimeType:file.filename.endsWith('.zip')?'application/zip':'text/csv',buffer:file.bytes})))
 await section.getByRole('button',{name:'Upload or resume files',exact:true}).click()
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-document-upload]')).every(f=>!f.querySelector('input[type=file]').files.length))
 await section.getByRole('button',{name:'Preview document move-in',exact:true}).click()
 assert.equal(await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).count(),0)
 for(const [key,column] of Object.entries(proposifyMapping))await section.locator('select[name="column:'+key+'"]').selectOption(column)
 await section.getByLabel('Separate template PDF').selectOption(hash(fixture.template))
 await section.getByRole('button',{name:'Review report matches',exact:true}).click()
 assert.equal(await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).count(),0)
 for(const [record,row] of [[1,29],[2,28]])await section.locator('select[name="match:'+hash(Buffer.from(fixture.csv))+':'+row+'"]').selectOption(hash(fixture.originals[record]))
 await section.getByRole('button',{name:'Review report matches',exact:true}).click()
 assert.equal(await section.locator('select[name^="match:"]').count(),30)
 await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).scrollIntoViewIfNeeded();await capture('review')
 await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).click()
 for(let i=0;i<8&&await section.getByRole('button',{name:'Continue document move-in',exact:true}).count();i++)await section.getByRole('button',{name:'Continue document move-in',exact:true}).click()
 const retained=page.locator('section').filter({has:page.getByRole('heading',{name:'Retained imported originals',exact:true})})
 assert.equal(await retained.getByRole('link',{name:'Download original PDF',exact:true}).count(),31)
 assert.equal(await retained.getByText('Read-only open document; reissue pending',{exact:true}).count(),6)
 for(const original of [fixture.originals[0],fixture.originals[29]]){const r=await context.request.get(app.origin+'/api/platter/imported-original?document='+hash(original));assert.equal(r.status(),200);assert.deepEqual(await r.body(),original)}
 await retained.getByRole('heading',{name:'Synthetic proposal 30',exact:true}).scrollIntoViewIfNeeded();await capture('originals')
 await section.getByText('Apply Proposify template pages',{exact:true}).click()
 await section.getByLabel('Priced destination draft').selectOption(draft.id+':1')
 await section.getByLabel('Independent template name').fill('Synthetic browser template')
 await section.getByRole('checkbox').check()
 await section.getByRole('button',{name:'Review fixed-page application',exact:true}).click()
 const review=section.locator('section').filter({has:page.getByRole('heading',{name:'Review fixed pages and supplied prices',exact:true})})
 assert.match(await review.innerText(),/\$725\.25 USD/)
 await section.getByRole('button',{name:'Apply fixed pages and save independent template',exact:true}).scrollIntoViewIfNeeded();await capture('template-review')
 await section.getByRole('button',{name:'Apply fixed pages and save independent template',exact:true}).click()
 await section.getByRole('link',{name:'Open destination draft',exact:true}).click()
 assert.equal(await page.getByRole('link',{name:'Export Word document',exact:true}).count(),0)
 const file=await context.request.get(await page.getByRole('link',{name:'Download original PDF',exact:true}).getAttribute('href'))
 assert.deepEqual(await file.body(),fixture.template)
 await page.getByRole('heading',{name:'Document files',exact:true}).scrollIntoViewIfNeeded();await capture('template')
 await page.goto(app.origin+'/app/import')
 await section.getByRole('button',{name:'Open document journal',exact:true}).click()
 const csvLink=section.getByRole('link',{name:/Download uploads.*documents.csv/})
 const csv=await context.request.get(await csvLink.getAttribute('href'));assert.deepEqual(await csv.body(),Buffer.from(fixture.csv))
 await section.getByRole('button',{name:'Undo document move-in',exact:true}).click()
 assert.match(await page.getByRole('alert').innerText(),/Dependent drafts or templates/)
 await section.getByRole('button',{name:'Undo fixed-page application',exact:true}).click()
 for(let i=0;i<10&&await section.getByRole('button',{name:/^(Undo document move-in|Continue document undo)$/,exact:true}).count();i++)await section.getByRole('button',{name:/^(Undo document move-in|Continue document undo)$/,exact:true}).click()
 assert.match(await section.innerText(),/Import undone/)
 assert.equal(await page.getByRole('heading',{name:'Retained imported originals',exact:true}).count(),0)
 await section.getByRole('heading',{name:'Synthetic Proposify browser move-in',exact:true}).scrollIntoViewIfNeeded();await capture('undo')
}

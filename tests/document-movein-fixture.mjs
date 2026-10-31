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
  pdf.setTitle(i===14?'Synthetic exported filename':title);pdf.setSubject('Synthetic Proposify client');pdf.setCreationDate(new Date('2026-02-01T12:00:00Z'))
  pdf.addPage().drawText('Synthetic Proposify original '+i,{x:40,y:700,size:16,font})
  if(signed)pdf.addPage().drawText('Signature page',{x:40,y:700,size:16,font})
  originals.push(Buffer.from(await pdf.save()))
  expected.push({title,client:'Synthetic Proposify client',createdDate:'2026-02-01',signedDate:signed?'2026-02-14':'',status:signed?'Signed':'Sent',value:i===1?'1,200.50':String(i*100),currency:i===30?'EUR':'USD'})
 }
 const pdf=await PDFDocument.create();pdf.setTitle('Synthetic template');pdf.addPage().drawText('Synthetic template fixed page',{x:40,y:700,size:16})
 const template=Buffer.from(await pdf.save()),csv='Money,Amount,Stage,Customer,Completed,Proposal,Created\n'+expected.slice().reverse().map(r=>[r.currency,JSON.stringify(r.value),r.status,r.client,r.signedDate,r.title,r.createdDate].join(',')).join('\n')
 const files=Object.fromEntries(originals.map((bytes,i)=>['./exports/source-'+(30-i)+'.pdf',bytes]))
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
 const choices={...Object.fromEntries(repeated.map(r=>[r.id,hash(fixture.originals[Number(r.evidence.value)/100-1])])),[hash(Buffer.from(fixture.csv))+':17']:hash(fixture.originals[13])}
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
 await h.cmd('document-import.template-apply',{...input,templateName:'Different name',fingerprint:preview.fingerprint},cookie,409)
 await h.cmd('document-import.template-apply',{...input,consent:false,fingerprint:preview.fingerprint},cookie,400)
 const before=(await h.state(cookie)).templates.length
 const attempts=await Promise.all([1,2].map(()=>h.send('/api/platter/command',{name:'document-import.template-apply',input:{...input,fingerprint:preview.fingerprint}},cookie)))
 assert.ok(attempts.every(r=>[200,409].includes(r.status))&&attempts.some(r=>r.status===200),'concurrent application is served once or held without duplicate output')
 const served=attempts.find(r=>r.status===200).value,applied=served.result??served
 assert.equal((await h.state(cookie)).templates.length,before+1)
 return {client,draft,input,preview,applied}
}
export async function proposifyJourney(h) {
 const erased=await h.cmd('client.save',{name:'Synthetic Proposify client',email:['synthetic-erased-person','example.invalid'].join('@')})
 await h.cmd('client.erase',{id:erased.id,confirmName:'Synthetic Proposify client'})
 const fixture=await proposifyFixture(),start=await h.cmd('document-import.create',{provider:'proposify',label:'Synthetic mapping review'})
 const files=[...fixture.originals.map((bytes,i)=>({filename:'source-'+i+'.pdf',bytes})),{filename:'separate-template.pdf',bytes:fixture.template},{filename:'documents.csv',bytes:Buffer.from(fixture.csv)}]
 for(const file of files)await uploadMovein(h,start.id,file)
 const missing=await h.cmd('document-import.preview',{id:start.id})
 assert.equal(missing.canApply,false);assert.equal(missing.report.mappingRequired,true)
 await h.cmd('document-import.apply',{id:start.id,fingerprint:missing.fingerprint},h.owner,409)
 const review={columns:proposifyMapping,templateDocument:hash(fixture.template)}
 const initial=await h.cmd('document-import.preview',{id:start.id,...review})
 const choices={}
 for(const r of initial.report.rows.filter(r=>r.title==='Repeated title'))choices[r.id]=hash(fixture.originals[Number(r.evidence.value)/100-1])
 choices[hash(Buffer.from(fixture.csv))+':17']=hash(fixture.originals[13])
 assert.equal(initial.report.rows.find(r=>r.evidence.value==='1400').requiresChoice,true,'unreliable PDF metadata requires an explicit owner match')
 const reviewed=await h.cmd('document-import.preview',{id:start.id,...review,choices})
 await h.cmd('document-import.apply',{id:start.id,...review,columns:{...proposifyMapping,value:'Money',currency:'Amount'},choices,fingerprint:reviewed.fingerprint},h.owner,409)
 await h.cmd('document-import.preview',{id:start.id,columns:proposifyMapping,templateDocument:hash(fixture.originals[0])},h.owner,409)
 let result=await h.cmd('document-import.apply',{id:start.id,...review,choices,fingerprint:reviewed.fingerprint})
 while(result.job.state!=='completed')result=await h.cmd('document-import.continue',{id:start.id})
 const imported=await h.state(),documents=imported.importedDocuments
 assert.deepEqual(imported.clients,[],'retained report facts cannot recreate the erased person')
 assert.deepEqual(imported.proposals,[],'open source proposals remain held without native execution')
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
 await h.cmd('document-import.template-apply',{...fixed.input,templateName:'Changed choice',fingerprint:fixed.preview.fingerprint},h.owner,409)
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
 const raceFiles=[]
 for(const title of ['Synthetic concurrent source','Synthetic concurrent template']){const pdf=await PDFDocument.create();pdf.setTitle(title);pdf.setCreationDate(new Date('2026-02-01T12:00:00Z'));pdf.addPage().drawText(title);raceFiles.push({filename:raceFiles.length?'template.pdf':'source.pdf',bytes:Buffer.from(await pdf.save())})}
 const race=await h.cmd('document-import.create',{provider:'proposify',label:'Synthetic concurrent output and undo'})
 for(const file of [...raceFiles,{filename:'report.csv',bytes:Buffer.from('Money,Amount,Stage,Customer,Completed,Proposal,Created\nUSD,10,Sent,Synthetic,,Synthetic concurrent source,2026-02-01')}])await uploadMovein(h,race.id,file)
 const raceReview={id:race.id,columns:proposifyMapping,templateDocument:hash(raceFiles[1].bytes)},racePlan=await h.cmd('document-import.preview',raceReview)
 await h.cmd('document-import.apply',{...raceReview,fingerprint:racePlan.fingerprint})
 const raceDraft=await h.cmd('proposal.prepare',{clientId:fixed.client.id,title:'Synthetic race destination',scope:'Owner prices',optionOne:'Owner',priceOne:'500',optionTwo:'Expanded',priceTwo:'900',depositPercent:'25'})
 const raceInput={id:race.id,proposalId:raceDraft.id,version:1,templateName:'Synthetic concurrent template',consent:true},racePreview=await h.cmd('document-import.template-preview',raceInput)
 const beforeRaceTemplates=(await h.state()).templates.length
 const [application,undo]=await Promise.all([h.send('/api/platter/command',{name:'document-import.template-apply',input:{...raceInput,fingerprint:racePreview.fingerprint}},h.owner),h.send('/api/platter/command',{name:'document-import.undo',input:{id:race.id}},h.owner)])
 if(application.status===200){
  assert.equal(undo.status,409,'a concurrent dependent application refuses the whole undo')
  assert.equal((await h.state()).importedDocuments.filter(d=>d.moveinId===race.id).length,2)
  await h.cmd('document-import.template-undo',{id:race.id,applicationId:(application.value.result??application.value).applicationId})
  await h.cmd('document-import.undo',{id:race.id})
 }else{
  assert.ok([404,409].includes(application.status),application.text);assert.equal(undo.status,200,undo.text)
  assert.equal((await h.state()).templates.length,beforeRaceTemplates,'undo winning the race creates no dependent template')
 }
 assert.equal((await h.state()).importedDocuments.filter(d=>d.moveinId===race.id).length,0)
 const destination=await h.cmd('proposal.prepare',{clientId:fixed.client.id,title:'Synthetic authority review',scope:'Explicit owner prices',optionOne:'Owner',priceOne:'500',optionTwo:'Expanded',priceTwo:'900',depositPercent:'25'})
 const input={id:start.id,proposalId:destination.id,version:1,templateName:'Synthetic authority review',consent:true}
 const approved=await h.cmd('document-import.template-preview',input)
 const owner=(await h.state()).actor,successorAddress=['synthetic-proposify-successor','example.invalid'].join('@')
 await h.send('/auth/invite',{email:successorAddress,displayName:'Synthetic successor',role:'member',returnTo:'/app'},h.owner)
 const successor=await h.signIn(successorAddress),successorId=(await h.state(successor)).actor.id
 assert.equal((await h.send('/auth/operator/role',{operatorId:successorId,role:'owner'},await h.signIn(owner.email))).status,200)
 assert.equal((await h.send('/auth/operator/role',{operatorId:owner.id,role:'admin'},await h.signIn(successorAddress))).status,200)
 const revoked=await h.signIn(owner.email)
 const tables=['p_proposals','p_revisions','p_document_moveins','p_imported_documents','p_proposify_applications','p_personal_templates','p_imported_document_links','p_document_media','p_attachment_files','p_attachment_chunks','ik_jobs','ik_provenance']
 const frozen=async()=>Promise.all(tables.map(table=>h.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all().then(r=>r.results))),beforeRefusals=await frozen()
 await h.cmd('document-import.template-preview',input,revoked,403)
 await h.cmd('document-import.template-apply',{...input,fingerprint:approved.fingerprint},revoked,403)
 await h.cmd('document-import.template-undo',{id:start.id,applicationId:another.applied.applicationId},revoked,403)
 assert.equal((await h.send('/api/platter/imported-original?document='+hash(fixture.originals[0]),undefined,revoked)).status,403)
 assert.deepEqual((await h.state(revoked)).importedDocuments,[])
 assert.deepEqual(await frozen(),beforeRefusals,'revoked authority exposes no originals and changes no business records')
 return {fixture,movein,fixed:another,documents}
}

export async function proposifyBrowser(page,context,app) {
 const fixture=await proposifyFixture(),{mkdir}=await import('node:fs/promises'),{join}=await import('node:path')
 const api=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());const value=await r.json();return value.result??value}
 const capture=async (phase,anchor)=>{
  if(!process.env.PLATTER_SCREENSHOTS)return
  await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true})
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.evaluate(async()=>document.fonts.ready)
   if(anchor)await anchor.scrollIntoViewIfNeeded()
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
 for(const [record,row] of [[1,29],[2,28],[13,17]])await section.locator('select[name="match:'+hash(Buffer.from(fixture.csv))+':'+row+'"]').selectOption(hash(fixture.originals[record]))
 await section.getByRole('button',{name:'Review report matches',exact:true}).click()
 assert.equal(await section.locator('select[name^="match:"]').count(),30)
 await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).scrollIntoViewIfNeeded();await capture('review',section.getByRole('group',{name:'Proposify source evidence columns'}))
 await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).click()
 for(let i=0;i<8&&await section.getByRole('button',{name:'Continue document move-in',exact:true}).count();i++)await section.getByRole('button',{name:'Continue document move-in',exact:true}).click()
 const retained=page.locator('section').filter({has:page.getByRole('heading',{name:'Retained imported originals',exact:true})})
 assert.equal(await retained.getByRole('link',{name:'Download original PDF',exact:true}).count(),31)
 assert.equal(await retained.getByText('Read-only open document; reissue pending',{exact:true}).count(),6)
 for(const original of [fixture.originals[0],fixture.originals[29]]){const r=await context.request.get(app.origin+'/api/platter/imported-original?document='+hash(original));assert.equal(r.status(),200);assert.deepEqual(await r.body(),original)}
 await retained.getByRole('heading',{name:'Synthetic proposal 30',exact:true}).scrollIntoViewIfNeeded();await capture('originals',retained.getByRole('heading',{name:'Synthetic proposal 30',exact:true}))
 await section.getByText('Apply Proposify template pages',{exact:true}).click()
 await section.getByLabel('Priced destination draft').selectOption(draft.id+':1')
 await section.getByLabel('Independent template name').fill('Synthetic browser template')
 await section.getByRole('checkbox').check()
 await section.getByRole('button',{name:'Review fixed-page application',exact:true}).click()
 const review=section.locator('section').filter({has:page.getByRole('heading',{name:'Review fixed pages and supplied prices',exact:true})})
 assert.match(await review.innerText(),/\$725\.25 USD/)
 await section.getByRole('button',{name:'Apply fixed pages and save independent template',exact:true}).scrollIntoViewIfNeeded();await capture('template-review',review)
 await section.getByRole('button',{name:'Apply fixed pages and save independent template',exact:true}).click()
 await section.getByRole('link',{name:'Open destination draft',exact:true}).click()
 assert.equal(await page.getByRole('link',{name:'Export Word document',exact:true}).count(),0)
 const file=await context.request.get(app.origin+await page.getByRole('link',{name:'Download original PDF',exact:true}).getAttribute('href'))
 assert.deepEqual(await file.body(),fixture.template)
 await page.getByRole('heading',{name:'Document files',exact:true}).scrollIntoViewIfNeeded();await capture('template',page.getByRole('heading',{name:'Document files',exact:true}))
 await page.goto(app.origin+'/app/import')
 await section.getByRole('button',{name:'Open document journal',exact:true}).click()
 const csvLink=section.getByRole('link',{name:/Download uploads.*documents.csv/})
 const csv=await context.request.get(app.origin+await csvLink.getAttribute('href'));assert.deepEqual(await csv.body(),Buffer.from(fixture.csv))
 await section.getByRole('button',{name:'Undo document move-in',exact:true}).click()
 assert.match(await page.getByRole('alert').innerText(),/Dependent drafts or templates/)
 await section.getByRole('button',{name:'Undo fixed-page application',exact:true}).click()
 for(let i=0;i<10&&await section.getByRole('button',{name:/^(Undo document move-in|Continue document undo)$/,exact:true}).count();i++)await section.getByRole('button',{name:/^(Undo document move-in|Continue document undo)$/,exact:true}).click()
 assert.match(await section.innerText(),/Import undone/)
 assert.equal(await page.getByRole('heading',{name:'Retained imported originals',exact:true}).count(),0)
 await section.getByRole('heading',{name:'Synthetic Proposify browser move-in',exact:true}).scrollIntoViewIfNeeded();await capture('undo',section.getByRole('heading',{name:'Synthetic Proposify browser move-in',exact:true}))
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
  // A title-only suggestion must not replace the PDF named by the source export.
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica)
  pdf.setTitle('Shared proposal');pdf.setSubject('Different synthetic client')
  pdf.addPage().drawText('Different synthetic client agreement',{x:40,y:700,size:16,font})
  const wrongOriginal=Buffer.from(await pdf.save())
  const source=provider==='ignition'?{
   'clients.csv':'Client ID,Client Name\nc-review,Synthetic intended client',
   'proposals.csv':'Proposal ID,Proposal Name,Client ID,Created Date,Status,Currency,Value,PDF\np-review,Shared proposal,c-review,2026-01-15,Accepted,USD,100.00,alpha.pdf',
  }:{'proposals.csv':'Page ID,Title,Client,Date,Status,Currency,Value,PDF\np-review,Shared proposal,Synthetic intended client,2026-01-15,Accepted,USD,100.00,alpha.pdf'}
  const missing=await h.cmd('document-import.create',{label:'Synthetic missing named PDF',sourceProvider:provider})
  await uploadMovein(h,missing.id,{filename:'missing-named-pdf.zip',bytes:Buffer.from(zipSync({'beta.pdf':wrongOriginal,...Object.fromEntries(Object.entries(source).map(([name,text])=>[name,strToU8(text)]))}))})
  const bindingKey='binding:'+provider+':proposals:p-review:document'
  const initialMissing=await h.cmd('document-import.preview',{id:missing.id})
  const suggestion=initialMissing.report.exports.bindings.find(b=>b.key===bindingKey)
  assert.deepEqual(suggestion.candidates.map(c=>c.id),[hash(wrongOriginal)])
  assert.equal(suggestion.selected,null,'a different client same-title PDF is only a suggestion')
  assert.equal(suggestion.reviewed,false,'a missing named PDF requires explicit review')
  assert.equal(initialMissing.canApply,false)
  const beforeMissing=await h.state()
  await h.cmd('document-import.apply',{id:missing.id,fingerprint:initialMissing.fingerprint},h.owner,409)
  const afterMissing=await h.state()
  for(const key of ['importedSourceFacts','importedDocuments','businessRecords','proposals'])assert.deepEqual(afterMissing[key],beforeMissing[key],'unreviewed missing PDF changes no business records')
  const omittedChoices={[bindingKey]:'unmapped'}
  const reviewedMissing=await h.cmd('document-import.preview',{id:missing.id,choices:omittedChoices})
  assert.equal(reviewedMissing.canApply,true)
  let omitted=await h.cmd('document-import.apply',{id:missing.id,choices:omittedChoices,fingerprint:reviewedMissing.fingerprint})
  while(omitted.job.state!=='completed')omitted=await h.cmd('document-import.continue',{id:missing.id})
  assert.equal((await h.state()).importedSourceFacts.find(f=>f.id===provider+':proposals:p-review').bindings.document,null,'explicit omission never links the suggested other client PDF')
  let missingUndo=await h.cmd('document-import.undo',{id:missing.id})
  while(missingUndo.job.state!=='undone')missingUndo=await h.cmd('document-import.undo',{id:missing.id})
  console.log('PROBE MIG-004 finding A '+provider+': missing alpha.pdf plus different-client same-title beta.pdf -> unreviewed suggestion, apply 409 with unchanged records; explicit omission applies without a document binding')
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

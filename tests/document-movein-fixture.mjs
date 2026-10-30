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
export async function fixedTemplate(h,movein,cookie=h.owner,output={}) {
 const client=(await h.state(cookie)).clients.find(c=>c.email===h.auth.OWNER_EMAIL)??await h.cmd('client.save',{name:'Synthetic template client',email:h.auth.OWNER_EMAIL},cookie)
 const draft=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic owner-priced draft',scope:'Owner-supplied work',packages:[{id:'chosen',label:'Owner priced',price:'725.25'}],depositPercent:'25'},cookie)
 const input={id:movein.id,proposalId:draft.id,version:draft.version,templateName:'Synthetic independent template',consent:true,...output}
 const preview=await h.cmd('document-import.template-preview',input,cookie)
 await h.cmd('document-import.template-apply',{...input,templateName:'Different name',fingerprint:preview.fingerprint},cookie,409)
 await h.cmd('document-import.template-apply',{...input,consent:false,fingerprint:preview.fingerprint},cookie,400)
 const before=(await h.state(cookie)).templates.length
 const attempts=await Promise.all([1,2].map(()=>h.send('/api/platter/command',{name:'document-import.template-apply',input:{...input,fingerprint:preview.fingerprint}},cookie)))
 assert.ok(attempts.every(r=>[200,409].includes(r.status))&&attempts.some(r=>r.status===200),'concurrent application is served once or held without duplicate output')
 const served=attempts.find(r=>r.status===200).value,applied=served.result??served
 assert.equal((await h.state(cookie)).templates.length,before+(!output.outputKind||output.outputKind==='template'?1:0))
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
 await proposifyNativeOutputs(h,{id:start.id},fixture)
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
 const tables=['p_library_items','p_imported_library','p_library_media','p_library_uses','p_proposals','p_revisions','p_document_moveins','p_imported_documents','p_proposify_applications','p_personal_templates','p_imported_document_links','p_document_media','p_attachment_files','p_attachment_chunks','ik_jobs','ik_provenance']
 const frozen=async()=>Promise.all(tables.map(table=>h.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all().then(r=>r.results))),beforeRefusals=await frozen()
 await h.cmd('document-import.template-preview',input,revoked,403)
 await h.cmd('document-import.template-apply',{...input,fingerprint:approved.fingerprint},revoked,403)
 await h.cmd('document-import.template-undo',{id:start.id,applicationId:another.applied.applicationId},revoked,403)
 assert.equal((await h.send('/api/platter/imported-original?document='+hash(fixture.originals[0]),undefined,revoked)).status,403)
 assert.deepEqual((await h.state(revoked)).importedDocuments,[])
 assert.deepEqual(await frozen(),beforeRefusals,'revoked authority exposes no originals and changes no business records')
 return {fixture,movein,fixed:another,documents}
}

// The same public reviewed door serves safe reissue and usable library copies.
export async function proposifyNativeOutputs(h,movein,fixture,cookie=h.owner) {
 const source=hash(fixture.originals[24]),before=(await h.state(cookie)).importedDocuments
 const reissue=await fixedTemplate(h,movein,cookie,{outputKind:'reissue',documentId:source})
 const state=await h.state(cookie),draft=state.proposals.find(p=>p.id===reissue.draft.id)
 assert.equal(draft.status,'draft');assert.equal(draft.options[0].cents,72525)
 assert.deepEqual(JSON.parse(draft.recipient_plan),[])
 assert.equal(draft.approved_by,null);assert.equal(draft.shareToken,undefined);assert.equal(draft.collectionPolicy.enabled,false)
 const original=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+draft.id+'/'+draft.document.fixedPdf.fileId,{headers:{cookie}})
 assert.equal(original.status,200);assert.deepEqual(Buffer.from(await original.arrayBuffer()),fixture.originals[24])
 const retained=await h.mf.dispatchFetch(h.origin+'/api/platter/imported-original?document='+source,{headers:{cookie}})
 assert.deepEqual(Buffer.from(await retained.arrayBuffer()),fixture.originals[24])
 assert.deepEqual((await h.state(cookie)).importedDocuments,before,'reissue never rewrites the retained original or report')
 const request={...reissue.input,proposalId:(await h.cmd('proposal.prepare',{clientId:reissue.client.id,title:'Synthetic unsafe source',scope:'Owner work',packages:[{id:'owner',label:'Owner',price:'725.25'}],depositPercent:'25'},cookie)).id,version:1,documentId:hash(fixture.originals[0])}
 const unchanged=(await h.state(cookie)).proposals
 await h.cmd('document-import.template-preview',request,cookie,409)
 assert.deepEqual((await h.state(cookie)).proposals,unchanged,'signed originals cannot be reissued')
 await h.cmd('document-import.template-apply',{...reissue.input,outputKind:'library',fingerprint:reissue.preview.fingerprint},cookie,409)
 await h.cmd('document-import.template-undo',{id:movein.id,applicationId:reissue.applied.applicationId},cookie)
 assert.equal((await h.state(cookie)).proposals.find(p=>p.id===reissue.draft.id).document?.fixedPdf,undefined)
 await h.cmd('document-import.template-apply',{...reissue.input,fingerprint:reissue.preview.fingerprint},cookie,409)
 const library=await fixedTemplate(h,movein,cookie,{outputKind:'library',documentId:hash(fixture.template)})
 const item=(await h.state(cookie)).libraryItems.find(i=>i.id===library.applied.libraryId)
 assert.match(item.title,/rebuild in the editor/)
 const destination=await h.cmd('proposal.prepare',{clientId:reissue.client.id,title:'Synthetic library destination',scope:'Independent work',packages:[{id:'owner',label:'Owner',price:'925.50'}],depositPercent:'25'},cookie)
 await h.cmd('library.insert',{id:destination.id,version:1,itemId:item.id,itemVersion:1,mode:'linked',consent:true},cookie,409)
 await h.cmd('library.insert',{id:destination.id,version:1,itemId:item.id,itemVersion:1,mode:'detached',consent:true},cookie)
 const inserted=(await h.state(cookie)).proposals.find(p=>p.id===destination.id)
 assert.equal(inserted.options[0].cents,92550,'a section never replaces independently supplied prices')
 const pdf=await h.mf.dispatchFetch(h.origin+'/api/platter/document-export?id='+inserted.id+'&format=pdf',{headers:{cookie}})
 assert.equal(pdf.status,200)
 const {pdfPages}=await import('./pdf-document.mjs'),pages=await pdfPages(await pdf.arrayBuffer())
 assert.match(pages[0],/Synthetic template fixed page/)
 assert.match(pages.slice(1).join(' '),/925.50/)
 assert.equal((await h.send('/api/platter/document-export?id='+inserted.id+'&format=docx',undefined,cookie)).status,409)
 const outsiderAddress=['synthetic-platter-library-reader','example.invalid'].join('@')
 await h.send('/auth/invite',{email:outsiderAddress,displayName:'Synthetic library reader',role:'member',returnTo:'/app'},cookie)
 const outsider=await h.signIn(outsiderAddress)
 assert.equal((await h.state(outsider)).libraryItems.some(i=>i.id===item.id),false,'source library custody stays owner-only')
 await h.cmd('library.insert',{id:destination.id,version:inserted.version,itemId:item.id,itemVersion:1,mode:'detached',consent:true},outsider,403)
 const beforeUndo=await h.state(cookie)
 await h.cmd('document-import.template-undo',{id:movein.id,applicationId:library.applied.applicationId},cookie,409)
 await h.cmd('document-import.undo',{id:movein.id},cookie,409)
 assert.deepEqual((await h.state(cookie)).libraryItems,beforeUndo.libraryItems,'dependent library copies prevent undo without losing records')
 const reversible=await fixedTemplate(h,movein,cookie,{outputKind:'library',documentId:hash(fixture.template)})
 await h.cmd('document-import.template-undo',{id:movein.id,applicationId:reversible.applied.applicationId},cookie)
 assert.equal((await h.state(cookie)).libraryItems.some(i=>i.id===reversible.applied.libraryId),false)
 return {reissue,library,destination}
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
 // Existing controls explicitly choose each native output and retain byte-exact originals.
 for(const outputKind of ['reissue','library']){
  const target=await api('proposal.prepare',{clientId:client.id,title:'Synthetic browser '+outputKind,scope:'Owner supplied work',packages:[{id:'owner',label:'Owner',price:'925.50'}],depositPercent:'25'})
  await page.goto(app.origin+'/app/import')
  await section.getByText('Apply Proposify template pages',{exact:true}).click()
  await section.getByLabel('Output purpose').selectOption(outputKind)
  await section.getByLabel('Source PDF',{exact:true}).selectOption(hash(outputKind==='reissue'?fixture.originals[24]:fixture.template))
  await section.getByLabel('Priced destination draft').selectOption(target.id+':1')
  await section.getByLabel('Independent template name').fill('Synthetic browser '+outputKind)
  await section.getByRole('checkbox').check()
  await section.getByRole('button',{name:'Review fixed-page application',exact:true}).click()
  const review=section.locator('section').filter({has:page.getByRole('heading',{name:'Review fixed pages and supplied prices',exact:true})})
  assert.match(await review.innerText(),/925.50/)
  await capture(outputKind+'-review',review)
  await section.getByRole('button',{name:outputKind==='reissue'?'Apply fixed pages to reissue draft':'Apply fixed pages and save library section',exact:true}).click()
  const status=outputKind==='reissue'?'Independent reissue draft saved; fresh approval and sending required':'Independent fixed-page library section saved; rebuild in the editor'
  const output=section.locator('article').filter({has:page.getByText(status,{exact:true})})
  assert.equal(await output.count(),1)
  await capture(outputKind+'-saved',output)
  await output.getByRole('link',{name:'Open destination draft',exact:true}).click()
  assert.equal(await page.getByRole('link',{name:'Export Word document',exact:true}).count(),0)
  const r=await context.request.get(app.origin+await page.getByRole('link',{name:'Download original PDF',exact:true}).getAttribute('href'))
  assert.deepEqual(await r.body(),outputKind==='reissue'?fixture.originals[24]:fixture.template)
  if(outputKind==='library'){
   const state=await(await context.request.get(app.origin+'/api/platter/state')).json()
   assert.equal(state.libraryItems.some(i=>i.title==='Synthetic browser library — rebuild in the editor'),true)
  }
  await page.goto(app.origin+'/app/import')
  await output.getByRole('button',{name:'Undo fixed-page application',exact:true}).click()
  const state=await(await context.request.get(app.origin+'/api/platter/state')).json()
  assert.equal(state.proposals.find(p=>p.id===target.id).document?.fixedPdf,undefined)
  await capture(outputKind+'-undo',section.getByRole('heading',{name:'Synthetic Proposify browser move-in',exact:true}))
 }
 await section.getByRole('button',{name:'Undo fixed-page application',exact:true}).click()
 for(let i=0;i<10&&await section.getByRole('button',{name:/^(Undo document move-in|Continue document undo)$/,exact:true}).count();i++)await section.getByRole('button',{name:/^(Undo document move-in|Continue document undo)$/,exact:true}).click()
 assert.match(await section.innerText(),/Import undone/)
 assert.equal(await page.getByRole('heading',{name:'Retained imported originals',exact:true}).count(),0)
 await section.getByRole('heading',{name:'Synthetic Proposify browser move-in',exact:true}).scrollIntoViewIfNeeded();await capture('undo',section.getByRole('heading',{name:'Synthetic Proposify browser move-in',exact:true}))
}

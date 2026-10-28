import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { zipSync, strToU8 } from 'fflate'

export const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function moveinFixture(variant='') {
 const make=async(title,label,signed=true)=>{
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica)
  pdf.setTitle(title+variant);pdf.setModificationDate(new Date('2026-01-15T12:00:00Z'));pdf.setSubject('Synthetic platter client');pdf.setCreationDate(new Date('2026-01-15T12:00:00Z'))
  pdf.addPage().drawText(label+variant,{x:40,y:700,size:16,font})
  if(signed)pdf.addPage().drawText(label==='Synthetic platter 2'?'Signature page':'Certificate of completion',{x:40,y:700,size:16,font})
  return Buffer.from(await pdf.save())
 }
 const originals=await Promise.all([make('Alpha','Synthetic platter 1'),make('Beta','Synthetic platter 2'),make('Review','Synthetic platter 3'),make('Review','Synthetic platter 4'),make('Open','Synthetic platter 5',false)])
 const csv='Title,Client,Date,Status,Value\nAlpha'+variant+',Synthetic platter client,2026-01-15,Completed,1200\nReview'+variant+',Synthetic platter client,2026-01-15,Completed,2400\nBeta'+variant+',Another client,2025-01-15,Completed,3600'
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

export async function nativeMoveinFixture(clientId) {
 const {wordFixture}=await import('./document-import-fixture.mjs')
 const original=await moveinFixture(' native'),template=Buffer.from(await wordFixture({headings:2,rows:6,images:1})),library=Buffer.from(await wordFixture({headings:10,rows:0,images:0,tokens:false,prefix:'Synthetic library'}))
 const catalog=Buffer.from('Name,SKU,Type,SKUs_in_bundle,Category,Price,Cost,Currency,Description,Images,Billing_frequency\n'+Array.from({length:5},(_,i)=>'Synthetic product '+(i+1)+',SKU'+(i+1)+',product,,Synthetic,10.00,1.00,USD,Synthetic source,,one-off').join('\n'))
 const contacts=Buffer.from('First,Last,Email\nSynthetic,Platter,'+['synthetic-platter-9','example.invalid'].join('@'))
 const zips=[...original.zips.slice(0,2),{filename:'third.zip',bytes:Buffer.from(zipSync({'Open/2026/January/open.pdf':original.originals[4],'report.csv':strToU8(original.csv),'Templates/Editable.docx':template,'Library/Sections.docx':library,'catalog.csv':catalog,'contacts.csv':contacts}))}]
 const mapping={
  [hash(original.originals[4])]:{kind:'draft',clientId,price:'2500.00'},
  [hash(template)]:{kind:'template',price:'1200.00'},
  [hash(library)]:{kind:'library',shareConsent:true},
  [hash(catalog)]:{kind:'catalog',format:'pandadoc'},
  [hash(contacts)]:{kind:'contacts',format:'mapping',mapping:{delimiter:',',columns:{first_name:'First',last_name:'Last',email:'Email'}}},
 }
 return {...original,zips,template,library,catalog,contacts,mapping}
}
export async function applyNativeMovein(h,cookie=h.owner) {
 const client=await h.cmd('client.save',{name:'Synthetic move-in destination',email:['synthetic-platter-10','example.invalid'].join('@')},cookie),fixture=await nativeMoveinFixture(client.id)
 const {id}=await h.cmd('document-import.create',{label:'Synthetic native move-in'},cookie)
 for(const file of fixture.zips)await uploadMovein(h,id,file,cookie)
 const unresolved=await h.cmd('document-import.preview',{id},cookie),ambiguous=unresolved.report.rows.find(r=>r.candidates.length===2),choices={[ambiguous.id]:hash(fixture.originals[2])}
 const libraryHash=hash(fixture.library),libraryCount=(await h.state(cookie)).libraryItems.length
 await h.cmd('document-import.preview',{id,choices,mapping:{...fixture.mapping,[libraryHash]:{kind:'library',shareConsent:false}}},cookie,409)
 assert.equal((await h.state(cookie)).libraryItems.length,libraryCount,'refusing unapproved library sharing creates no resources')
 const reviewed=await h.cmd('document-import.preview',{id,choices,mapping:fixture.mapping},cookie)
 assert.equal(reviewed.canApply,true,JSON.stringify(reviewed.diagnostics))
 let result=await h.cmd('document-import.apply',{id,choices,mapping:fixture.mapping,fingerprint:reviewed.fingerprint},cookie)
 for(let tries=0;result.job.state!=='completed'&&tries<60;tries++)result=await h.cmd('document-import.continue',{id},cookie)
 assert.equal(result.job.state,'completed')
 return {id,fixture,client,choices,reviewed,result}
}

export async function assertNativeMovein(h,move,cookie=h.owner){
 const state=await h.state(cookie),resources=move.reviewed.resources
 assert.deepEqual([move.reviewed.report.arrived,move.reviewed.report.held,move.reviewed.report.unmapped,move.reviewed.report.duplicateDocuments,move.reviewed.report.arrivedDrafts,move.reviewed.report.arrivedResources],[4,0,2,1,1,17])
 const draft=state.proposals.find(p=>p.id===resources.find(r=>r.kind==='draft').id)
 assert.equal(draft.status,'draft');assert.equal(draft.client_id,move.client.id);assert.equal(draft.options[0].cents,250000)
 const fixed=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+draft.id+'/'+draft.document.fixedPdf.fileId,{headers:{cookie}})
 assert.equal(fixed.status,200);assert.deepEqual(Buffer.from(await fixed.arrayBuffer()),move.fixture.originals[4])
 const template=state.templates.find(t=>t.id===resources.find(r=>r.kind==='template').id),lines=template.snapshot.options[0].tables[0].lines
 assert.equal(lines.length,6);assert.equal(lines.filter(l=>l.catalogId).length,5)
 assert.deepEqual(lines.map(l=>l.unitPrice),['10.00','11.00','12.00','13.00','14.00','15.00'])
 assert.equal(template.snapshot.document.blocks.filter(b=>b.type==='image').length,1)
 assert.match(JSON.stringify(template.snapshot.document.merge.patterns),/Client.Company/)
 assert.equal(state.libraryItems.filter(i=>resources.some(r=>r.kind==='library'&&r.id===i.id)).length,10)
 const folders=state.resourceFolders.filter(f=>f.name==='Open'||f.name===['Open','2026'].join('/')||f.name===['Open','2026','January'].join('/'))
 assert.equal(folders.length,3);assert.equal(move.reviewed.report.arrivedFolders,5);assert.equal(state.importedDocuments.find(d=>d.id===hash(move.fixture.originals[0])).folders[0].name,'Completed');assert.equal(folders.find(f=>f.name===['Open','2026','January'].join('/')).parent_id,folders.find(f=>f.name===['Open','2026'].join('/')).id)
 assert.equal(draft.folderId,folders.find(f=>f.name===['Open','2026','January'].join('/')).id)
 assert.equal(state.businessRecords.contacts.filter(c=>c.email===['synthetic-platter-9','example.invalid'].join('@')).length,1)
 assert.equal(state.businessRecords.catalog.filter(c=>/^SKU[1-5]$/.test(c.sku)).length,5)
 const journal=await h.cmd('document-import.journal',{id:move.id},cookie)
 for(const [name,bytes]of [['word/'+hash(move.fixture.template)+'.docx',move.fixture.template],['word/'+hash(move.fixture.library)+'.docx',move.fixture.library],['business/'+hash(move.fixture.contacts)+'/contacts.csv',move.fixture.contacts],['business/'+hash(move.fixture.catalog)+'/catalog.csv',move.fixture.catalog]]){
  const response=await h.mf.dispatchFetch(h.origin+'/api/platter/imported-original?id='+move.id+'&name='+encodeURIComponent(name),{headers:{cookie}})
  assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes)
 }
 assert.deepEqual(JSON.parse(Buffer.from(journal.originals.find(o=>o.name==='reviewed-file-destinations.json').original.base64,'base64').toString()),move.fixture.mapping)
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_webhook_events WHERE proposal_id=?').bind(draft.id).first()).n,0,'move-in cannot create outbound lifecycle delivery')
 return {state,draft,template,journal}
}

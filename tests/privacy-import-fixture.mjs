import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { zipSync } from 'fflate'
import { uploadMovein,hash } from './document-movein-fixture.mjs'
import { applyBusiness } from './business-import-fixture.mjs'
import { privacyOffer } from './privacy-fixture.mjs'
export async function importedPrivacyFixture(h) {
 const id='synthetic-platter-privacy-import',name='Synthetic private imported contact',peerId='synthetic-platter-privacy-peer'
 const address=['synthetic-platter-private-import','example.test'].join('@'),peerAddress=['synthetic-platter-private-peer','example.test'].join('@')
 const csv=`client_id,name,email\n${id},${name},${address}\n${peerId},Synthetic retained peer,${peerAddress}`
 const preview=await h.cmd('import.preview',{csv}),applied=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint})
 const contactId='synthetic-platter-private-business-contact',companyId='synthetic-platter-private-company',businessPeerId='synthetic-platter-business-peer'
 const businessCsv=`company_id,company_name,contact_id,first_name,last_name,email,title,phone,billing_address,service_address,tax_exempt\n${companyId},Synthetic business,${contactId},Synthetic,Private,${address},Director,5550100,Private billing,Private delivery,no\n${companyId},Synthetic business,${businessPeerId},Synthetic,Peer,${peerAddress},Buyer,5550101,Private billing,Private delivery,no`
 const business=await applyBusiness(h,{kind:'contacts',format:'platter',csv:businessCsv})
 const businessPeer=(await h.state()).businessRecords.contacts.find(c=>c.id===businessPeerId)
 const makePdf=async(title,signed,personal=true)=>{const pdf=await PDFDocument.create();pdf.setTitle(title);pdf.setSubject(personal?name:'Synthetic peer');pdf.addPage().drawText(title+' '+(personal?address:peerAddress));if(signed)pdf.addPage().drawText('Certificate of completion');return Buffer.from(await pdf.save())}
 const openBytes=await makePdf('Synthetic private open document',false),retainedBytes=await makePdf('Synthetic retained imported agreement',true),peerBytes=await makePdf('Synthetic separate open document',false,false)
 const movein=await h.cmd('document-import.create',{label:'Synthetic private uploaded bundle'})
 await uploadMovein(h,movein.id,{filename:'synthetic-platter-private.zip',bytes:Buffer.from(zipSync({'open.pdf':openBytes,'signed.pdf':retainedBytes,'peer.pdf':peerBytes}))})
 const docReview=await h.cmd('document-import.preview',{id:movein.id})
 assert.equal(docReview.canApply,true)
 const docResult=await h.cmd('document-import.apply',{id:movein.id,fingerprint:docReview.fingerprint})
 const documentIds=[hash(openBytes),hash(retainedBytes)]
 const proposal=await h.cmd('proposal.prepare',{...privacyOffer,clientId:id,title:'Synthetic imported draft'})
 const peer=(await h.state()).clients.find(c=>c.id===peerId)
 const journal=await h.cmd('import.journal',{id:applied.job.id})
 assert.ok(journal.originals.some(o=>o.original.base64&&Buffer.from(o.original.base64,'base64').toString('utf8').includes(address)),'the before inventory actually contains the personal data')
 assert.ok(journal.originals.some(o=>o.original.status==='retained'),'the raw CSV exists before erasure')
 return {id,name,address,peerId,peer,csv,fingerprint:preview.fingerprint,jobId:applied.job.id,documentIds,openDocumentId:hash(openBytes),retainedDocumentId:hash(retainedBytes),peerDocumentId:hash(peerBytes),retainedBytes,peerBytes,moveinId:movein.id,docFingerprint:docReview.fingerprint,docJobId:docResult.job.id,contactId,companyId,businessPeerId,businessPeer,businessJobId:business.job.id,proposalId:proposal.id}
}
export async function assertImportedPrivacyErased(h,fixture,receipt,{undo=false}={}) {
 const state=await h.state(),client=state.clients.find(c=>c.id===fixture.id)
 assert.equal(client.name,'Erased contact');assert.equal(client.variable_fields,'{}');assert.notEqual(client.email,fixture.address)
 assert.ok(!state.proposals.some(p=>p.id===fixture.proposalId))
 assert.deepEqual(state.clients.find(c=>c.id===fixture.peerId),fixture.peer,'another imported contact keeps its exact native row')
 assert.ok(!state.businessRecords.contacts.some(c=>c.id===fixture.contactId))
 assert.deepEqual(state.businessRecords.contacts.find(c=>c.id===fixture.businessPeerId),fixture.businessPeer)
 const company=state.businessRecords.companies.find(c=>c.id===fixture.companyId)
 assert.ok(company);assert.equal(company.source_rows,undefined);assert.equal(company.billing_address,undefined);assert.equal(company.service_address,undefined)
 assert.equal(receipt.importedCustody.businessContactId,fixture.contactId)
 const businessJournal=await h.cmd('business-import.journal',{id:fixture.businessJobId})
 assert.equal(businessJournal.job.erasedRecords,2,'selected contact and copied company source are erased')
 assert.ok(!JSON.stringify(businessJournal).includes(fixture.address))
 assert.ok(businessJournal.originals.some(o=>o.original.reason==='unavailable-after-erasure'))
 const docJournal=await h.cmd('document-import.journal',{id:fixture.moveinId})
 assert.ok(!state.importedDocuments.some(d=>d.id===fixture.openDocumentId))
 assert.ok(state.importedDocuments.some(d=>d.id===fixture.peerDocumentId))
 assert.ok(receipt.erasedImportedDocumentIds.includes(fixture.openDocumentId))
 assert.ok(receipt.retainedImported.some(d=>d.documentId===fixture.retainedDocumentId&&d.sha256===hash(fixture.retainedBytes)&&d.exception.includes('business records')))
 const original=docJournal.originals.find(o=>o.name==='documents/'+fixture.retainedDocumentId+'.pdf')
 assert.equal(hash(Buffer.from(original.original.base64,'base64')),hash(fixture.retainedBytes))
 for(const [documentId,bytes] of [[fixture.retainedDocumentId,fixture.retainedBytes],[fixture.peerDocumentId,fixture.peerBytes]]){const response=await h.mf.dispatchFetch(h.origin+'/api/platter/imported-original?document='+documentId,{headers:{cookie:h.owner}});assert.equal(response.status,200);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(bytes))}
 assert.equal((await h.send('/api/platter/imported-original?document='+fixture.openDocumentId,undefined,h.owner)).status,404)
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_document_uploads WHERE movein_id=?').bind(fixture.moveinId).first()).n,0)
 assert.ok(docJournal.originals.some(o=>o.original.reason==='unavailable-after-erasure'))
 assert.equal(docJournal.report,null)
 await h.cmd('document-import.apply',{id:fixture.moveinId,fingerprint:fixture.docFingerprint})
 assert.ok(!(await h.state()).importedDocuments.some(d=>d.id===fixture.openDocumentId),'captured document apply cannot resurrect its erased original')
 const journal=await h.cmd('import.journal',{id:fixture.jobId})
 assert.equal(journal.job.erasedRecords,1)
 assert.ok(journal.originals.every(o=>o.original.status==='unavailable'&&o.original.reason==='unavailable-after-erasure'))
 assert.ok(!JSON.stringify(journal).includes(fixture.address));assert.ok(!JSON.stringify(journal).includes(fixture.name))
 assert.equal(receipt.importedCustody.originalPolicy,'withdraw-affected-artifacts')
 assert.ok(receipt.importedCustody.jobIds.includes(fixture.jobId))
 const replay=await h.cmd('import.apply',{csv:fixture.csv,fingerprint:fixture.fingerprint})
 assert.equal(replay.job.erasedRecords,1)
 assert.equal((await h.state()).clients.find(c=>c.id===fixture.id).name,'Erased contact','replaying captured CSV cannot restore the erased contact')
 const changed=fixture.csv.replace('Synthetic retained peer','Synthetic changed peer')
 const review=await h.cmd('import.preview',{csv:changed})
 assert.equal(review.canApply,false,'a new CSV cannot overwrite the anonymous anchor')
 if(undo){
  const result=await h.cmd('import.undo',{id:fixture.jobId});assert.equal(result.job.state,'undone')
  const after=await h.state();assert.ok(!after.clients.some(c=>c.id===fixture.peerId));assert.equal(after.clients.find(c=>c.id===fixture.id).name,'Erased contact')
 }
}

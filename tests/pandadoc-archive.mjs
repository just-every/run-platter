import assert from 'node:assert/strict'
import { mkdtemp,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'
import { harness } from './harness.mjs'
import { integratedPandaFixture,applyPandaContent,bulkPandaFixture,applyPandaBulk } from './document-import-fixture.mjs'
import { hash } from './document-movein-fixture.mjs'

export async function pandaReissueArchive({checkout,command,exec}){
 const temporary=await mkdtemp(join(tmpdir(),'platter-panda-archive-')),source=join(temporary,'source'),restored=join(temporary,'restored')
 let h
 try{
  for(const root of [source,restored])await checkout(root)
  await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:source,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:2e6})
  h=await harness({root:source})
  const files=await integratedPandaFixture(),content=await applyPandaContent(h,'pandadoc-template',[files.catalog,files.quote]),contentJournal=await h.cmd('document-import.journal',{id:content.id})
  const bulkFiles=await bulkPandaFixture([2],2000),bulk=await applyPandaBulk(h,bulkFiles),client=await h.cmd('client.save',{name:'Synthetic restored new draft',email:h.auth.OWNER_EMAIL})
  const choices={id:bulk.id,documentId:hash(bulkFiles.originals[0].bytes),clientId:client.id,scope:'Synthetic reviewed restored scope',price:'75',depositPercent:'25'},review=await h.cmd('document-import.reissue-preview',choices),draft=await h.cmd('document-import.reissue',{...choices,fingerprint:review.fingerprint,confirmVoid:'yes'})
  const before=await h.state(),bulkJournal=await h.cmd('document-import.journal',{id:bulk.id}),identity={auth:h.auth,owner:h.owner}
  await h.close();h=null
  const archive=join(temporary,'panda.rer');await command(source,['export','--output',archive,'--no-queue']);await command(restored,['import','--input',archive,'--yes','--no-queue'])
  h=await harness({root:restored,...identity});const cookie=await h.signIn(identity.auth.OWNER_EMAIL),after=await h.state(cookie)
  assert.deepEqual(after.businessRecords,before.businessRecords);assert.deepEqual(after.templates,before.templates);assert.deepEqual(after.importedDocuments,before.importedDocuments)
  assert.deepEqual(after.resourceFolders,before.resourceFolders);assert.deepEqual(after.proposals.map(p=>({id:p.id,document:p.document,options:p.options,status:p.status})),before.proposals.map(p=>({id:p.id,document:p.document,options:p.options,status:p.status})))
  assert.deepEqual(await h.cmd('document-import.journal',{id:content.id},cookie),contentJournal);assert.deepEqual(await h.cmd('document-import.journal',{id:bulk.id},cookie),bulkJournal)
  for(const file of [files.catalog,files.quote]){const response=await h.mf.dispatchFetch(h.origin+'/api/platter/imported-original?id='+content.id+'&name='+hash(file.bytes),{headers:{cookie}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),file.bytes)}
  for(const file of bulkFiles.originals){const response=await h.mf.dispatchFetch(h.origin+'/api/platter/imported-original?document='+hash(file.bytes),{headers:{cookie}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),file.bytes)}
  const proposal=after.proposals.find(p=>p.id===draft.id),media=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+draft.id+'/'+proposal.document.fixedPdf.fileId,{headers:{cookie}});assert.equal(media.status,200);assert.deepEqual(Buffer.from(await media.arrayBuffer()),bulkFiles.originals[0].bytes)
  assert.equal((await h.cmd('document-import.reissue',{...choices,fingerprint:review.fingerprint,confirmVoid:'yes'},cookie)).id,draft.id)
  await h.cmd('document-import.undo',{id:bulk.id},cookie,409);assert.deepEqual((await h.state(cookie)).importedDocuments,before.importedDocuments)
  await h.cmd('document-import.undo',{id:content.id},cookie);assert.deepEqual((await h.state(cookie)).businessRecords,{companies:[],contacts:[],catalog:[]});assert.deepEqual((await h.state(cookie)).templates,[])
  assert.equal((await h.db.prepare('SELECT COUNT(*) n FROM p_shares').first()).n,0);assert.equal((await h.db.prepare('SELECT COUNT(*) n FROM p_mail').first()).n,0)
  console.log('PROBE MIG-001 archive: restored exact CSV, Word, PDF, folder tree and new draft; source journal and dependencies unchanged; unused content undo works; no invitation or mail authority restored')
 }finally{await h?.close();await rm(temporary,{recursive:true,force:true})}
}

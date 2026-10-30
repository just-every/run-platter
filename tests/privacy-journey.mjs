import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { driveFixture,connectDrive } from './drive-fixture.mjs'
import { hubspotFixture } from './hubspot-fixture.mjs'
import { importedPrivacyFixture,assertImportedPrivacyErased } from './privacy-import-fixture.mjs'
import { privacyFixture,privacyInventory,assertPrivacyErased,digest,privacyOffer } from './privacy-fixture.mjs'
export async function privacyJourney(){
 const edge=hubspotFixture(),drive=driveFixture(),h=await harness({outboundService:request=>new URL(request.url).hostname==='api.hubapi.com'?edge.request(request):drive.outboundService(request),assetsDirectory:'public'})
 try{
  await connectDrive(h)
  const fixture=await privacyFixture(h,edge)
  await h.cmd('archive.dispatch',{})
  const externalFiles=(await h.db.prepare('SELECT * FROM p_archive_files ORDER BY kind').all()).results
  assert.equal(externalFiles.length,2);assert.ok(externalFiles.every(f=>f.status==='complete'))
  const id=fixture.client.id,review=await h.cmd('privacy.review',{id}),input={id,...review.privacyReview,confirmName:fixture.client.name,consent:'yes'}
  const before=await privacyInventory(h),accepted=before.p_acceptances[0],revisions=before.p_revisions.filter(r=>r.proposal_id===fixture.retained.id)
  assert.equal(before.p_views.length,2);assert.equal(before.p_questions.length,2);assert.equal(before.p_internal_threads.length,2);assert.equal(before.p_crm_draft_sources.length,1)
  assert.equal(before.p_tracking_reading.length,2);assert.equal(before.p_tracking_choices.length,2);assert.equal(before.p_tracking_attachment_opens.length,1);assert.equal(before.p_tracking_stakeholders.length,1);assert.equal(before.p_tracking_challenges.length,1)
  const address=['synthetic-platter-privacy-member','example.test'].join('@')
  assert.equal((await h.send('/auth/invite',{email:address,displayName:'Synthetic privacy member',role:'member',returnTo:'/app'},h.owner)).status,202)
  const member=await h.signIn(address)
  await h.cmd('privacy.hold',{id,kind:'legal',held:'yes',reason:'Refused member hold'},member,403)
  await h.cmd('privacy.review',{id},member,403);await h.cmd('privacy.erase',input,member,403)
  assert.deepEqual(await privacyInventory(h),before)
  for(const kind of ['retention','legal']){
   await h.cmd('privacy.hold',{id,kind,held:'yes',reason:'Synthetic binding hold'})
   await h.cmd('privacy.erase',input,h.owner,409);await h.cmd('tracking.erase',{id:fixture.first.id,confirm:'erase'},h.owner,409)
   assert.deepEqual(await privacyInventory(h),before)
   await h.cmd('privacy.hold',{id,kind,held:'no'})
  }
  await h.cmd('tracking.hold',{id:fixture.first.id,held:'yes',reason:'Synthetic engagement hold'})
  await h.cmd('privacy.erase',input,h.owner,409);assert.deepEqual(await privacyInventory(h),before)
  await h.cmd('tracking.hold',{id:fixture.first.id,held:'no'})
  await h.cmd('privacy.erase',{...input,confirmName:'Wrong'},h.owner,400);assert.deepEqual(await privacyInventory(h),before)
  await h.cmd('collaboration.comment',{id:fixture.first.id,version:3,revision:1,blockId:'scope',text:'synthetic-platter-private-later-discussion'})
  const changed=await privacyInventory(h)
  await h.cmd('privacy.erase',input,h.owner,409);assert.deepEqual(await privacyInventory(h),changed)
  const current=await h.cmd('privacy.review',{id}),calls=edge.calls.length,driveCalls=drive.calls.length
  const result=await h.cmd('privacy.erase',{...input,...current.privacyReview})
  assert.equal(edge.calls.length,calls,'erasure makes no CRM provider request');assert.equal(drive.calls.length,driveCalls,'erasure makes no file-store provider request')
  assert.deepEqual(new Set(result.receipt.fileStoreRecords.map(r=>r.recordId)),new Set(externalFiles.map(r=>r.provider_id)))
  assert.ok(result.receipt.fileStoreRecords.every(r=>r.accountId==='synthetic-platter-archive-account'&&r.folderId&&r.sha256&&r.action.includes('operator erasure')))
  for(const file of externalFiles)assert.equal(digest(drive.files.get(file.provider_id).bytes),file.sha256)
  const after=await assertPrivacyErased(h,fixture,result.receipt)
  assert.equal(after.proposals.length,1,'no additional proposal can survive or be recreated')
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_mail').first()).n,0,'the complete local outbox is empty after this contact erasure')
  assert.deepEqual((await privacyInventory(h)).p_acceptances,[accepted]);assert.deepEqual((await privacyInventory(h)).p_revisions,revisions)
  assert.equal(result.receipt.retained[0].snapshotSha256,digest(accepted.snapshot))
  assert.deepEqual(after.privacy.receipts,[result.receipt]);assert.equal((await h.state(member)).privacy,undefined)
  await h.cmd('crm.deal.apply',{id:fixture.sourceReview.id,digest:fixture.sourceReview.digest,consent:'yes'},h.owner,409)
  await h.cmd('crm.deal.review',edge.selected,h.owner,409)
  await h.cmd('proposal.prepare',{...privacyOffer,clientId:id,title:'Replay'},h.owner,410)
  const worker=await h.mf.getWorker();await worker.scheduled({scheduledTime:new Date('2030-01-01T15:00:00Z'),cron:'*/15 * * * *'})
  assert.equal(drive.calls.length,driveCalls,'erased archive jobs cannot execute again')
  const imported=await importedPrivacyFixture(h)
  const importedBefore=await h.cmd('import.journal',{id:imported.jobId})
  const importedReview=await h.cmd('privacy.review',{id:imported.id,contactId:imported.contactId,documentIds:imported.documentIds})
  assert.equal(importedReview.privacyReview.importedCustody.imported,true)
  assert.match(importedReview.privacyReview.importedCustody.exception,/complete original CSV/)
  await h.cmd('privacy.erase',{id:imported.id,...importedReview.privacyReview,confirmName:imported.name,consent:'yes'},member,403)
  assert.deepEqual(await h.cmd('import.journal',{id:imported.jobId}),importedBefore)
  const importReceipt=(await h.cmd('privacy.erase',{id:imported.id,...importedReview.privacyReview,confirmName:imported.name,consent:'yes'})).receipt
  await assertImportedPrivacyErased(h,imported,importReceipt,{undo:true})
  assert.equal(edge.calls.length,calls+7,'only explicit source review reads HubSpot; scheduled work sends nothing')
  assert.deepEqual(new Set((await h.state()).privacy.receipts.map(r=>r.id)),new Set([result.receipt.id,importReceipt.id]))
 }finally{await h.close()}
}

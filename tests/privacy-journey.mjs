import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { hubspotFixture } from './hubspot-fixture.mjs'
import { privacyFixture,privacyInventory,assertPrivacyErased,digest,privacyOffer } from './privacy-fixture.mjs'
export async function privacyJourney(){
 const edge=hubspotFixture(),h=await harness({outboundService:edge.request,assetsDirectory:'public'})
 try{
  const fixture=await privacyFixture(h,edge),id=fixture.client.id,review=await h.cmd('privacy.review',{id}),input={id,...review.privacyReview,confirmName:fixture.client.name,consent:'yes'}
  const before=await privacyInventory(h),accepted=before.p_acceptances[0],revisions=before.p_revisions.filter(r=>r.proposal_id===fixture.retained.id)
  assert.equal(before.p_views.length,2);assert.equal(before.p_questions.length,2);assert.equal(before.p_internal_threads.length,2);assert.equal(before.p_crm_draft_sources.length,1)
  const address=['synthetic-platter-privacy-member','example.test'].join('@')
  assert.equal((await h.send('/auth/invite',{email:address,displayName:'Synthetic privacy member',role:'member',returnTo:'/app'},h.owner)).status,202)
  const member=await h.signIn(address)
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
  const current=await h.cmd('privacy.review',{id}),calls=edge.calls.length
  const result=await h.cmd('privacy.erase',{...input,...current.privacyReview})
  assert.equal(edge.calls.length,calls,'erasure makes no provider request')
  const after=await assertPrivacyErased(h,fixture,result.receipt)
  assert.deepEqual((await privacyInventory(h)).p_acceptances,[accepted]);assert.deepEqual((await privacyInventory(h)).p_revisions,revisions)
  assert.equal(result.receipt.retained[0].snapshotSha256,digest(accepted.snapshot))
  assert.deepEqual(after.privacy.receipts,[result.receipt]);assert.equal((await h.state(member)).privacy,undefined)
  await h.cmd('crm.deal.apply',{id:fixture.sourceReview.id,digest:fixture.sourceReview.digest,consent:'yes'},h.owner,409)
  await h.cmd('crm.deal.review',edge.selected,h.owner,409)
  await h.cmd('proposal.prepare',{...privacyOffer,clientId:id,title:'Replay'},h.owner,410)
  const worker=await h.mf.getWorker();await worker.scheduled({scheduledTime:new Date('2030-01-01T15:00:00Z'),cron:'*/15 * * * *'})
  assert.equal(edge.calls.length,calls+7,'only explicit source review reads HubSpot; scheduled work sends nothing')
  assert.deepEqual((await h.state()).privacy.receipts,[result.receipt])
 }finally{await h.close()}
}

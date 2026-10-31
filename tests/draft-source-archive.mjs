import assert from 'node:assert/strict'
import { seedSourcedDraft, allowSource, sourcedMcp, mcpValue, uploadSource, originalNotes } from './draft-source-fixture.mjs'
export async function seedSourceArchive(h) {
 const seed=await seedSourcedDraft(h);await allowSource(h,seed)
 const proposal=mcpValue(await sourcedMcp(h,seed.key,'prepare_proposal',seed.input))
 const next=await uploadSource(h,originalNotes+'Retained next version.',seed.source);await allowSource(h,{...seed,source:next})
 const provenance=(await h.state()).draftProvenance.find(p=>p.proposal_id===proposal.id)
 return {seed,proposal,next,provenance,options:(await h.state()).proposals.find(p=>p.id===proposal.id).options}
}
export async function restoredSourceArchive(h,owner,before) {
 const {seed,proposal,next,provenance,options}=before
 for(const [version,original] of [[1,originalNotes],[2,originalNotes+'Retained next version.']]){
  const response=await h.send('/api/platter/draft-source?id='+seed.source.id+'&version='+version,undefined,owner)
  assert.equal(response.status,200);assert.equal(response.value.original,original);assert.equal(response.value.lines[2].text,'')
 }
 const state=await h.state(owner);assert.deepEqual(state.draftProvenance.find(p=>p.proposal_id===proposal.id),provenance);assert.deepEqual(state.proposals.find(p=>p.id===proposal.id).options,options)
 assert.deepEqual(state.draftSourceConsent,[],'archive carries no per-key source-binding authority')
 assert.equal((await sourcedMcp(h,seed.key,'prepare_proposal',seed.input)).status,401)
 const key=await h.cmd('agent.create',{label:'Synthetic restored source helper'},owner),input=structuredClone(seed.input);input.sourceDraft.sourceVersion=next.version;input.sourceDraft.sourceSha256=next.sha256
 const beforeCount=(await h.db.prepare('SELECT COUNT(*) AS n FROM p_proposals').first()).n
 const response=await sourcedMcp(h,key,'prepare_proposal',input);assert.match(response.text,/no consent/);assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_proposals').first()).n,beforeCount)
 await h.cmd('draft-source.consent',{keyId:key.id,sourceId:next.id,sourceVersion:2,consent:true},owner)
 assert.ok(mcpValue(await sourcedMcp(h,key,'prepare_proposal',input)).id)
}

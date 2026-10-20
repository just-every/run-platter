import { test } from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './harness.mjs'

test('the demo opens on a lived-in studio and a send completes as mocked success',async()=>{
 const h=await harness({entry:'tests/demo-worker.ts',auth:{RER_DEMO:'1'}})
 try{
  const state=await h.state()
  assert.equal(state.clients.length,15);assert.equal(state.proposals.length,18);assert.deepEqual(state.outbox,[])
  const by=s=>state.proposals.filter(p=>p.status===s)
  assert.deepEqual(['draft','approved','sent','accepted'].map(s=>by(s).length),[4,2,4,8])
  assert.equal(by('accepted').filter(p=>p.acceptance&&p.invoice).length,6);assert.ok(state.proposals.some(p=>p.preparedByName==='Agent'&&p.status==='draft'))
  const pecan=state.proposals.find(p=>p.title==='Pecan Street Bakery · packaging refresh');assert.equal(pecan.acceptance.name,'Lucy Tran');assert.equal(pecan.acceptance.depositCents,230000)
  const page=await h.send('/app',undefined,h.owner);assert.equal(page.status,200);assert.equal(page.text.match(/<[a-z]+[^>]*\sdata-rer-name/g).length,1);assert.match(page.text,/<title>Proposals · Platter Demo<\/title>/);assert.doesNotMatch(page.text,/Demo Demo|Local development mail/)
  const ready=by('approved')[0];const share=await h.cmd('proposal.send',{id:ready.id,version:ready.version})
  const shared=await h.send(new URL(share.shareUrl).pathname,undefined,h.owner);assert.equal(shared.status,200,shared.text);assert.match(shared.text,new RegExp(ready.title))
  assert.equal((await h.state()).proposals.find(p=>p.id===ready.id).delivery,'accepted')
  const draft=by('draft')[0];await h.cmd('proposal.approve',{id:draft.id,version:draft.version,revision:draft.revision})
  const csv=await h.send(`/api/platter/invoices/${pecan.invoice.id}.csv`,undefined,h.owner);assert.equal(csv.status,200);assert.match(csv.text,/Lucy Tran|Pecan Street Bakery/)
  assert.equal((await h.state()).proposals.length,18,'the seed runs once')
 }finally{await h.close()}
})

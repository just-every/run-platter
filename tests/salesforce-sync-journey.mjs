import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { salesforceSyncFixture, salesforceMapping } from './salesforce-sync-fixture.mjs'

export async function salesforceSyncJourney(verified) {
 const edge = salesforceSyncFixture(), h = await harness({ outboundService: edge.request })
 try {
  await h.cmd('provider.connect', { provider: 'salesforce', version: 0, token: 'synthetic-platter-4707', consent: true })
  const make = async () => { const r = await h.cmd('crm.opportunity.review', edge.selected); return h.cmd('crm.opportunity.apply', { id: r.id, digest: r.digest, consent: true }) }
  const made = await make(), row = async () => (await h.state()).proposals.find(p => p.id === made.id)
  const fresh = async (cookie = h.owner) => h.cmd('crm.salesforce.review', { proposalId: made.id, version: (await row()).version, ...salesforceMapping }, cookie)
  const apply = (r, cookie = h.owner, status = 200, extra = {}) => h.cmd('crm.salesforce.apply', { id: r.id, digest: r.digest, consent: true, ...extra }, cookie, status)
  await h.cmd('crm.salesforce.review', { proposalId: made.id, version: 1, ...salesforceMapping }, h.owner, 409)
  await h.cmd('proposal.approve', { id: made.id, version: 1, revision: 1 })
  const path = new URL((await h.cmd('proposal.send', { id: made.id, version: 2 })).shareUrl).pathname
  await h.cmd('tracking.settings', { enabled: 'yes', alerts: 'no', retentionDays: 90, quietMinutes: 30, consent: 'yes' })
  const cookie = await verified(h, path); await h.send(path, undefined, cookie)
  assert.equal((await h.send(path + '/action?name=accept', { name: 'Taylor Reed', optionId: 'one', consent: true }, cookie)).status, 200)
  const acceptedBefore = (await row()).acceptance, sentBefore = (await h.send(path + '/data.json', undefined, cookie)).value
  const r = await fresh()
  assert.equal(r.plan.totalCents, 36122); assert.equal(r.plan.status, 'signed')
  assert.deepEqual(r.plan.operations.slice(0, 2).map(o => [o.body.Quantity, o.body.UnitPrice, o.expectedTotalCents]), [[2.5, 120.5, 30125], [3, 19.99, 5997]])
  assert.deepEqual(r.plan.operations.filter(o => o.method === 'POST').map(o => o.body.Subject), ['Platter proposal sent', 'Platter proposal viewed', 'Platter proposal signed'])
  assert.equal(edge.writes.length, 0, 'completion and review never silently authorize writes')
  await apply(r, h.owner, 400, { consent: false }); await apply(r, h.owner, 409, { digest: 'synthetic-platter-wrong' })
  await h.cmd('crm.sync.apply', { id: r.id, digest: r.digest, consent: true }, h.owner, 409)
  const remoteBefore = structuredClone(edge.state)
  edge.state.opportunity.Synthetic_Proposal__c = 'https://example.test/changed'
  await apply(r, h.owner, 409); Object.assign(edge.state, remoteBefore); assert.equal(edge.writes.length, 0)
  const linkMeta = edge.metadata.Opportunity.fields.find(f => f.name === salesforceMapping.linkProperty)
  linkMeta.updateable = false; await h.cmd('crm.salesforce.review', { proposalId: made.id, version: (await row()).version, ...salesforceMapping }, h.owner, 409); linkMeta.updateable = true
  const key = await h.cmd('agent.create', { label: 'Synthetic reviewed Salesforce authority' }), calls = edge.calls.length
  for (const name of ['crm.salesforce.review', 'crm.salesforce.apply']) assert.equal((await h.send('/api/platter/agent/command', { name, input: { proposalId: made.id, id: r.id, digest: r.digest, consent: true } }, '', { authorization: 'Bearer ' + key.token })).status, 403)
  assert.equal(edge.calls.length, calls); assert.equal(edge.writes.length, 0)
  const done = await apply(r); assert.equal(done.held, 0); assert.equal(done.confirmed, 6)
  assert.deepEqual(edge.writes.slice(0, 2).map(w => [w.method, w.path.split('/').at(-1), w.body]), [
   ['PATCH', 'synthetic-platter-4705', { Quantity: 2.5, UnitPrice: 120.5, Description: 'Reviewed strategy' }],
   ['PATCH', 'synthetic-platter-4706', { Quantity: 3, UnitPrice: 19.99, Description: '' }],
  ])
  assert.equal(edge.state.opportunity.Amount, 361.22); assert.equal(edge.state.opportunity.StageName, 'Closed Won'); assert.equal(edge.state.opportunity.Synthetic_Proposal__c, h.origin + '/app/proposal?id=' + made.id)
  assert.deepEqual(edge.activities.map(a => [a.WhatId, a.Status, a.Subject]), ['sent', 'viewed', 'signed'].map(kind => [edge.selected.opportunityId, 'Completed', 'Platter proposal ' + kind]))
  assert.ok(edge.activities.every(a => a.Description.includes('revision 1:') && a.Description.endsWith(h.origin + '/app/proposal?id=' + made.id) && /^\d{4}-\d{2}-\d{2}$/.test(a.ActivityDate)))
  const sent = JSON.stringify(edge.writes); assert.ok(!sent.includes(path)); assert.ok(!sent.includes(edge.state.roles[0].Contact.Email)); assert.ok(!sent.includes('synthetic-platter-4707'))
  const writes = edge.writes.length; await apply(r, h.owner, 409); assert.equal(edge.writes.length, writes)
  edge.state.lines[0].Quantity = 4; edge.state.lines[0].UnitPrice = 200; edge.state.lines[0].TotalPrice = 800; edge.state.opportunity.Amount = 859.97
  assert.equal((await apply(await fresh())).held, 0)
  assert.equal(edge.state.lines[0].Quantity, 2.5); assert.equal(edge.state.lines[0].UnitPrice, 120.5); assert.equal(edge.state.lines[0].TotalPrice, 301.25); assert.equal(edge.state.opportunity.Amount, 361.22); assert.equal(edge.activities.length, 3)
  assert.deepEqual((await row()).acceptance, acceptedBefore); assert.deepEqual((await h.send(path + '/data.json', undefined, cookie)).value, sentBefore)
  await h.cmd('payment.record', { id: made.id, method: 'wire', amount: '361.22', receivedOn: '2030-01-01', reference: 'synthetic-platter-4910', consent: true })
  await apply(await fresh()); assert.equal(edge.activities.length, 4); assert.equal(edge.activities[3].Subject, 'Platter proposal paid')
  const memberEmail = ['synthetic-platter-4911', 'example.test'].join('@')
  await h.send('/auth/invite', { email: memberEmail, displayName: 'Synthetic Salesforce reviewer', role: 'member', returnTo: '/app' }, h.owner)
  const member = await h.signIn(memberEmail), person = (await h.state()).teamPeople.find(p => p.email === memberEmail)
  await h.cmd('crm.salesforce.review', { proposalId: made.id, version: (await row()).version, ...salesforceMapping }, member, 403)
  assert.deepEqual((await h.state(member)).crmSyncHistory, [])
  await h.cmd('member.set', { operatorId: person.id, version: 0, role: 'admin', teams: [] })
  const admin = await fresh(member), count = edge.writes.length
  let fired = false
  edge.beforeReply(async req => { if (!fired && req.url.endsWith('/sobjects/Opportunity/describe')) { fired = true; await h.cmd('member.set', { operatorId: person.id, version: 1, role: 'sales', teams: [] }) } })
  await apply(admin, member, 409); edge.beforeReply(); assert.ok(fired); assert.equal(edge.writes.length, count)
  const disconnected = await fresh()
  await h.cmd('provider.disconnect', { provider: 'salesforce', version: 1 }); await apply(disconnected, h.owner, 409); assert.equal(edge.writes.length, count)
  await h.cmd('provider.connect', { provider: 'salesforce', version: 2, token: 'synthetic-platter-4707', consent: true })
  await apply(disconnected, h.owner, 409); assert.equal(edge.writes.length, count)
  const second = await make(); await h.cmd('proposal.approve', { id: second.id, version: 1, revision: 1 }); await h.cmd('proposal.send', { id: second.id, version: 2 })
  const secondReview = () => h.cmd('crm.salesforce.review', { proposalId: second.id, version: 3, ...salesforceMapping })
  const parallel = await secondReview()
  edge.loseNextActivityResponse()
  const attempts = await Promise.all([1, 2].map(() => h.send('/api/platter/command', { name: 'crm.salesforce.apply', input: { id: parallel.id, digest: parallel.digest, consent: true } }, h.owner)))
  assert.deepEqual(attempts.map(r => r.status).sort(), [200, 409])
  const successful = attempts.find(r => r.status === 200).value
  assert.equal((successful.result ?? successful).held, 1)
  const activityCount = edge.activities.length, writeCount = edge.writes.length
  assert.equal((await apply(await secondReview())).held, 1)
  assert.equal(edge.activities.length, activityCount); assert.equal(edge.writes.slice(writeCount).filter(w => w.method === 'POST').length, 0)
  assert.ok((await h.state()).crmSyncHistory.some(r => r.provider === 'salesforce' && r.status === 'uncertain'))
 } finally { await h.close() }
}

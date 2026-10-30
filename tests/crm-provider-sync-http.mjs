import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { connectPipedrive, pipedriveToken } from './crm-pipedrive-http.mjs'
import { connectZoho, zohoToken } from './crm-zoho-http.mjs'
import { providerSyncFixture } from './crm-provider-sync-fixture.mjs'

export async function providerSyncJourney(verified, provider) {
 const edge = providerSyncFixture(provider), h = await harness({ outboundService: edge.request }), prefix = 'crm.' + provider + '.'
 try {
  const business = async () => {
   const result = {}
   for (const table of ['p_clients', 'p_proposals', 'p_revisions', 'p_acceptances', 'p_invoices', 'p_crm_provider_attempts', 'p_crm_provider_consents']) result[table] = (await h.db.prepare('SELECT * FROM ' + table + ' ORDER BY rowid').all()).results
   return result
  }
  await (provider === 'pipedrive' ? connectPipedrive : connectZoho)(h)
  const capture = await h.cmd(prefix + 'review', edge.selected), made = await h.cmd(prefix + 'apply', { id: capture.id, digest: capture.digest, consent: true })
  const row = async () => (await h.state()).proposals.find(p => p.id === made.id)
  await h.cmd(prefix + 'sync.review', { proposalId: made.id, version: 1, ...edge.mapping }, h.owner, 409)
  await h.cmd('proposal.approve', { id: made.id, version: 1, revision: 1 })
  const path = new URL((await h.cmd('proposal.send', { id: made.id, version: 2 })).shareUrl).pathname
  await h.cmd('tracking.settings', { enabled: 'yes', alerts: 'no', retentionDays: 90, quietMinutes: 30, consent: 'yes' })
  const cookie = await verified(h, path); assert.equal((await h.send(path, undefined, cookie)).status, 200)
  const fresh = async (actor = h.owner) => h.cmd(prefix + 'sync.review', { proposalId: made.id, version: (await row()).version, ...edge.mapping }, actor)
  const apply = (r, status = 200, actor = h.owner, extra = {}) => h.cmd(prefix + 'sync.apply', { id: r.id, digest: r.digest, consent: true, ...extra }, actor, status)
  const checked = await fresh(); assert.equal(checked.plan.status, 'viewed'); assert.equal(checked.plan.totalCents, 36122)
  assert.deepEqual(checked.plan.operations.filter(o => o.method === 'POST').map(o => o.label), ['sent timeline note', 'viewed timeline note'])
  const safe = await business()
  await apply(checked, 400, h.owner, { consent: false }); await apply(checked, 409, h.owner, { digest: 'synthetic-platter-altered' })
  await h.cmd('crm.sync.review', { proposalId: made.id, version: 3, ...edge.mapping }, h.owner, 409)
  const key = edge.mapping.linkProperty, before = edge.state.deal[key]; edge.state.deal[key] = 'https://example.test/changed'
  await apply(checked, 409); edge.state.deal[key] = before
  assert.equal(edge.writes.length, 0); assert.deepEqual(await business(), safe)
  const result = await apply(checked); assert.equal(result.held, 0); assert.equal(result.confirmed, provider === 'pipedrive' ? 5 : 4)
  if (provider === 'pipedrive') {
   assert.deepEqual(edge.writes.slice(0, 2).map(w => [w.path, w.body.quantity, w.body.item_price]), [['/v1/deals/12102/products/12105', 2.5, 120.5], ['/v1/deals/12102/products/12106', 3, 19.99]])
   assert.equal(edge.state.deal.value, 361.22)
  } else {
   assert.deepEqual(edge.writes[0].body.data[0].Product_Details.map(r => [r.id, r.product.id, r.quantity, r.list_price]), [['12406', '12408', 2.5, 120.5], ['12407', '12409', 3, 19.99]])
   assert.equal(edge.state.deal.Amount, 361.22)
  }
  assert.equal(edge.state.deal[key], h.origin + '/app/proposal?id=' + made.id); assert.equal(edge.state.deal[edge.mapping.statusProperty], 'viewed')
  const writeCount = edge.writes.length; await apply(checked, 409); assert.equal(edge.writes.length, writeCount)
  const sent = (await h.send(path + '/data.json', undefined, cookie)).value
  if (provider === 'pipedrive') { edge.state.attached[0].item_price = 200; edge.state.attached[0].sum = 500; edge.state.deal.value = 559.97 }
  else { Object.assign(edge.state.quote.Product_Details[0], { list_price: 200, total: 500, net_total: 500 }); edge.state.quote.Sub_Total = edge.state.quote.Grand_Total = edge.state.deal.Amount = 559.97 }
  assert.deepEqual((await h.send(path + '/data.json', undefined, cookie)).value, sent)
  assert.equal((await apply(await fresh())).held, 0)
  assert.equal(provider === 'pipedrive' ? edge.state.attached[0].sum : edge.state.quote.Product_Details[0].total, 301.25); assert.equal(edge.notes.length, 2)
  assert.equal((await h.send(path + '/action?name=accept', { name: 'Taylor Reed', optionId: 'one', consent: true }, cookie)).status, 200)
  assert.equal((await apply(await fresh())).held, 0)
  assert.equal(edge.state.deal[edge.mapping.statusProperty], 'signed'); assert.equal(edge.notes.length, 3)
  assert.equal(provider === 'pipedrive' ? edge.state.deal.stage_id : edge.state.deal.Stage, provider === 'pipedrive' ? 12421 : 'Closed Won')
  await h.cmd('payment.record', { id: made.id, method: 'wire', amount: '361.22', receivedOn: '2030-01-01', reference: 'synthetic-platter-12430', consent: true })
  assert.equal((await apply(await fresh())).held, 0); assert.equal(edge.state.deal[edge.mapping.statusProperty], 'paid'); assert.equal(edge.notes.length, 4)
  assert.deepEqual(edge.notes.map(n => (n.content ?? n.Note_Content).match(/: (\w+)\./)[1]), ['sent', 'viewed', 'signed', 'paid'])
  assert.ok(!JSON.stringify(edge.writes).includes(path)); assert.ok(!JSON.stringify(edge.writes).includes(['synthetic-platter-' + (provider === 'pipedrive' ? '12104' : '12404'), 'example.test'].join('@')))
  const memberEmail = ['synthetic-platter-12431', 'example.test'].join('@')
  await h.send('/auth/invite', { email: memberEmail, displayName: 'CRM writer', role: 'member', returnTo: '/app' }, h.owner)
  const member = await h.signIn(memberEmail), person = (await h.state()).teamPeople.find(p => p.email === memberEmail), beforeCalls = edge.calls.length
  await h.cmd(prefix + 'sync.review', { proposalId: made.id, version: 3, ...edge.mapping }, member, 403)
  assert.equal(edge.calls.length, beforeCalls)
  await h.cmd('member.set', { operatorId: person.id, version: 0, role: 'admin', teams: [] })
  const adminReview = await fresh(member); let demoted = false
  const beforeDemote = await business(), noWrites = edge.writes.length
  edge.beforeReply(async req => { if (!demoted && req.url.includes(provider === 'pipedrive' ? '/dealFields' : '/settings/fields')) { demoted = true; await h.cmd('member.set', { operatorId: person.id, version: 1, role: 'sales', teams: [] }) } })
  await apply(adminReview, 409, member); edge.beforeReply(undefined)
  assert.equal(edge.writes.length, noWrites); assert.deepEqual(await business(), beforeDemote)
  const revoked = await fresh(); await h.cmd('provider.disconnect', { provider, version: 1 }); await apply(revoked, 409); assert.equal(edge.writes.length, noWrites)
  await h.cmd('provider.connect', { provider, version: 2, token: provider === 'pipedrive' ? pipedriveToken : zohoToken, tenantId: provider === 'pipedrive' ? '12101' : '12401', consent: true })
  await apply(revoked, 409); assert.equal(edge.writes.length, noWrites)
  const renewed = await fresh(), parallel = await Promise.all([1, 2].map(() => h.send('/api/platter/command', { name: prefix + 'sync.apply', input: { id: renewed.id, digest: renewed.digest, consent: true } }, h.owner)))
  assert.deepEqual(parallel.map(r => r.status).sort(), [200, 409]); assert.equal(edge.notes.length, 4)
  // A distinct revision is needed to produce a new lifecycle note on this deal.
  const nextCapture = await h.cmd(prefix + 'review', edge.selected), next = await h.cmd(prefix + 'apply', { id: nextCapture.id, digest: nextCapture.digest, consent: true })
  await h.cmd('proposal.approve', { id: next.id, version: 1, revision: 1 }); await h.cmd('proposal.send', { id: next.id, version: 2 })
  const nextReview = await h.cmd(prefix + 'sync.review', { proposalId: next.id, version: 3, ...edge.mapping })
  edge.loseNextNote(); assert.equal((await h.cmd(prefix + 'sync.apply', { id: nextReview.id, digest: nextReview.digest, consent: true })).held, 1)
  const afterLost = edge.writes.length, notes = edge.notes.length
  const retry = await h.cmd(prefix + 'sync.review', { proposalId: next.id, version: 3, ...edge.mapping })
  await h.cmd(prefix + 'sync.apply', { id: retry.id, digest: retry.digest, consent: true }, h.owner, 409)
  assert.equal(edge.writes.length, afterLost); assert.equal(edge.notes.length, notes)
  assert.ok((await h.state()).crmProviderSyncHistory.some(r => r.status === 'uncertain'))
 } finally { await h.close() }
}

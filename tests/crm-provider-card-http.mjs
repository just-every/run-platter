import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { pipedriveFixture, connectPipedrive } from './crm-pipedrive-http.mjs'
import { zohoFixture, connectZoho } from './crm-zoho-http.mjs'

export async function providerCardJourney(provider) {
 const edge = provider === 'pipedrive' ? pipedriveFixture() : zohoFixture(), h = await harness({ outboundService: edge.request })
 try {
  await (await h.mf.getWorker()).scheduled({ scheduledTime: new Date('2035-01-01T12:00:00Z'), cron: '*/15 * * * *' })
  const setup = await h.mf.dispatchFetch(h.origin + '/setup', { method: 'POST', headers: { origin: h.origin, cookie: h.owner, 'content-type': 'application/x-www-form-urlencoded' }, body: 'confirm=yes', redirect: 'manual' })
  assert.equal(setup.status, 303); await setup.text()
  await (provider === 'pipedrive' ? connectPipedrive : connectZoho)(h)
  const accountId = provider === 'pipedrive' ? '12101' : '12401', prefix = 'crm.' + provider + '.'
  const params = new URLSearchParams({ provider, accountId, dealId: edge.selected.dealId })
  const card = (cookie = h.owner, query = params) => h.send('/api/platter/crm/card-preview?' + query, undefined, cookie)
  const capture = await h.cmd(prefix + 'review', edge.selected), original = await h.cmd(prefix + 'apply', { id: capture.id, digest: capture.digest, consent: true })
  const first = await card(); assert.equal(first.status, 200); assert.deepEqual(first.value.proposals.map(p => [p.id, p.status, p.revision]), [[original.id, 'draft', 1]])
  assert.ok(!JSON.stringify(first.value).includes('Taylor Reed'), 'card lists proposal status without contact or source data')
  const beforeCalls = edge.calls.length
  assert.equal((await card('')).status, 401)
  assert.equal((await h.send(new URL(first.value.startUrl).pathname + new URL(first.value.startUrl).search)).status, 303)
  const wrong = new URLSearchParams(params); wrong.set('accountId', '99999')
  assert.equal((await card(h.owner, wrong)).status, 409)
  await h.cmd(prefix + 'review', { ...edge.selected, accountId: '99999' }, h.owner, 409)
  const other = new URLSearchParams(params); other.set('provider', provider === 'pipedrive' ? 'zoho' : 'pipedrive')
  assert.equal((await card(h.owner, other)).status, 409)
  assert.equal(edge.calls.length, beforeCalls, 'refused card context triggers no provider calls')
  const address = ['synthetic-platter-12900', 'example.test'].join('@')
  await h.send('/auth/invite', { email: address, displayName: 'Card member', role: 'member', returnTo: '/app' }, h.owner)
  const member = await h.signIn(address), person = (await h.state()).teamPeople.find(p => p.email === address)
  assert.equal((await card(member)).status, 403)
  assert.equal((await h.send(new URL(first.value.startUrl).pathname + new URL(first.value.startUrl).search, undefined, member)).status, 403)
  await h.cmd('member.set', { operatorId: person.id, version: person.version, role: 'admin', teams: [] })
  assert.equal((await card(member)).status, 200)
  await h.cmd('member.set', { operatorId: person.id, version: 1, role: 'sales', teams: [] })
  assert.equal((await card(member)).status, 403)
  const nextDeal = provider === 'pipedrive' ? '12902' : '12903'
  edge.state.deal.id = provider === 'pipedrive' ? Number(nextDeal) : nextDeal
  if (provider === 'zoho') edge.state.quote.Deal_Name.id = nextDeal
  params.set('dealId', nextDeal)
  const empty = await card(); assert.equal(empty.status, 200); assert.deepEqual(empty.value.proposals, [])
  const context = Object.fromEntries(new URL(empty.value.startUrl).searchParams)
  assert.deepEqual([context.provider, context.accountId, context.dealId], [provider, accountId, nextDeal])
  const selected = { ...edge.selected, ...context }, review = await h.cmd(prefix + 'review', selected)
  assert.equal(review.source.dealId, nextDeal)
  const made = await h.cmd(prefix + 'apply', { id: review.id, digest: review.digest, consent: true }), linked = (await card()).value
  assert.deepEqual(linked.proposals.map(p => [p.id, p.status]), [[made.id, 'draft']])
  assert.equal(linked.proposals[0].url, h.origin + '/app/proposal?id=' + made.id)
  const draft = (await h.state()).proposals.find(p => p.id === made.id)
  assert.equal(draft.clientName, provider === 'pipedrive' ? 'Synthetic Pipedrive organization' : 'Synthetic Zoho account')
  assert.deepEqual(draft.options[0].tables[0].lines.map(r => [r.quantity, r.unitPrice, r.lineTotalCents]), [['2.5', '120.50', 30125], ['3', '19.99', 5997]])
  assert.equal(draft.collection.enabled, false); assert.equal(draft.approved_by, null)
  await h.cmd('proposal.send', { id: made.id, version: 1 }, h.owner, 409)
  await h.cmd('proposal.approve', { id: made.id, version: 1, revision: 1 }); await h.cmd('proposal.send', { id: made.id, version: 2 })
  assert.deepEqual((await card()).value.proposals.map(p => [p.id, p.status]), [[made.id, 'sent']])
  await h.cmd('expiry.set', { id: made.id, version: 3, mode: 'days', days: 1 })
  await (await h.mf.getWorker()).scheduled({ scheduledTime: new Date('2035-01-03T12:00:00Z'), cron: '*/15 * * * *' })
  assert.deepEqual((await card()).value.proposals.map(p => [p.id, p.status]), [[made.id, 'expired']])
  await h.cmd('proposal.withdraw', { id: made.id, version: 4, reason: 'Synthetic reviewed withdrawal', notice: false })
  assert.deepEqual((await card()).value.proposals.map(p => [p.id, p.status]), [[made.id, 'withdrawn']])
  const source = (await h.send('/api/platter/crm/source?id=' + made.id, undefined, h.owner)).value
  assert.equal(source.deal_id, nextDeal)
  await h.cmd('provider.disconnect', { provider, version: 1 })
  const calls = edge.calls.length
  assert.equal((await card()).status, 409)
  assert.equal((await h.send(new URL(linked.startUrl).pathname + new URL(linked.startUrl).search, undefined, h.owner)).status, 409)
  assert.equal(edge.calls.length, calls)
 } finally { await h.close() }
}

export async function providerCardIsolationJourney() {
 const pipedrive = pipedriveFixture(), zoho = zohoFixture(), accountId = '12901', dealId = '12902'
 pipedrive.state.companyId = Number(accountId); pipedrive.state.deal.id = Number(dealId)
 zoho.state.organizationId = accountId; zoho.state.deal.id = dealId; zoho.state.quote.Deal_Name.id = dealId
 const h = await harness({ outboundService: req => new URL(req.url).hostname === 'api.pipedrive.com' ? pipedrive.request(req) : zoho.request(req) })
 try {
  const expected = {}
  for (const [provider, edge, token] of [['pipedrive', pipedrive, 'synthetic-platter-12100'], ['zoho', zoho, 'synthetic-platter-12400']]) {
   await h.cmd('provider.connect', { provider, token, tenantId: accountId, version: 0, consent: true })
   const review = await h.cmd('crm.' + provider + '.review', { ...edge.selected, dealId })
   expected[provider] = (await h.cmd('crm.' + provider + '.apply', { id: review.id, digest: review.digest, consent: true })).id
  }
  const calls = pipedrive.calls.length + zoho.calls.length
  for (const provider of ['pipedrive', 'zoho']) {
   const result = await h.send('/api/platter/crm/card-preview?' + new URLSearchParams({ provider, accountId, dealId }), undefined, h.owner)
   assert.equal(result.status, 200)
   assert.deepEqual(result.value.proposals.map(p => [p.id, p.title, p.status]), [[expected[provider], provider === 'pipedrive' ? 'Synthetic Pipedrive engagement' : 'Synthetic Zoho engagement', 'draft']], 'identical tenant and deal ids cannot disclose another provider proposal')
  }
  assert.equal(pipedrive.calls.length + zoho.calls.length, calls, 'card reads do not call either provider')
 } finally { await h.close() }
}

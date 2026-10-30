import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { pipedriveFixture, connectPipedrive } from './crm-pipedrive-http.mjs'
import { zohoFixture, connectZoho } from './crm-zoho-http.mjs'

export async function providerCardJourney(provider) {
 const edge = provider === 'pipedrive' ? pipedriveFixture() : zohoFixture(), h = await harness({ outboundService: edge.request })
 try {
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
  const source = (await h.send('/api/platter/crm/source?id=' + made.id, undefined, h.owner)).value
  assert.equal(source.deal_id, nextDeal)
  await h.cmd('provider.disconnect', { provider, version: 1 })
  const calls = edge.calls.length
  assert.equal((await card()).status, 409)
  assert.equal((await h.send(new URL(linked.startUrl).pathname + new URL(linked.startUrl).search, undefined, h.owner)).status, 409)
  assert.equal(edge.calls.length, calls)
 } finally { await h.close() }
}

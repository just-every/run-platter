import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { harness } from './harness.mjs'
import { hubspotSyncFixture, syncMapping } from './hubspot-sync-fixture.mjs'

export async function signedCard(h, query = {}, headerOverrides = {}) {
 const values = { dealId: 'synthetic-platter-4600', objectTypeId: '0-3', portalId: 'synthetic-platter-portal', appId: 'synthetic-platter-app', userEmail: h.auth.OWNER_EMAIL, ...query }
 const params = new URLSearchParams(values)
 const path = '/api/platter/crm/card?' + params, timestamp = String(Date.now())
 // All test values are plain identifiers or a mailbox. Sign the original URI,
 // independently of the backend's percent-decoding implementation.
 const uri = h.origin + '/api/platter/crm/card?' + Object.entries(values).map(([k, v]) => k + '=' + v).join('&')
 const signature = createHmac('sha256', 'synthetic-platter-4700').update('GET' + uri + timestamp).digest('base64')
 return h.send(path, undefined, '', { 'x-hubspot-request-timestamp': timestamp, 'x-hubspot-signature-v3': signature, ...headerOverrides })
}
export async function configureCard(h) { return h.cmd('crm.card.configure', { appId: 'synthetic-platter-app', clientSecret: 'synthetic-platter-4700', consent: true }) }
export async function reviewedSyncJourney(verified) {
 const edge = hubspotSyncFixture(), h = await harness({ outboundService: edge.request })
 try {
  await h.cmd('provider.connect', { provider: 'hubspot', version: 0, token: 'synthetic-platter-4607', consent: true })
  await configureCard(h)
  assert.equal((await signedCard(h)).status, 200)
  assert.equal((await signedCard(h, {}, { 'x-hubspot-signature-v3': 'synthetic-platter-invalid' })).status, 401)
  assert.equal((await signedCard(h, {}, { 'x-hubspot-request-timestamp': String(Date.now() - 301000) })).status, 401)
  assert.equal((await signedCard(h, { portalId: 'synthetic-platter-other' })).status, 403)
  assert.equal((await signedCard(h, { appId: 'synthetic-platter-other' })).status, 403)
  assert.equal((await signedCard(h, { userEmail: ['synthetic-platter-unknown', 'example.test'].join('@') })).status, 403)
  assert.equal((await signedCard(h, { objectTypeId: '0-1' })).status, 400)
  assert.deepEqual((await signedCard(h)).value.proposals, [])
  const make = async dealId => { const review = await h.cmd('crm.deal.review', { ...edge.selected, dealId }); return h.cmd('crm.deal.apply', { id: review.id, digest: review.digest, consent: true }) }
  const made = await make(edge.state.deal.id)
  let card = await signedCard(h); assert.deepEqual(card.value.proposals.map(p => [p.id, p.status]), [[made.id, 'draft']]); assert.ok(card.value.startUrl.includes('/app/crm-card?'))
  assert.ok(!JSON.stringify(card.value).includes('synthetic-platter-4700')); assert.ok(!JSON.stringify(card.value).includes('synthetic-platter-4607')); assert.ok(!JSON.stringify(card.value).includes('/p/'))
  assert.equal((await h.send('/api/platter/crm/card-preview?' + new URLSearchParams({ dealId: edge.state.deal.id, accountId: 'synthetic-platter-other' }), undefined, h.owner)).status, 409)
  const row = async () => (await h.state()).proposals.find(p => p.id === made.id)
  await h.cmd('crm.sync.review', { proposalId: made.id, version: 1, ...syncMapping }, h.owner, 409)
  await h.cmd('proposal.approve', { id: made.id, version: 1, revision: 1 })
  const invitation = await h.cmd('proposal.send', { id: made.id, version: 2 }), path = new URL(invitation.shareUrl).pathname
  await h.cmd('tracking.settings', { enabled: 'yes', alerts: 'no', retentionDays: 90, quietMinutes: 30, consent: 'yes' })
  const clientCookie = await verified(h, path); assert.equal((await h.send(path, undefined, clientCookie)).status, 200)
  const fresh = async (cookie = h.owner) => h.cmd('crm.sync.review', { proposalId: made.id, version: (await row()).version, ...syncMapping }, cookie)
  const apply = (r, cookie = h.owner, status = 200, changes = {}) => h.cmd('crm.sync.apply', { id: r.id, digest: r.digest, consent: true, ...changes }, cookie, status)
  const checked = await fresh()
  assert.equal(checked.plan.totalCents, 36122); assert.equal(checked.plan.status, 'viewed')
  assert.deepEqual(checked.plan.operations.filter(o => o.path.includes('line_items')).map(o => [o.body.properties.quantity, o.body.properties.price]), [['2.5', '120.50'], ['3', '19.99']])
  assert.deepEqual(checked.plan.operations.filter(o => o.method === 'POST').map(o => o.label), ['sent timeline note', 'viewed timeline note'])
  await apply(checked, h.owner, 400, { consent: false }); await apply(checked, h.owner, 409, { digest: 'synthetic-platter-tampered' }); assert.equal(edge.writes.length, 0)
  edge.state.deal.properties.synthetic_link = 'https://example.test/changed'
  await apply(checked, h.owner, 409); assert.equal(edge.writes.length, 0); edge.state.deal.properties.synthetic_link = ''
  edge.metadata.synthetic_status.modificationMetadata.readOnlyValue = true
  await h.cmd('crm.sync.review', { proposalId: made.id, version: 3, ...syncMapping }, h.owner, 409); assert.equal(edge.writes.length, 0)
  edge.metadata.synthetic_status.modificationMetadata.readOnlyValue = false
  const success = await apply(checked); assert.equal(success.held, 0); assert.equal(success.confirmed, 5)
  assert.equal(edge.state.deal.properties.amount, '361.22'); assert.equal(edge.state.deal.properties.synthetic_status, 'viewed'); assert.equal(edge.state.deal.properties.synthetic_link, h.origin + '/app/proposal?id=' + made.id)
  assert.ok(!JSON.stringify(edge.writes).includes(new URL(invitation.shareUrl).pathname)); assert.ok(!JSON.stringify(edge.writes).includes(edge.state.contacts[0].properties.email))
  const written = edge.writes.length; await apply(checked, h.owner, 409); assert.equal(edge.writes.length, written)
  edge.state.line_items[0].properties.price = '200.00'; edge.state.line_items[0].properties.amount = '500.00'; edge.state.deal.properties.amount = '559.97'
  assert.equal((await h.send(path + '/data.json', undefined, clientCookie)).value.options[0].cents, 36122)
  await apply(await fresh()); assert.equal(edge.state.line_items[0].properties.price, '120.50'); assert.equal(edge.state.line_items[0].properties.amount, '301.25'); assert.equal(edge.state.deal.properties.amount, '361.22'); assert.equal(edge.notes.length, 2, 'a fresh explicit review reconciles changed provider prices without duplicating timeline notes')
  const accepted = await h.send(path + '/action?name=accept', { name: 'Taylor Reed', optionId: 'one', consent: true }, clientCookie); assert.equal(accepted.status, 200, accepted.text)
  await apply(await fresh()); assert.equal(edge.state.deal.properties.dealstage, syncMapping.wonStage); assert.equal(edge.state.deal.properties.synthetic_status, 'signed'); assert.equal(edge.notes.length, 3, 'signing does not manufacture a paid event')
  await h.cmd('payment.record', { id: made.id, method: 'wire', amount: '361.22', receivedOn: '2030-01-01', reference: 'synthetic-platter-4701', consent: true })
  await apply(await fresh()); assert.equal(edge.state.deal.properties.synthetic_status, 'paid'); assert.equal(edge.notes.length, 4)
  assert.deepEqual(edge.notes.map(n => n.properties.hs_note_body.match(/: (\w+)\./)[1]), ['sent', 'viewed', 'signed', 'paid'])
  assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_crm_sync_consents').first()).n, 4)
  assert.ok((await h.state()).crmSyncHistory.every(a => a.status === 'confirmed'))
  const memberEmail = ['synthetic-platter-4702', 'example.test'].join('@')
  await h.send('/auth/invite', { email: memberEmail, displayName: 'Synthetic CRM member', role: 'member', returnTo: '/app' }, h.owner)
  const member = await h.signIn(memberEmail), person = (await h.state()).teamPeople.find(p => p.email === memberEmail)
  const beforeRefusal = edge.writes.length
  await h.cmd('crm.sync.review', { proposalId: made.id, version: (await row()).version, ...syncMapping }, member, 403)
  assert.equal((await signedCard(h, { userEmail: memberEmail })).status, 403)
  await h.cmd('member.set', { operatorId: person.id, version: 0, role: 'admin', teams: [] })
  const adminReview = await fresh(member)
  let demoted = false
  edge.beforeReply(async req => { if (!demoted && req.url.includes('/properties/deals/')) { demoted = true; await h.cmd('member.set', { operatorId: person.id, version: 1, role: 'sales', teams: [] }) } })
  await apply(adminReview, member, 409); edge.beforeReply(undefined); assert.equal(edge.writes.length, beforeRefusal)
  assert.equal((await signedCard(h, { userEmail: memberEmail })).status, 403)
  const revoked = await fresh()
  await h.cmd('provider.disconnect', { provider: 'hubspot', version: 1 }); await apply(revoked, h.owner, 409); assert.equal((await signedCard(h)).status, 409); assert.equal(edge.writes.length, beforeRefusal)
  await h.cmd('provider.connect', { provider: 'hubspot', version: 2, token: 'synthetic-platter-4607', consent: true })
  await apply(revoked, h.owner, 409); assert.equal((await signedCard(h)).status, 401); await configureCard(h)
  edge.state.deal.id = 'synthetic-platter-4710'; edge.state.deal.properties.synthetic_status = ''; edge.state.deal.properties.synthetic_link = ''
  const second = await make(edge.state.deal.id)
  assert.deepEqual((await signedCard(h, { dealId: edge.state.deal.id })).value.proposals.map(p => p.id), [second.id], 'another deal card lists only its own proposals')
  await h.cmd('proposal.approve', { id: second.id, version: 1, revision: 1 }); await h.cmd('proposal.send', { id: second.id, version: 2 })
  const uncertain = await h.cmd('crm.sync.review', { proposalId: second.id, version: 3, ...syncMapping })
  edge.loseNextNoteResponse(); const held = await apply(uncertain); assert.equal(held.held, 1)
  const afterUncertain = edge.writes.length, noteCount = edge.notes.length
  const renewed = await h.cmd('crm.sync.review', { proposalId: second.id, version: 3, ...syncMapping }); assert.equal((await apply(renewed)).held, 1)
  assert.equal(edge.writes.slice(afterUncertain).filter(w => w.method === 'POST').length, 0); assert.equal(edge.notes.length, noteCount, 'uncertain note creation cannot be replayed even after fresh review')
  assert.ok((await h.state()).crmSyncHistory.some(a => a.status === 'uncertain'))
  await h.cmd('crm.card.configure', { enabled: 'no' }); assert.equal((await signedCard(h)).status, 401)
 } finally { await h.close() }
 await credentialFailureJourney()
 await (await import('./hubspot-rows-journey.mjs')).hubspotRowsJourney()
}

async function credentialFailureJourney() {
 const edge = hubspotSyncFixture()
 let h, refusal, reconnectDuringRead = false, calls = 0
 h = await harness({ outboundService: async request => {
  calls++
  const url = new URL(request.url)
  if (reconnectDuringRead && request.method === 'GET' && url.pathname.includes('/objects/deals/')) {
   reconnectDuringRead = false
   const connection = (await h.state()).connections.find(c => c.provider === 'hubspot')
   await h.cmd('provider.connect', { provider: 'hubspot', version: connection.version, token: 'synthetic-platter-4607', consent: true })
   return new Response(null, { status: 401 })
  }
  if (refusal && request.method === refusal.method && url.pathname.includes(refusal.path)) {
   const current = refusal; refusal = undefined
   return Response.json({ category: current.category, message: 'synthetic-platter-private-provider-detail' }, { status: current.status })
  }
  return edge.request(request)
 } })
 try {
  const connection = async () => (await h.state()).connections.find(c => c.provider === 'hubspot')
  const reconnect = async () => h.cmd('provider.connect', { provider: 'hubspot', version: (await connection())?.version ?? 0, token: 'synthetic-platter-4607', consent: true })
  await reconnect(); await configureCard(h)
  const draftReview = await h.cmd('crm.deal.review', edge.selected)
  const draft = await h.cmd('crm.deal.apply', { id: draftReview.id, digest: draftReview.digest, consent: true })
  await h.cmd('proposal.approve', { id: draft.id, version: 1, revision: 1 })
  await h.cmd('proposal.send', { id: draft.id, version: 2 })
  const fresh = (status = 200) => h.cmd('crm.sync.review', { proposalId: draft.id, version: 3, ...syncMapping }, h.owner, status)
  const apply = (r, status = 200) => h.cmd('crm.sync.apply', { id: r.id, digest: r.digest, consent: true }, h.owner, status)
  const checked = await fresh(), proposalsBefore = (await h.state()).proposals
  for (const [status, category] of [[429, 'RATE_LIMITS'], [503, 'SERVICE_UNAVAILABLE'], [403, 'FORBIDDEN']]) {
   refusal = { method: 'GET', path: '/objects/deals/', status, category }
   await h.cmd('crm.deal.review', edge.selected, h.owner, 409)
   assert.equal((await connection()).status, 'connected', 'transient errors and unrelated refusals do not invalidate credentials')
  }
  refusal = { method: 'GET', path: '/objects/deals/', status: 401, category: 'INVALID_AUTHENTICATION' }
  const rejected = await h.send('/api/platter/command', { name: 'crm.deal.review', input: edge.selected }, h.owner)
  assert.equal(rejected.status, 409); assert.ok(!rejected.text.includes('synthetic-platter-private-provider-detail'))
  assert.equal((await connection()).status, 'broken')
  const afterRejection = calls
  await h.cmd('crm.deal.review', edge.selected, h.owner, 409)
  await apply(checked, 409); assert.equal((await signedCard(h)).status, 401)
  await h.cmd('proposal.prepare', { clientId: proposalsBefore[0].client_id, title: '{{Deal.Name}}', scope: 'Synthetic copied variables', optionOne: 'Scope', priceOne: '100', optionTwo: 'Other scope', priceTwo: '200', depositPercent: '25', variableDeal: { provider: 'hubspot', id: edge.selected.dealId } }, h.owner, 409)
  assert.equal(calls, afterRejection, 'confirmed revocation stops further reads, writes and signed card exposure')
  assert.equal(edge.writes.length, 0); assert.deepEqual((await h.state()).proposals, proposalsBefore)
  await reconnect(); await configureCard(h)
  const afterReconnect = calls
  await apply(checked, 409); assert.equal(calls, afterReconnect, 'reconnection cannot reactivate a reviewed write or read its old source')
  assert.equal((await signedCard(h)).status, 200)
  reconnectDuringRead = true
  await h.cmd('crm.deal.review', edge.selected, h.owner, 409)
  assert.equal((await connection()).status, 'connected', 'an old credential failure cannot break a concurrent new connection')
  await configureCard(h)
  const writeReview = await fresh()
  refusal = { method: 'PATCH', path: '/objects/line_items/', status: 403, category: 'MISSING_SCOPES' }
  const held = await apply(writeReview)
  assert.equal(held.held, 1); assert.equal(held.confirmed, 0); assert.equal(edge.writes.length, 0)
  assert.equal((await connection()).status, 'broken')
  assert.deepEqual((await h.state()).proposals, proposalsBefore)
  assert.equal((await h.state()).crmSyncHistory.at(-1).status, 'uncertain')
  const afterWriteRefusal = calls
  await fresh(409)
  assert.equal((await signedCard(h)).status, 401); assert.equal(calls, afterWriteRefusal)
  await reconnect(); await apply(writeReview, 409)
  assert.equal((await apply(await fresh())).held, 1); assert.equal(edge.writes.length, 0, 'fresh credentials never replay a held write')
 } finally { await h.close() }
}

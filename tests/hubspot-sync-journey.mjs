import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { harness } from './harness.mjs'
import { hubspotSyncFixture, syncMapping } from './hubspot-sync-fixture.mjs'

export async function signedCard(h, query = {}, headerOverrides = {}) {
 const params = new URLSearchParams({ dealId: 'synthetic-platter-4600', objectTypeId: '0-3', portalId: 'synthetic-platter-portal', appId: 'synthetic-platter-app', userEmail: h.auth.OWNER_EMAIL, ...query })
 const path = '/api/platter/crm/card?' + params, timestamp = String(Date.now())
 const uri = (h.origin + path).replace(/%(3A|2F|3F|40|21|24|27|28|29|2A|2C|3B)/gi, v => decodeURIComponent(v))
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
  const written = edge.writes.length; await apply(checked, h.owner, 409); assert.equal(edge.writes.length, written); await apply(await fresh()); assert.equal(edge.notes.length, 2, 'fresh explicit reviews never duplicate timeline notes')
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
}

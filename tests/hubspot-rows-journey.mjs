import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { hubspotSyncFixture, syncMapping } from './hubspot-sync-fixture.mjs'

export const changedRows = [
 { name: 'Revised strategy', description: 'Independently edited scope', quantity: '4', unit: 'each', unitPrice: '123.45' },
 { name: 'New production work', quantity: '2', unit: 'each', unitPrice: '27.75' },
]
export const changedMapping = { ...syncMapping, lineIds: ['synthetic-platter-4605', 'new'] }
export async function reviseHubspotRows(h, draftId) {
 const row = (await h.state()).proposals.find(p => p.id === draftId)
 return h.cmd('proposal.revise', { id: row.id, version: row.version, clientId: row.client_id, title: row.title, scope: row.scope, depositPercent: 25, packages: [{ id: 'one', label: 'Revised deal scope' }], pricingTables: [{ optionId: 'one', name: 'Reviewed rows', lines: changedRows }] })
}

export async function hubspotRowsJourney() {
 const edge = hubspotSyncFixture(), h = await harness({ outboundService: edge.request })
 try {
  await h.cmd('provider.connect', { provider: 'hubspot', version: 0, token: 'synthetic-platter-4607', consent: true })
  const review = await h.cmd('crm.deal.review', edge.selected)
  const draft = await h.cmd('crm.deal.apply', { id: review.id, digest: review.digest, consent: true })
  await reviseHubspotRows(h, draft.id)
  await h.cmd('proposal.send', { id: draft.id, version: 2 }, h.owner, 409)
  await h.cmd('proposal.approve', { id: draft.id, version: 2, revision: 2 })
  await h.cmd('proposal.send', { id: draft.id, version: 3 })
  const fresh = (mapping = changedMapping, status = 200) => h.cmd('crm.sync.review', { proposalId: draft.id, version: 4, ...mapping }, h.owner, status)
  const apply = (r, status = 200, extra = {}) => h.cmd('crm.sync.apply', { id: r.id, digest: r.digest, consent: true, ...extra }, h.owner, status)
  const original = structuredClone(edge.state)
  await fresh(syncMapping, 409)
  await fresh({ ...changedMapping, lineIds: ['synthetic-platter-4605', 'synthetic-platter-4605'] }, 409)
  await fresh({ ...changedMapping, lineIds: ['synthetic-platter-unrelated', 'new'] }, 409)
  assert.equal(edge.writes.length, 0); assert.deepEqual(edge.state, original)
  const checked = await fresh()
  assert.equal(checked.plan.totalCents, 54930)
  assert.deepEqual(checked.plan.operations.map(o => [o.method, o.label]), [
   ['PATCH', 'Priced row synthetic-platter-4605'], ['POST', 'Create priced row 2 on this deal'],
   ['DELETE', 'Unlink priced row synthetic-platter-4606 from this deal; retain the provider record'],
   ['PATCH', 'Deal amount, status, protected link and stage'], ['POST', 'sent timeline note'],
  ])
  await apply(checked, 409, { digest: 'synthetic-platter-unreviewed' })
  edge.state.line_items[1].properties.description = 'Changed after review'
  await apply(checked, 409); assert.equal(edge.writes.length, 0)
  edge.state.line_items[1].properties.description = original.line_items[1].properties.description
  const result = await apply(checked)
  assert.equal(result.held, 0); assert.equal(result.confirmed, 5)
  assert.equal(edge.state.deal.properties.amount, '549.30')
  const ids = edge.state.deal.associations.line_items.results.map(r => r.id)
  assert.equal(ids.length, 2); assert.ok(ids.includes('synthetic-platter-4605')); assert.ok(!ids.includes('synthetic-platter-4606'))
  assert.deepEqual(edge.state.line_items.find(r => r.id === 'synthetic-platter-4606'), original.line_items[1], 'unlinking does not delete or change the old provider record')
  const created = edge.state.line_items.find(r => !original.line_items.some(o => o.id === r.id))
  assert.deepEqual([created.properties.quantity, created.properties.price, created.properties.amount], ['2', '27.75', '55.50'])
  assert.deepEqual([edge.state.line_items[0].properties.quantity, edge.state.line_items[0].properties.price, edge.state.line_items[0].properties.amount], ['4', '123.45', '493.80'])
  const receipts = (await h.state()).crmSyncHistory
  assert.ok(receipts.some(r => r.provider_id === created.id && r.status === 'confirmed'))
  assert.ok(receipts.some(r => r.provider_id === 'synthetic-platter-4606' && r.status === 'confirmed'))
  const writes = edge.writes.length
  await apply(checked, 409); assert.equal(edge.writes.length, writes)
  assert.equal((await apply(await fresh())).held, 0)
  assert.equal((await apply(await fresh(syncMapping))).held, 0)
  assert.equal(edge.writes.filter(w => w.method === 'POST' && w.path.endsWith('/line_items')).length, 1, 'fresh reviews reuse the confirmed new row instead of duplicating it')
  assert.equal(edge.writes.filter(w => w.method === 'DELETE').length, 1); assert.equal(edge.notes.length, 1)
  const source = (await h.send('/api/platter/crm/source?id=' + draft.id, undefined, h.owner)).value
  assert.deepEqual(source.source.lines.map(r => r.id), ['synthetic-platter-4605', 'synthetic-platter-4606'], 'original provenance is never rewritten by outbound reconciliation')
 } finally { await h.close() }
 await uncertainRemovalJourney()
 await uncertainCreationJourney()
}
async function uncertainRemovalJourney() {
 const edge = hubspotSyncFixture(), h = await harness({ outboundService: edge.request })
 try {
  await h.cmd('provider.connect', { provider: 'hubspot', version: 0, token: 'synthetic-platter-4607', consent: true })
  const review = await h.cmd('crm.deal.review', edge.selected)
  const draft = await h.cmd('crm.deal.apply', { id: review.id, digest: review.digest, consent: true })
  const row = (await h.state()).proposals.find(p => p.id === draft.id)
  await h.cmd('proposal.revise', { id: row.id, version: 1, clientId: row.client_id, title: row.title, scope: row.scope, depositPercent: 25, packages: [{ id: 'one', label: 'Strategy only' }], pricingTables: [{ optionId: 'one', name: 'Retained row', lines: [{ name: 'Campaign strategy', quantity: '2.5', unit: 'each', unitPrice: '120.50' }] }] })
  await h.cmd('proposal.approve', { id: draft.id, version: 2, revision: 2 }); await h.cmd('proposal.send', { id: draft.id, version: 3 })
  const fresh = () => h.cmd('crm.sync.review', { proposalId: draft.id, version: 4, ...syncMapping })
  const apply = r => h.cmd('crm.sync.apply', { id: r.id, digest: r.digest, consent: true })
  const checked = await fresh()
  edge.loseNextUnlinkResponse()
  const result = await apply(checked); assert.equal(result.held, 1); assert.equal(result.confirmed, 1)
  assert.ok(!edge.state.deal.associations.line_items.results.some(r => r.id === 'synthetic-platter-4606'))
  // An operator reconciles the provider's amount, but has not resolved the
  // retained uncertain receipt. A new review still confers no write authority.
  edge.state.deal.properties.amount = '301.25'
  const writes = edge.writes.length
  const held = await apply(await fresh()); assert.equal(held.held, 1); assert.equal(held.confirmed, 0)
  assert.equal(edge.writes.length, writes); assert.equal(edge.notes.length, 0)
  assert.ok((await h.state()).crmSyncHistory.some(r => r.status === 'uncertain'))
 } finally { await h.close() }
}

async function uncertainCreationJourney() {
 const edge = hubspotSyncFixture(), h = await harness({ outboundService: edge.request })
 try {
  await h.cmd('provider.connect', { provider: 'hubspot', version: 0, token: 'synthetic-platter-4607', consent: true })
  const review = await h.cmd('crm.deal.review', edge.selected)
  const draft = await h.cmd('crm.deal.apply', { id: review.id, digest: review.digest, consent: true })
  await reviseHubspotRows(h, draft.id)
  await h.cmd('proposal.approve', { id: draft.id, version: 2, revision: 2 }); await h.cmd('proposal.send', { id: draft.id, version: 3 })
  const input = { proposalId: draft.id, version: 4, ...changedMapping }
  const checked = await h.cmd('crm.sync.review', input)
  edge.loseNextLineResponse()
  const result = await h.cmd('crm.sync.apply', { id: checked.id, digest: checked.digest, consent: true })
  assert.equal(result.held, 1); assert.equal(result.confirmed, 1)
  assert.equal(edge.state.line_items.length, 3, 'the provider accepted the new row before losing its response')
  const writes = edge.writes.length
  // Even if the operator repairs the current amount, no confirmed provider ID
  // exists for this creation. It must be reconciled rather than created twice.
  edge.state.deal.properties.amount = '609.27'
  await h.cmd('crm.sync.review', input, h.owner, 409)
  assert.equal(edge.writes.length, writes)
  assert.equal(edge.writes.filter(w => w.method === 'POST' && w.path.endsWith('/line_items')).length, 1)
  assert.equal(edge.notes.length, 0)
  assert.ok((await h.state()).crmSyncHistory.some(r => r.status === 'uncertain'))
 } finally { await h.close() }
}

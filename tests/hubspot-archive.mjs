import assert from 'node:assert/strict'
import { syncMapping } from './hubspot-sync-fixture.mjs'
import { changedMapping, reviseHubspotRows } from './hubspot-rows-journey.mjs'
import { configureCard, signedCard } from './hubspot-sync-journey.mjs'
export async function seedHubspotArchive(h, proposalId, revokeCredential) {
 await configureCard(h)
 await h.cmd('proposal.approve', { id: proposalId, version: 1, revision: 1 })
 await h.cmd('proposal.send', { id: proposalId, version: 2 })
 const originalReview = await h.cmd('crm.sync.review', { proposalId, version: 3, ...syncMapping })
 const originalApplied = await h.cmd('crm.sync.apply', { id: originalReview.id, digest: originalReview.digest, consent: true }); assert.equal(originalApplied.held, 0)
 // Keep the original custody fixture intact and reconcile a second proposal.
 const source = (await h.send('/api/platter/crm/source?id=' + proposalId, undefined, h.owner)).value.source
 const draftReview = await h.cmd('crm.deal.review', { dealId: source.dealId, companyId: source.company.id, contactId: source.contact.id })
 const reconciled = await h.cmd('crm.deal.apply', { id: draftReview.id, digest: draftReview.digest, consent: true })
 await reviseHubspotRows(h, reconciled.id)
 await h.cmd('proposal.approve', { id: reconciled.id, version: 2, revision: 2 })
 await h.cmd('proposal.send', { id: reconciled.id, version: 3 })
 const input = { proposalId: reconciled.id, version: 4, ...changedMapping }
 const review = await h.cmd('crm.sync.review', input)
 const applied = await h.cmd('crm.sync.apply', { id: review.id, digest: review.digest, consent: true }); assert.equal(applied.held, 0)
 const options = (await h.state()).proposals.find(p => p.id === reconciled.id).options
 assert.equal(options[0].cents, 54930)
 const unused = await h.cmd('crm.sync.review', input)
 const attempts = (await h.db.prepare('SELECT * FROM p_crm_sync_attempts ORDER BY id').all()).results
 const consents = (await h.db.prepare('SELECT * FROM p_crm_sync_consents ORDER BY id').all()).results
 assert.ok(attempts.some(r => r.status === 'confirmed' && JSON.parse(r.request_json).path === '/objects/line_items' && r.provider_id))
 assert.ok(attempts.some(r => r.status === 'confirmed' && JSON.parse(r.request_json).method === 'DELETE' && r.provider_id === 'synthetic-platter-4606'))
 assert.ok(attempts.length > 0); assert.ok(consents.length > 0)
 revokeCredential()
 await h.cmd('crm.deal.review', { dealId: review.plan.dealId }, h.owner, 409)
 assert.equal((await h.state()).connections.find(c => c.provider === 'hubspot').status, 'broken')
 const brokenAt = (await h.db.prepare("SELECT broken_at FROM p_connections WHERE id='workspace:hubspot'").first()).broken_at
 assert.ok(brokenAt)
 return { input, unused, attempts, consents, brokenAt, options }
}
export async function assertHubspotArchive(h, owner, before) {
 assert.deepEqual((await h.state(owner)).proposals.find(p => p.id === before.input.proposalId).options, before.options, 'reconciled prices survive independently of the original copied proposal')
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_crm_sync_attempts ORDER BY id').all()).results, before.attempts, 'exact CRM write requests and provider receipts remain business history')
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_crm_sync_consents ORDER BY id').all()).results, before.consents, 'the exact historical field map, reviewed bytes and actor survive')
 for (const table of ['p_crm_sync_reviews', 'p_crm_card_secrets']) assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM ' + table).first()).n, 0, 'restoration cannot mint CRM execution or card authority')
 await h.cmd('crm.sync.apply', { id: before.unused.id, digest: before.unused.digest, consent: true }, owner, 409)
 await h.cmd('crm.sync.review', before.input, owner, 409)
 assert.equal((await signedCard(h)).status, 409)
 assert.equal((await h.db.prepare("SELECT broken_at FROM p_connections WHERE id='workspace:hubspot'").first()).broken_at, before.brokenAt, 'the confirmed credential failure remains business history')
 assert.equal((await h.state(owner)).connections.find(c => c.provider === 'hubspot').status, 'needs_reconnection')
 assert.ok(!JSON.stringify((await h.state(owner)).crmSyncHistory).includes('synthetic-platter-4700'))
}

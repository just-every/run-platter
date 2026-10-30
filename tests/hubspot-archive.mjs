import assert from 'node:assert/strict'
import { syncMapping } from './hubspot-sync-fixture.mjs'
import { configureCard, signedCard } from './hubspot-sync-journey.mjs'
export async function seedHubspotArchive(h, proposalId) {
 await configureCard(h)
 await h.cmd('proposal.approve', { id: proposalId, version: 1, revision: 1 })
 await h.cmd('proposal.send', { id: proposalId, version: 2 })
 const input = { proposalId, version: 3, ...syncMapping }
 const review = await h.cmd('crm.sync.review', input)
 const applied = await h.cmd('crm.sync.apply', { id: review.id, digest: review.digest, consent: true }); assert.equal(applied.held, 0)
 const unused = await h.cmd('crm.sync.review', input)
 const attempts = (await h.db.prepare('SELECT * FROM p_crm_sync_attempts ORDER BY id').all()).results
 const consents = (await h.db.prepare('SELECT * FROM p_crm_sync_consents ORDER BY id').all()).results
 assert.ok(attempts.length > 0); assert.ok(consents.length > 0)
 return { input, unused, attempts, consents }
}
export async function assertHubspotArchive(h, owner, before) {
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_crm_sync_attempts ORDER BY id').all()).results, before.attempts, 'exact CRM write requests and provider receipts remain business history')
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_crm_sync_consents ORDER BY id').all()).results, before.consents, 'the exact historical field map, reviewed bytes and actor survive')
 for (const table of ['p_crm_sync_reviews', 'p_crm_card_secrets']) assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM ' + table).first()).n, 0, 'restoration cannot mint CRM execution or card authority')
 await h.cmd('crm.sync.apply', { id: before.unused.id, digest: before.unused.digest, consent: true }, owner, 409)
 await h.cmd('crm.sync.review', before.input, owner, 409)
 assert.equal((await signedCard(h)).status, 409)
 assert.ok(!JSON.stringify((await h.state(owner)).crmSyncHistory).includes('synthetic-platter-4700'))
}

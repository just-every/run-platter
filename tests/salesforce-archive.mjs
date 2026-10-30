import assert from 'node:assert/strict'
import { salesforceMapping } from './salesforce-sync-fixture.mjs'

export async function seedSalesforceArchive(h, selected) {
 const r = await h.cmd('crm.opportunity.review', selected), made = await h.cmd('crm.opportunity.apply', { id: r.id, digest: r.digest, consent: true })
 await h.cmd('proposal.approve', { id: made.id, version: 1, revision: 1 })
 const path = new URL((await h.cmd('proposal.send', { id: made.id, version: 2 })).shareUrl).pathname
 await h.send(path + '/action?name=code.request', {})
 const code = (await h.state()).outbox.find(r => r.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
 const verified = await h.send(path + '/action?name=code.verify', { code }); assert.equal(verified.status, 200)
 assert.equal((await h.send(path + '/action?name=accept', { name: 'Taylor Reed', optionId: 'one', consent: true }, verified.cookie)).status, 200)
 const proposal = (await h.state()).proposals.find(p => p.id === made.id), input = { proposalId: made.id, version: proposal.version, ...salesforceMapping }
 const review = await h.cmd('crm.salesforce.review', input)
 const applied = await h.cmd('crm.salesforce.apply', { id: review.id, digest: review.digest, consent: true }); assert.equal(applied.held, 0)
 const unused = await h.cmd('crm.salesforce.review', input)
 const attempts = (await h.db.prepare("SELECT * FROM p_crm_sync_attempts WHERE provider='salesforce' ORDER BY id").all()).results
 const consents = (await h.db.prepare("SELECT * FROM p_crm_sync_consents WHERE provider='salesforce' ORDER BY id").all()).results
 assert.equal(attempts.length, 5); assert.equal(consents.length, 1)
 return { input, unused, attempts, consents, proposal }
}
export async function assertSalesforceArchive(h, owner, before) {
 assert.deepEqual((await h.db.prepare("SELECT * FROM p_crm_sync_attempts WHERE provider='salesforce' ORDER BY id").all()).results, before.attempts, 'Salesforce requests, confirmed IDs and times survive as exact history')
 assert.deepEqual((await h.db.prepare("SELECT * FROM p_crm_sync_consents WHERE provider='salesforce' ORDER BY id").all()).results, before.consents, 'reviewed source, selected stages, field map and human consent survive exactly')
 const proposal = (await h.state(owner)).proposals.find(p => p.id === before.proposal.id)
 assert.deepEqual(proposal.acceptance, before.proposal.acceptance); assert.deepEqual(proposal.options, before.proposal.options)
 await h.cmd('crm.salesforce.apply', { id: before.unused.id, digest: before.unused.digest, consent: true }, owner, 409)
 await h.cmd('crm.salesforce.review', before.input, owner, 409)
 const history = JSON.stringify((await h.state(owner)).crmSyncHistory.filter(r => r.provider === 'salesforce'))
 assert.ok(!history.includes('synthetic-platter-4707')); assert.ok(!history.includes('instanceOrigin')); assert.ok(!history.includes('Bearer'))
}

import assert from 'node:assert/strict'

export async function seedProviderArchive(h, provider, edge, proposalId) {
 const prefix = 'crm.' + provider + '.sync.'
 await h.cmd('proposal.approve', { id: proposalId, version: 1, revision: 1 }); await h.cmd('proposal.send', { id: proposalId, version: 2 })
 const input = { proposalId, version: 3, ...edge.mapping }, review = await h.cmd(prefix + 'review', input)
 assert.equal((await h.cmd(prefix + 'apply', { id: review.id, digest: review.digest, consent: true })).held, 0)
 const unused = await h.cmd(prefix + 'review', input)
 const query = new URLSearchParams({ provider, accountId: provider === 'pipedrive' ? '12101' : '12401', dealId: edge.selected.dealId })
 const card = await h.send('/api/platter/crm/card-preview?' + query, undefined, h.owner)
 assert.equal(card.status, 200); assert.deepEqual(card.value.proposals.map(p => [p.id, p.status]), [[proposalId, 'sent']])
 const attempts = (await h.db.prepare('SELECT * FROM p_crm_provider_attempts WHERE provider=? ORDER BY id').bind(provider).all()).results
 const consents = (await h.db.prepare('SELECT * FROM p_crm_provider_consents WHERE provider=? ORDER BY id').bind(provider).all()).results
 assert.ok(attempts.length > 0); assert.equal(consents.length, 1)
 return { provider, input, unused, attempts, consents, query: query.toString() }
}
export async function assertProviderArchive(h, owner, before) {
 const provider = before.provider, prefix = 'crm.' + provider + '.sync.'
 assert.equal((await h.send('/api/platter/crm/card-preview?' + before.query, undefined, owner)).status, 409, 'restored source history cannot authorize card reads')
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_crm_provider_attempts WHERE provider=? ORDER BY id').bind(provider).all()).results, before.attempts, 'exact provider requests and receipts survive')
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_crm_provider_consents WHERE provider=? ORDER BY id').bind(provider).all()).results, before.consents, 'reviewed field map, source bytes and actor survive')
 assert.equal((await h.db.prepare('SELECT COUNT(*) AS n FROM p_crm_provider_reviews').first()).n, 0)
 await h.cmd(prefix + 'apply', { id: before.unused.id, digest: before.unused.digest, consent: true }, owner, 409)
 await h.cmd(prefix + 'review', before.input, owner, 409)
 assert.equal((await h.state(owner)).connections.find(r => r.provider === provider).status, 'needs_reconnection')
}

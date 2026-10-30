import assert from 'node:assert/strict'
import { harness } from './harness.mjs'

export const pipedriveToken = 'synthetic-platter-12100'
export function pipedriveFixture() {
 const state = {
  companyId: 12101,
  deal: { id: 12102, title: 'Synthetic Pipedrive engagement', description: 'Deliver the reviewed Pipedrive campaign.', value: 361.22, currency: 'USD', org_id: { value: 12103 }, person_id: { value: 12104 }, update_time: '2030-01-01 00:00:00' },
  organization: { id: 12103, name: 'Synthetic Pipedrive organization', address: '10 Synthetic Street, Austin', update_time: '2030-01-01 00:00:00' },
  person: { id: 12104, name: 'Taylor Reed', first_name: 'Taylor', last_name: 'Reed', job_title: 'Director', org_id: { value: 12103 }, email: [{ value: ['synthetic-platter-12104', 'example.test'].join('@'), primary: true }], update_time: '2030-01-01 00:00:00' },
  attached: [{ id: 12105, product_id: 12107, name: 'Campaign strategy', item_price: 120.5, quantity: 2.5, sum: 301.25, currency: 'USD', tax: 0, discount: 0, enabled_flag: true, billing_frequency: 'one-time' }, { id: 12106, product_id: 12108, name: 'Asset licence', item_price: 19.99, quantity: 3, sum: 59.97, currency: 'USD', tax: 0, discount: 0, enabled_flag: true, billing_frequency: 'one-time' }],
  products: [{ id: 12107, name: 'Campaign strategy', description: 'Reviewed strategy work', code: 'synthetic-platter-12107', active_flag: true, update_time: '2030-01-01 00:00:00' }, { id: 12108, name: 'Asset licence', description: 'Reviewed usage licence', code: 'synthetic-platter-12108', active_flag: true, update_time: '2030-01-01 00:00:00' }],
  more: false,
 }
 const calls = []
 let hook
 const request = async req => {
  const url = new URL(req.url)
  assert.equal(url.hostname, 'api.pipedrive.com'); assert.equal(req.method, 'GET', 'reviewed drafting never writes to the provider')
  assert.equal(req.headers.get('authorization'), 'Bearer ' + pipedriveToken); assert.equal(url.searchParams.has('api_token'), false)
  calls.push({ path: url.pathname, query: url.search }); if (hook) await hook(req)
  let data
  if (url.pathname === '/v1/users/me') data = { id: 12109, company_id: state.companyId, active_flag: true }
  if (url.pathname === '/v1/deals/' + state.deal.id) data = state.deal
  if (url.pathname === '/v1/organizations/12103') data = state.organization
  if (url.pathname === '/v1/persons/12104') data = state.person
  if (url.pathname === '/v1/deals/' + state.deal.id + '/products') {
   assert.equal(url.searchParams.get('start'), '0'); assert.equal(url.searchParams.get('limit'), '50')
   return Response.json({ success: true, data: structuredClone(state.attached), additional_data: { pagination: { more_items_in_collection: state.more } } })
  }
  if (url.pathname.startsWith('/v1/products/')) data = state.products.find(r => String(r.id) === url.pathname.split('/').at(-1))
  return data ? Response.json({ success: true, data: structuredClone(data) }) : new Response(null, { status: 404 })
 }
 return { state, request, calls, beforeReply(fn) { hook = fn }, selected: { dealId: '12102', companyId: '12103', contactId: '12104' } }
}
export const connectPipedrive = h => h.cmd('provider.connect', { provider: 'pipedrive', version: 0, token: pipedriveToken, tenantId: '12101', consent: true })

export async function pipedriveHttpJourney(verified) {
 const edge = pipedriveFixture(), h = await harness({ outboundService: edge.request })
 try {
  const business = async () => {
   const rows = {}
   for (const table of ['p_clients', 'p_proposals', 'p_revisions', 'p_crm_draft_sources', 'p_approvals', 'p_acceptances', 'p_invoices']) rows[table] = (await h.db.prepare('SELECT * FROM ' + table + ' ORDER BY rowid').all()).results
   return rows
  }
  const review = (cookie = h.owner) => h.cmd('crm.pipedrive.review', edge.selected, cookie)
  const apply = (r, status = 200, cookie = h.owner, extra = {}) => h.cmd('crm.pipedrive.apply', { id: r.id, digest: r.digest, consent: true, ...extra }, cookie, status)
  await h.cmd('provider.connect', { provider: 'pipedrive', version: 0, token: pipedriveToken, tenantId: '99999', consent: true }, h.owner, 409)
  assert.deepEqual((await h.state()).connections, [])
  const noConsent = edge.calls.length
  await h.cmd('provider.connect', { provider: 'pipedrive', version: 0, token: pipedriveToken, tenantId: '12101', consent: false }, h.owner, 400)
  assert.equal(edge.calls.length, noConsent)
  await connectPipedrive(h)
  const sealed = await h.db.prepare("SELECT sealed FROM p_connection_secrets WHERE connection_id='workspace:pipedrive'").first()
  assert.ok(!sealed.sealed.includes(pipedriveToken)); assert.ok(!JSON.stringify(await h.state()).includes(pipedriveToken))
  const baseline = await business(), choices = await h.cmd('crm.pipedrive.review', { dealId: '12102' })
  assert.ok(choices.held); assert.equal(choices.id, undefined); assert.deepEqual(choices.companies, [{ id: '12103', name: 'Synthetic Pipedrive organization' }]); assert.equal(choices.contacts[0].id, '12104'); assert.deepEqual(await business(), baseline)
  const checked = await review()
  assert.equal(checked.content.options[0].cents, 36122)
  assert.deepEqual(checked.content.options[0].tables[0].lines.map(r => [r.name, r.quantity, r.unitPrice, r.lineTotalCents]), [['Campaign strategy', '2.5', '120.50', 30125], ['Asset licence', '3', '19.99', 5997]])
  await apply(checked, 409, h.owner, { digest: 'synthetic-platter-wrong-digest' }); await apply(checked, 400, h.owner, { consent: false })
  await h.cmd('crm.deal.apply', { id: checked.id, digest: checked.digest, consent: true }, h.owner, 409)
  for (const [target, key, value] of [[edge.state.deal, 'title', 'Changed deal'], [edge.state.person, 'job_title', 'Changed title'], [edge.state.products[0], 'description', 'Changed source'], [edge.state.attached[0], 'item_price', 999]]) {
   const old = target[key]; target[key] = value; await apply(checked, 409); target[key] = old; assert.deepEqual(await business(), baseline, 'changed source cannot create business records')
  }
  const made = await apply(checked), get = async () => (await h.state()).proposals.find(r => r.id === made.id)
  let p = await get()
  assert.equal(p.clientName, 'Synthetic Pipedrive organization'); assert.equal(p.clientEmail, ['synthetic-platter-12104', 'example.test'].join('@'))
  assert.equal(p.status, 'draft'); assert.equal(p.approved_by, null); assert.equal(p.collection.enabled, false); assert.deepEqual(p.recipientPlan ?? [], [])
  const source = (await h.send('/api/platter/crm/source?id=' + made.id, undefined, h.owner)).value
  assert.deepEqual([source.provider, source.account_id, source.deal_id, source.company_id, source.contact_id, source.reviewed_by], ['pipedrive', '12101', '12102', '12103', '12104', (await h.state()).actor.id])
  assert.deepEqual(source.source.lines.map(r => [r.id, r.productId, r.quantity, r.unitPrice]), [['12105', '12107', '2.5', '120.5'], ['12106', '12108', '3', '19.99']])
  assert.ok(!JSON.stringify(source).includes(pipedriveToken))
  assert.equal((await h.send('/api/platter/audit?action=crm.pipedrive.apply&subject=' + made.id, undefined, h.owner)).value.rows.length, 1)
  await apply(checked, 409); await h.cmd('proposal.send', { id: made.id, version: 1 }, h.owner, 409)
  await h.cmd('proposal.approve', { id: made.id, version: 1, revision: 1 })
  const path = new URL((await h.cmd('proposal.send', { id: made.id, version: 2 })).shareUrl).pathname, cookie = await verified(h, path)
  const sent = (await h.send(path + '/data.json', undefined, cookie)).value
  edge.state.deal.title = 'Later provider title'; edge.state.attached[0].item_price = 999; edge.state.organization.name = 'Later company'
  assert.deepEqual((await h.send(path + '/data.json', undefined, cookie)).value, sent, 'sent values remain independent of the source')
  assert.equal((await h.send(path + '/action?name=accept', { name: 'Taylor Reed', optionId: 'one', consent: true }, cookie)).status, 200)
  p = await get(); assert.equal(p.acceptance.totalCents, 36122)
  Object.assign(edge.state.deal, { title: 'Synthetic Pipedrive engagement' }); edge.state.attached[0].item_price = 120.5; edge.state.organization.name = 'Synthetic Pipedrive organization'
  const safe = await business()
  for (const [target, key, value] of [[edge.state.deal, 'currency', 'EUR'], [edge.state.person, 'email', []], [edge.state.person, 'email', [{ value: 'first' }, { value: 'second' }]], [edge.state.person, 'org_id', { value: 99999 }], [edge.state.attached[0], 'quantity', null], [edge.state.attached[0], 'item_price', 1.001], [edge.state.attached[0], 'currency', 'EUR'], [edge.state.attached[0], 'billing_frequency', 'monthly'], [edge.state.attached[0], 'tax', 10], [edge.state.attached[0], 'discount', 5], [edge.state.attached[0], 'sum', 301.26], [edge.state.deal, 'value', 361.23], [edge.state, 'more', true], [edge.state.products[0], 'active_flag', false], [edge.state, 'companyId', 99999]]) {
   const old = target[key]; target[key] = value; await h.cmd('crm.pipedrive.review', edge.selected, h.owner, 409); target[key] = old; assert.deepEqual(await business(), safe)
  }
  await h.cmd('crm.pipedrive.review', { ...edge.selected, contactId: '99999' }, h.owner, 409)
  const memberEmail = ['synthetic-platter-12110', 'example.test'].join('@')
  await h.send('/auth/invite', { email: memberEmail, displayName: 'CRM member', role: 'member', returnTo: '/app' }, h.owner)
  const member = await h.signIn(memberEmail), person = (await h.state()).teamPeople.find(r => r.email === memberEmail), beforeCalls = edge.calls.length
  await h.cmd('crm.pipedrive.review', edge.selected, member, 403); await apply(checked, 403, member)
  assert.equal((await h.send('/api/platter/crm/source?id=' + made.id, undefined, member)).status, 403); assert.equal(edge.calls.length, beforeCalls)
  const promote = async () => { const current = (await h.state()).teamPeople.find(r => r.id === person.id); await h.cmd('member.set', { operatorId: person.id, version: current.version, role: 'admin', teams: [] }) }
  const demoteDuring = match => {
   let ran = false
   edge.beforeReply(async req => { if (!ran && req.url.includes(match)) { ran = true; const current = (await h.state()).teamPeople.find(r => r.id === person.id); await h.cmd('member.set', { operatorId: person.id, version: current.version, role: 'sales', teams: [] }) } })
  }
  await promote(); demoteDuring('/persons/'); await h.cmd('crm.pipedrive.review', { dealId: '12102' }, member, 409); edge.beforeReply(undefined)
  await promote(); const adminReview = await review(member); demoteDuring('/products/12107'); await apply(adminReview, 409, member); edge.beforeReply(undefined)
  assert.deepEqual(await business(), safe, 'authority loss during reads or apply changes nothing')
  const disconnected = await review(); let revoked = false
  edge.beforeReply(async req => { if (!revoked && req.url.includes('/products/12107')) { revoked = true; await h.cmd('provider.disconnect', { provider: 'pipedrive', version: 1 }) } })
  await apply(disconnected, 409); edge.beforeReply(undefined); assert.deepEqual(await business(), safe)
  await h.cmd('provider.connect', { provider: 'pipedrive', version: 2, token: pipedriveToken, tenantId: '12101', consent: true })
  const afterReconnect = edge.calls.length; await apply(disconnected, 409); assert.equal(edge.calls.length, afterReconnect)
  const parallel = await review(), results = await Promise.all([1, 2].map(() => h.send('/api/platter/command', { name: 'crm.pipedrive.apply', input: { id: parallel.id, digest: parallel.digest, consent: true } }, h.owner)))
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); assert.equal((await h.state()).proposals.length, 2)
  const altEmail = ['synthetic-platter-12111', 'example.test'].join('@'); edge.state.person.email[0].value = altEmail
  const erased = await h.cmd('client.save', { name: 'Synthetic Pipedrive organization', email: altEmail, variableFields: { contactName: 'Taylor Reed', firstName: 'Taylor', lastName: 'Reed', title: 'Director', address: '10 Synthetic Street, Austin' } })
  const eraseReview = await review(); await h.cmd('client.erase', { id: erased.id, confirmName: 'Synthetic Pipedrive organization' })
  const erasedState = await business(); await apply(eraseReview, 409); assert.deepEqual(await business(), erasedState, 'erasure invalidates a retained capture before replay')
  assert.equal((await h.db.prepare("SELECT COUNT(*) AS n FROM p_crm_draft_reviews WHERE json_extract(source_json,'$.contact.email')=?").bind(altEmail).first()).n, 0)
  const expired = await review(); await (await h.mf.getWorker()).scheduled({ scheduledTime: new Date(Date.now() + 901000), cron: '*/15 * * * *' }); await apply(expired, 409)
  assert.ok(edge.calls.some(r => r.path === '/v1/products/12107')); assert.ok(edge.calls.some(r => r.path === '/v1/deals/12102/products'))
 } finally { await h.close() }
}

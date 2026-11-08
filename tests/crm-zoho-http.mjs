import assert from 'node:assert/strict'
import { harness } from './harness.mjs'

export const zohoToken = 'synthetic-platter-12400'
export function zohoFixture() {
 const state = {
  organizationId: '12401',
  deal: { id: '12402', Deal_Name: 'Synthetic Zoho engagement', Description: 'Deliver the reviewed Zoho campaign.', Account_Name: { id: '12403' }, Contact_Name: { id: '12404' }, Amount: 361.22, Currency: 'USD', Modified_Time: '2030-01-01T00:00:00Z' },
  account: { id: '12403', Account_Name: 'Synthetic Zoho account', Billing_Street: '10 Synthetic Street', Modified_Time: '2030-01-01T00:00:00Z' },
  contact: { id: '12404', Full_Name: 'Taylor Reed', First_Name: 'Taylor', Last_Name: 'Reed', Title: 'Director', Account_Name: { id: '12403' }, Email: ['synthetic-platter-12404', 'example.test'].join('@'), Modified_Time: '2030-01-01T00:00:00Z' },
  quote: { id: '12405', Deal_Name: { id: '12402' }, Account_Name: { id: '12403' }, Contact_Name: { id: '12404' }, Currency: 'USD', Discount: 0, Tax: 0, Adjustment: 0, Sub_Total: 361.22, Grand_Total: 361.22, Modified_Time: '2030-01-01T00:00:00Z', Product_Details: [
   { id: '12406', product: { id: '12408' }, product_description: 'Reviewed strategy work', quantity: 2.5, list_price: 120.5, total: 301.25, net_total: 301.25, Discount: 0, Tax: 0, line_tax: [] },
   { id: '12407', product: { id: '12409' }, product_description: 'Reviewed usage licence', quantity: 3, list_price: 19.99, total: 59.97, net_total: 59.97, Discount: 0, Tax: 0, line_tax: [] },
  ] },
  products: [{ id: '12408', Product_Name: 'Campaign strategy', Product_Code: 'synthetic-platter-12408', Product_Active: true }, { id: '12409', Product_Name: 'Asset licence', Product_Code: 'synthetic-platter-12409', Product_Active: true }],
  userStatus: 'active',
 }
 const calls = []
 let hook
 const request = async req => {
  const url = new URL(req.url)
  assert.equal(url.hostname, 'www.zohoapis.com'); assert.equal(req.method, 'GET')
  assert.equal(req.headers.get('authorization'), 'Zoho-oauthtoken ' + zohoToken)
  calls.push(url.pathname + url.search); if (hook) await hook(req)
  if (url.pathname === '/crm/v8/org') return Response.json({ org: [{ id: state.organizationId }] })
  if (url.pathname === '/crm/v8/users') { assert.equal(url.searchParams.get('type'), 'CurrentUser'); return Response.json({ users: [{ id: '12410', status: state.userStatus }] }) }
  const rows = { Deals: state.deal, Accounts: state.account, Contacts: state.contact, Quotes: state.quote }
  const [, , , module, id] = url.pathname.split('/')
  const row = module === 'Products' ? state.products.find(p => p.id === id) : rows[module]
  return row?.id === id ? Response.json({ data: [structuredClone(row)] }) : new Response(null, { status: 404 })
 }
 return { state, calls, request, selected: { dealId: '12402', companyId: '12403', contactId: '12404', quoteId: '12405' }, beforeReply(fn) { hook = fn } }
}
export const connectZoho = h => h.cmd('provider.connect', { provider: 'zoho', version: 0, token: zohoToken, tenantId: '12401', consent: true })
export async function zohoHttpJourney(verified) {
 const edge = zohoFixture(), h = await harness({ outboundService: edge.request })
 try {
  const records = async () => {
   const rows = {}
   for (const table of ['p_clients', 'p_proposals', 'p_revisions', 'p_crm_draft_sources', 'p_approvals', 'p_acceptances', 'p_invoices']) rows[table] = (await h.db.prepare('SELECT * FROM ' + table + ' ORDER BY rowid').all()).results
   return rows
  }
  const review = (cookie = h.owner) => h.cmd('crm.zoho.review', edge.selected, cookie)
  const apply = (r, status = 200, cookie = h.owner, extra = {}) => h.cmd('crm.zoho.apply', { id: r.id, digest: r.digest, consent: true, ...extra }, cookie, status)
  await h.cmd('provider.connect', { provider: 'zoho', version: 0, token: zohoToken, tenantId: '99999', consent: true }, h.owner, 409)
  assert.deepEqual((await h.state()).connections, [])
  const calls = edge.calls.length
  await h.cmd('provider.connect', { provider: 'zoho', version: 0, token: zohoToken, tenantId: '12401', consent: false }, h.owner, 400); assert.equal(edge.calls.length, calls)
  await connectZoho(h)
  assert.ok(!(await h.db.prepare("SELECT sealed FROM p_connection_secrets WHERE connection_id='workspace:zoho'").first()).sealed.includes(zohoToken))
  assert.ok(!JSON.stringify(await h.state()).includes(zohoToken))
  const baseline = await records(), choices = await h.cmd('crm.zoho.review', { dealId: '12402', quoteId: '12405' })
  assert.equal(choices.id, undefined); assert.ok(choices.held); assert.equal(choices.quoteId, '12405'); assert.deepEqual(await records(), baseline)
  const checked = await review()
  assert.equal(checked.content.options[0].cents, 36122)
  assert.deepEqual(checked.content.options[0].tables[0].lines.map(r => [r.name, r.quantity, r.unitPrice, r.lineTotalCents]), [['Campaign strategy', '2.5', '120.50', 30125], ['Asset licence', '3', '19.99', 5997]])
  await apply(checked, 400, h.owner, { consent: false }); await apply(checked, 409, h.owner, { digest: 'synthetic-platter-changed' })
  await h.cmd('crm.pipedrive.apply', { id: checked.id, digest: checked.digest, consent: true }, h.owner, 409)
  for (const [target, key, value] of [[edge.state.deal, 'Deal_Name', 'Changed'], [edge.state.contact, 'Title', 'Changed'], [edge.state.quote, 'Modified_Time', '2030-01-02T00:00:00Z']]) {
   const old = target[key]; target[key] = value; await apply(checked, 409); target[key] = old; assert.deepEqual(await records(), baseline)
  }
  const made = await apply(checked), row = async () => (await h.state()).proposals.find(p => p.id === made.id)
  let p = await row(); assert.equal(p.status, 'draft'); assert.equal(p.collection.enabled, false); assert.equal(p.approved_by, null); assert.deepEqual(p.recipientPlan ?? [], [])
  assert.equal(p.clientName, 'Synthetic Zoho account'); assert.equal(p.clientEmail, ['synthetic-platter-12404', 'example.test'].join('@'))
  const source = (await h.send('/api/platter/crm/source?id=' + made.id, undefined, h.owner)).value
  assert.deepEqual([source.provider, source.account_id, source.deal_id, source.source.quoteId, source.company_id, source.contact_id], ['zoho', '12401', '12402', '12405', '12403', '12404'])
  assert.deepEqual(source.source.lines.map(r => [r.id, r.productId, r.quantity, r.unitPrice]), [['12406', '12408', '2.5', '120.5'], ['12407', '12409', '3', '19.99']])
  assert.ok(!JSON.stringify(source).includes(zohoToken))
  await apply(checked, 409); await h.cmd('proposal.send', { id: made.id, version: 1 }, h.owner, 409)
  await h.cmd('proposal.approve', { id: made.id, version: 1, revision: 1 })
  const path = new URL((await h.cmd('proposal.send', { id: made.id, version: 2 })).shareUrl).pathname, cookie = await verified(h, path)
  const sent = (await h.send(path + '/data.json', undefined, cookie)).value
  edge.state.deal.Deal_Name = 'Later Zoho title'; edge.state.quote.Product_Details[0].list_price = 999
  assert.deepEqual((await h.send(path + '/data.json', undefined, cookie)).value, sent)
  assert.equal((await h.send(path + '/action?name=accept', { name: 'Taylor Reed', optionId: 'one', consent: true }, cookie)).status, 200)
  assert.equal((await row()).acceptance.totalCents, 36122)
  edge.state.deal.Deal_Name = 'Synthetic Zoho engagement'; edge.state.quote.Product_Details[0].list_price = 120.5
  const safe = await records(), line = edge.state.quote.Product_Details[0]
  for (const [target, key, value] of [[edge.state, 'organizationId', '99999'], [edge.state, 'userStatus', 'inactive'], [edge.state.deal, 'Currency', 'EUR'], [edge.state.quote, 'Currency', 'EUR'], [edge.state.quote, 'Deal_Name', { id: '99999' }], [edge.state.quote, 'Contact_Name', { id: '99999' }], [edge.state.contact, 'Account_Name', { id: '99999' }], [edge.state.contact, 'Email', null], [line, 'quantity', null], [line, 'list_price', 1.001], [line, 'Tax', 1], [line, 'Discount', 1], [line, 'line_tax', [{ value: 1 }]], [line, 'total', 301.26], [edge.state.products[0], 'Product_Active', false], [edge.state.products[0], 'Billing_Frequency', 'monthly'], [edge.state.quote, 'Grand_Total', 361.23], [edge.state.deal, 'Amount', 361.23]]) {
   const old = target[key]; target[key] = value; await h.cmd('crm.zoho.review', edge.selected, h.owner, key === 'Email' ? 400 : 409); target[key] = old; assert.deepEqual(await records(), safe)
  }
  const memberEmail = ['synthetic-platter-12411', 'example.test'].join('@')
  await h.send('/auth/invite', { email: memberEmail, displayName: 'Zoho member', role: 'member', returnTo: '/app' }, h.owner)
  const member = await h.signIn(memberEmail), person = (await h.state()).teamPeople.find(p => p.email === memberEmail), noCalls = edge.calls.length
  await h.cmd('crm.zoho.review', edge.selected, member, 403); await apply(checked, 403, member)
  assert.equal((await h.send('/api/platter/crm/source?id=' + made.id, undefined, member)).status, 403); assert.equal(edge.calls.length, noCalls)
  await h.cmd('member.set', { operatorId: person.id, version: 0, role: 'admin', teams: [] })
  const admin = await review(member); let demoted = false
  edge.beforeReply(async req => { if (!demoted && req.url.includes('/Products/')) { demoted = true; await h.cmd('member.set', { operatorId: person.id, version: 1, role: 'sales', teams: [] }) } })
  await apply(admin, 409, member); edge.beforeReply(undefined); assert.deepEqual(await records(), safe)
  const revoked = await review(); await h.cmd('provider.disconnect', { provider: 'zoho', version: 1 }); const stopped = edge.calls.length
  await apply(revoked, 409); assert.equal(edge.calls.length, stopped)
  await h.cmd('provider.connect', { provider: 'zoho', version: 2, token: zohoToken, tenantId: '12401', consent: true }); await apply(revoked, 409)
  const parallel = await review(), results = await Promise.all([1, 2].map(() => h.send('/api/platter/command', { name: 'crm.zoho.apply', input: { id: parallel.id, digest: parallel.digest, consent: true } }, h.owner)))
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); assert.equal((await h.state()).proposals.length, 2)
  const alt = ['synthetic-platter-12412', 'example.test'].join('@'); edge.state.contact.Email = alt
  const erased = await h.cmd('client.save', { name: 'Synthetic Zoho account', email: alt, variableFields: { contactName: 'Taylor Reed', firstName: 'Taylor', lastName: 'Reed', title: 'Director', address: '10 Synthetic Street' } })
  const capture = await review(); await h.cmd('client.erase', { id: erased.id, confirmName: 'Synthetic Zoho account' }); const afterErase = await records()
  await apply(capture, 409); assert.deepEqual(await records(), afterErase)
 } finally { await h.close() }
}

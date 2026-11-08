import assert from 'node:assert/strict'

export function hubspotFixture() {
 const contactEmail = ['synthetic-platter-4601', 'example.test'].join('@')
 const state = {
  deal: { id: 'synthetic-platter-4600', updatedAt: '2030-01-01T00:00:00Z', properties: { dealname: 'Synthetic launch engagement', description: 'Deliver the reviewed campaign assets.', amount: '361.22', deal_currency_code: 'USD' }, associations: { companies: { results: [{ id: 'synthetic-platter-4602' }, { id: 'synthetic-platter-4603' }] }, contacts: { results: [{ id: 'synthetic-platter-4601' }, { id: 'synthetic-platter-4604' }] }, line_items: { results: [{ id: 'synthetic-platter-4605' }, { id: 'synthetic-platter-4606' }] } } },
  companies: [{ id: 'synthetic-platter-4602', properties: { name: 'Synthetic reviewed company', address: '10 Synthetic Street', city: 'Austin' } }, { id: 'synthetic-platter-4603', properties: { name: 'Synthetic alternate company' } }],
  contacts: [{ id: 'synthetic-platter-4601', properties: { firstname: 'Taylor', lastname: 'Reed', jobtitle: 'Director', email: contactEmail } }, { id: 'synthetic-platter-4604', properties: { firstname: 'Casey', lastname: 'Lane', email: ['synthetic-platter-4604', 'example.test'].join('@') } }],
  line_items: [{ id: 'synthetic-platter-4605', properties: { name: 'Campaign strategy', description: 'Reviewed strategic work', quantity: '2.5', price: '120.50', amount: '301.25' } }, { id: 'synthetic-platter-4606', properties: { name: 'Asset licence', description: 'Reviewed usage licence', quantity: '3', price: '19.99', amount: '59.97' } }],
 }
 const calls = []
 let beforeReply
 const request = async req => {
  const url = new URL(req.url)
  assert.equal(url.hostname, 'api.hubapi.com')
  assert.equal(req.method, 'GET', 'this floor never writes back to HubSpot')
  assert.equal(req.headers.get('authorization'), 'Bearer synthetic-platter-4607')
  calls.push(url.pathname)
  if (beforeReply) await beforeReply(req)
  if (url.pathname === '/account-info/v3/details') return Response.json({ portalId: 'synthetic-platter-portal' })
  const match = url.pathname.match(/^\/crm\/v3\/objects\/(deals|companies|contacts|line_items)\/([^/]+)$/)
  const row = match ? match[1] === 'deals' ? state.deal.id === match[2] ? state.deal : null : state[match[1]].find(row => row.id === match[2]) : null
  return row ? Response.json(structuredClone(row)) : new Response(null, { status: 404 })
 }
 return { state, calls, request, beforeReply(fn) { beforeReply = fn }, selected: { dealId: state.deal.id, companyId: state.companies[0].id, contactId: state.contacts[0].id } }
}

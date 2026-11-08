import assert from 'node:assert/strict'
import { pipedriveFixture, pipedriveToken } from './crm-pipedrive-http.mjs'
import { zohoFixture, zohoToken } from './crm-zoho-http.mjs'

export function providerSyncFixture(provider) {
 const base = provider === 'pipedrive' ? pipedriveFixture() : zohoFixture(), state = base.state, writes = [], notes = []
 const mapping = provider === 'pipedrive' ? { statusProperty: 'a'.repeat(40), linkProperty: 'b'.repeat(40), pipelineId: '12420', wonStage: '12421' } : { statusProperty: 'Platter_Status', linkProperty: 'Platter_Link', wonStage: 'Closed Won' }
 let hook, lose = false, mismatch = false
 const metadata = provider === 'pipedrive' ? { success: true, data: [mapping.statusProperty, mapping.linkProperty].map(key => ({ key, field_type: 'varchar', edit_flag: true })) } : { fields: [{ api_name: 'Platter_Status', custom_field: true, data_type: 'text', read_only: false, field_read_only: false }, { api_name: 'Platter_Link', custom_field: true, data_type: 'website', read_only: false, field_read_only: false }, { api_name: 'Stage', pick_list_values: [{ actual_value: 'Closed Won', display_value: 'Closed Won' }] }] }
 if (provider === 'pipedrive') Object.assign(state.deal, { pipeline_id: 12420, stage_id: 12419, status: 'open', [mapping.statusProperty]: '', [mapping.linkProperty]: '' })
 else Object.assign(state.deal, { Stage: 'Qualification', Platter_Status: '', Platter_Link: '' })
 const request = async req => {
  const url = new URL(req.url), path = url.pathname
  assert.equal(url.hostname, provider === 'pipedrive' ? 'api.pipedrive.com' : 'www.zohoapis.com')
  assert.equal(req.headers.get('authorization'), (provider === 'pipedrive' ? 'Bearer ' + pipedriveToken : 'Zoho-oauthtoken ' + zohoToken))
  if (hook) await hook(req)
  if (req.method === 'GET') {
   if (path === '/v1/dealFields' || path === '/crm/v8/settings/fields') return Response.json(structuredClone(metadata))
   if (path === '/v1/stages/12421') return Response.json({ success: true, data: { id: 12421, pipeline_id: 12420, active_flag: true, name: 'Closed won' } })
   return base.request(req)
  }
  const body = await req.json(); writes.push({ path, method: req.method, body })
  if (provider === 'pipedrive') {
   if (path === '/v1/notes') {
    assert.equal(req.method, 'POST'); assert.equal(body.deal_id, 12102)
    const note = { id: 12500 + notes.length, ...body }; notes.push(note)
    if (lose) { lose = false; throw Error('Synthetic lost note response') }
    return Response.json({ success: true, data: note })
   }
   assert.equal(req.method, 'PUT')
   if (path === '/v1/deals/12102') { Object.assign(state.deal, body); return Response.json({ success: true, data: structuredClone(state.deal) }) }
   const row = state.attached.find(r => String(r.id) === path.split('/').at(-1)); assert.ok(row)
   Object.assign(row, body); row.sum = Math.round(row.quantity * row.item_price * 100) / 100
   const receipt = structuredClone(row); if (mismatch) { mismatch = false; receipt.sum++ }
   return Response.json({ success: true, data: receipt })
  }
  if (path.endsWith('/Notes')) {
   assert.equal(req.method, 'POST'); assert.equal(path, '/crm/v8/Deals/12402/Notes')
   const note = { id: String(12500 + notes.length), ...body.data[0] }; notes.push(note)
   if (lose) { lose = false; throw Error('Synthetic lost note response') }
   return Response.json({ data: [{ status: 'success', code: 'SUCCESS', details: { id: note.id } }] })
  }
  assert.equal(req.method, 'PUT'); assert.deepEqual(body.trigger, [])
  const update = body.data[0]
  if (path === '/crm/v8/Deals/12402') Object.assign(state.deal, update)
  else {
   assert.equal(path, '/crm/v8/Quotes/12405'); assert.equal(update.id, '12405')
   for (const line of update.Product_Details) { const row = state.quote.Product_Details.find(r => r.id === line.id); assert.ok(row); Object.assign(row, line); row.total = Math.round(row.quantity * row.list_price * 100) / 100; row.net_total = row.total }
   state.quote.Sub_Total = state.quote.Grand_Total = state.quote.Product_Details.reduce((sum, r) => sum + r.total, 0)
   if (mismatch) { mismatch = false; state.quote.Grand_Total++ }
  }
  return Response.json({ data: [{ status: 'success', code: 'SUCCESS', details: { id: update.id } }] })
 }
 return { ...base, request, writes, notes, metadata, mapping, beforeReply(fn) { hook = fn }, loseNextNote() { lose = true }, mismatchNextWrite() { mismatch = true } }
}

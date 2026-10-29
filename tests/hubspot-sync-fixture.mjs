import assert from 'node:assert/strict'
import { hubspotFixture } from './hubspot-fixture.mjs'

export const syncMapping = { statusProperty: 'synthetic_status', linkProperty: 'synthetic_link', pipelineId: 'synthetic-platter-pipeline', wonStage: 'synthetic-platter-won', lostStage: 'synthetic-platter-lost' }
export function hubspotSyncFixture() {
 const edge = hubspotFixture(), writes = [], notes = [], state = edge.state
 Object.assign(state.deal.properties, { pipeline: syncMapping.pipelineId, dealstage: 'synthetic-platter-open', synthetic_status: '', synthetic_link: '' })
 const metadata = { synthetic_status: { name: 'synthetic_status', type: 'enumeration', options: ['sent', 'viewed', 'signed', 'paid', 'declined', 'lost', 'won', 'withdrawn'].map(value => ({ value })), modificationMetadata: { readOnlyDefinition: true, readOnlyValue: false } }, synthetic_link: { name: 'synthetic_link', type: 'string', modificationMetadata: { readOnlyValue: false } } }
 let hook, loseResponse = false
 const request = async req => {
  const url = new URL(req.url)
  assert.equal(url.hostname, 'api.hubapi.com'); assert.equal(req.headers.get('authorization'), 'Bearer synthetic-platter-4607')
  if (hook) await hook(req)
  if (req.method === 'GET') {
   const property = url.pathname.match(/^\/crm\/v3\/properties\/deals\/([^/]+)$/)
   if (property) return metadata[property[1]] ? Response.json(structuredClone(metadata[property[1]])) : new Response(null, { status: 404 })
   if (url.pathname === '/crm/v3/pipelines/deals') return Response.json({ results: [{ id: syncMapping.pipelineId, stages: [{ id: syncMapping.wonStage, metadata: { isClosed: 'true', probability: '1.0' } }, { id: syncMapping.lostStage, metadata: { isClosed: 'true', probability: '0.0' } }] }] })
   return edge.request(req)
  }
  const payload = await req.json(); writes.push({ method: req.method, path: url.pathname, body: structuredClone(payload) })
  if (req.method === 'PATCH') {
   const match = url.pathname.match(/^\/crm\/v3\/objects\/(deals|line_items)\/([^/]+)$/)
   assert.ok(match); const row = match[1] === 'deals' ? state.deal : state.line_items.find(row => row.id === match[2]); assert.equal(row.id, match[2])
   Object.assign(row.properties, payload.properties)
   if (match[1] === 'line_items') row.properties.amount = (Math.round(Number(row.properties.quantity) * Number(row.properties.price) * 100) / 100).toFixed(2)
   return Response.json(structuredClone(row))
  }
  assert.equal(req.method, 'POST'); assert.equal(url.pathname, '/crm/v3/objects/notes')
  assert.deepEqual(payload.associations, [{ to: { id: state.deal.id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] }])
  const row = { id: 'synthetic-platter-note-' + (notes.length + 1), ...payload }; notes.push(row)
  if (loseResponse) { loseResponse = false; return new Response(null, { status: 503 }) }
  return Response.json(row, { status: 201 })
 }
 return { ...edge, request, writes, notes, metadata, beforeReply(fn) { hook = fn }, loseNextNoteResponse() { loseResponse = true } }
}

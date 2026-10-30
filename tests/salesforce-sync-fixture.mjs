import assert from 'node:assert/strict'
import { salesforceFixture } from './provider-network.mjs'

export const salesforceMapping = { linkProperty: 'Synthetic_Proposal__c', wonStage: 'Closed Won', lostStage: 'Closed Lost' }
export function salesforceSyncFixture() {
 const edge = salesforceFixture(), state = edge.state, writes = [], activities = []
 Object.assign(state.opportunity, { StageName: 'Prospecting', Synthetic_Proposal__c: '' })
 const f = (name, type, extra = {}) => ({ name, type, updateable: true, createable: true, calculated: false, length: 32000, ...extra })
 const metadata = {
  Opportunity: { updateable: true, fields: [f('Amount', 'currency'), f('StageName', 'picklist', { picklistValues: ['Prospecting', 'Closed Won', 'Closed Lost'].map(value => ({ value, active: true })) }), f('Synthetic_Proposal__c', 'url', { custom: true })] },
  OpportunityLineItem: { updateable: true, fields: [f('Quantity', 'double'), f('UnitPrice', 'currency'), f('Description', 'textarea')] },
  Task: { createable: true, fields: [f('Subject', 'string'), f('WhatId', 'reference', { referenceTo: ['Opportunity'] }), f('Description', 'textarea'), f('ActivityDate', 'date'), f('Status', 'picklist', { picklistValues: [{ value: 'Completed', active: true }] })] },
 }
 let hook, loseResponse = false, wrongReadback = false
 const request = async req => {
  const url = new URL(req.url), prefix = '/services/data/v61.0/'
  if (hook) await hook(req)
  if (url.pathname === '/services/oauth2/userinfo') return edge.request(req)
  assert.equal(url.hostname, 'synthetic-platter.salesforce.com')
  assert.equal(req.headers.get('authorization'), 'Bearer synthetic-platter-4707')
  if (req.method === 'GET') {
   const describe = url.pathname.match(/\/sobjects\/(Opportunity|OpportunityLineItem|Task)\/describe$/)
   if (describe) return Response.json(structuredClone(metadata[describe[1]]))
   if (url.searchParams.get('q')?.includes(' FROM OpportunityStage ')) return Response.json({ done: true, records: ['Closed Won', 'Closed Lost'].map((ApiName, i) => ({ ApiName, IsActive: true, IsClosed: true, IsWon: i === 0 })) })
   const record = url.pathname.match(/\/sobjects\/(OpportunityLineItem|Task)\/([^/]+)$/)
   if (record) {
    const row = (record[1] === 'Task' ? activities : state.lines).find(r => r.Id === record[2])
    const copy = row && structuredClone(row)
    if (copy && wrongReadback && record[1] === 'OpportunityLineItem') { copy.TotalPrice = 1; wrongReadback = false }
    return copy ? Response.json(copy) : new Response(null, { status: 404 })
   }
   return edge.request(req)
  }
  const body = await req.json()
  writes.push({ method: req.method, path: url.pathname, body: structuredClone(body) })
  if (req.method === 'PATCH') {
   const match = url.pathname.match(/\/sobjects\/(Opportunity|OpportunityLineItem)\/([^/]+)$/)
   assert.ok(match)
   const row = match[1] === 'Opportunity' ? state.opportunity : state.lines.find(r => r.Id === match[2])
   assert.equal(row.Id, match[2]); Object.assign(row, body)
   if (match[1] === 'OpportunityLineItem') row.TotalPrice = Math.round(row.Quantity * row.UnitPrice * 100) / 100
   return new Response(null, { status: 204 })
  }
  assert.equal(req.method, 'POST'); assert.equal(url.pathname, prefix + 'sobjects/Task')
  assert.equal(body.WhatId, state.opportunity.Id)
  const row = { Id: 'synthetic-platter-activity-' + (activities.length + 1), ...body }; activities.push(row)
  if (loseResponse) { loseResponse = false; return new Response(null, { status: 503 }) }
  return Response.json({ id: row.Id, success: true, errors: [] }, { status: 201 })
 }
 return { ...edge, request, writes, activities, metadata, beforeReply(fn) { hook = fn }, loseNextActivityResponse() { loseResponse = true }, wrongNextReadback() { wrongReadback = true } }
}

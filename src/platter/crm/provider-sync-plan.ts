import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { need, text, hash, snapshot, type Actor } from '../model'
import { administrators, permitted } from '../permissions'
import { canonical } from './hubspot-draft'
import { syncFacts } from './hubspot-sync-plan'
import { readPipedriveDeal } from './pipedrive-draft'
import { readZohoDeal, sourceCents, zohoJson, zohoRecord } from './zoho-draft'

export type CrmProvider = 'pipedrive' | 'zoho'
export type ProviderOperation = { key: string; method: 'PUT' | 'POST'; path: string; body: any; label: string; expected?: any }
const field = (value: unknown) => {
 const id = text(value, 'a writable custom field', 100)
 need(/^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(id), 'Use a custom field API name', 409)
 return id
}
export async function providerProposal(env: Bindings, actor: Actor, id: unknown, provider: CrmProvider) {
 need(administrators.includes(actor.role), 'Only owner and admins review CRM writes', 403)
 const row = await permitted(env.DB, actor, id, 'send')
 need(row.currency === 'USD' && ['sent', 'accepted', 'withdrawn'].includes(row.status), 'Send an approved USD revision before reviewing CRM writes', 409)
 need(!await env.DB.prepare('SELECT 1 FROM p_negotiations WHERE proposal_id=?').bind(row.id).first(), 'Finish the negotiated revision before reviewing CRM writes', 409)
 const source = await env.DB.prepare('SELECT * FROM p_crm_draft_sources WHERE proposal_id=?').bind(row.id).first<any>()
 need(source?.provider === provider, 'Start from a reviewed deal for this provider before synchronizing', 409)
 const { connection, secret } = await providerCredential(env, 'workspace:' + provider)
 need(!connection.broken_at && connection.account_id === source.account_id, 'Reconnect the original provider account', 409)
 return { row, source, connection, secret }
}
export async function providerSyncPlan(env: Bindings, actor: Actor, input: Record<string, unknown>, provider: CrmProvider) {
 const context = await providerProposal(env, actor, input.proposalId, provider), { row, source, connection, secret } = context
 need(row.version === Number(input.version), 'The proposal changed; review again', 409)
 const statusProperty = provider === 'pipedrive' ? String(input.statusProperty ?? '') : field(input.statusProperty), linkProperty = provider === 'pipedrive' ? String(input.linkProperty ?? '') : field(input.linkProperty)
 if (provider === 'pipedrive') need([statusProperty, linkProperty].every(key => /^[a-f0-9]{40}$/.test(key)), 'Use Pipedrive custom field keys', 409)
 need(statusProperty !== linkProperty, 'Choose separate custom status and protected-link fields', 409)
 const facts = await syncFacts(env, row), originalSource = JSON.parse(source.source_json)
 const read = await (provider === 'pipedrive' ? readPipedriveDeal : readZohoDeal)(env, { dealId: source.deal_id, companyId: source.company_id, contactId: source.contact_id, quoteId: originalSource.quoteId })
 const content = facts.accepted ? JSON.parse(facts.accepted.snapshot) : snapshot(row), option = content.options?.length === 1 ? content.options[0] : null
 need(option && option.tables?.length === 1 && !option.discount && !option.tax && !option.recurring && !option.optionalItems?.length, 'CRM writes require one fixed-price table without optional, recurring, tax or discount adjustments', 409)
 const lines = option.tables[0].lines, initial = await env.DB.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(row.id).first<any>()
 const initialLines = JSON.parse(initial.snapshot).options[0].tables[0].lines
 need(lines.length === initialLines.length && lines.length === originalSource.lines.length, 'Added or removed source rows need separate CRM reconciliation', 409)
 const explicit = Array.isArray(input.lineIds) ? input.lineIds : typeof input.lineIds === 'string' && input.lineIds.trim() ? input.lineIds.trim().split(/\s+/) : undefined
 const lineIds: string[] = explicit ?? lines.map((line: any) => {
  const matches = initialLines.map((item: any, index: number) => ({ item, index })).filter(({ item }: any) => item.name === line.name)
  need(matches.length === 1, 'Explicitly map each changed row to its source line id', 409)
  return originalSource.lines[matches[0].index].id
 })
 need(lineIds.length === lines.length && new Set(lineIds).size === lines.length && lineIds.every(id => originalSource.lines.some((line: any) => line.id === id) && read.source!.lines.some((line: any) => line.id === id)), 'Map every row to a different current retained source row', 409)
 need(lines.every((line: any) => !line.recurrence && !line.discountBps && !line.discountFixedCents && !line.groupDiscountBps && !line.groupDiscountFixedCents), 'Recurring or discounted rows need separate preparation', 409)
 need(option.cents === option.tables[0].subtotalCents && (!facts.accepted || facts.accepted.total_cents === option.cents), 'The CRM amount must equal the exact priced rows', 409)
 const link = env.AUTH_ORIGIN + '/app/proposal?id=' + encodeURIComponent(row.id), amount = (option.cents / 100).toFixed(2)
 const operations: ProviderOperation[] = [], mapping: any = { statusProperty, linkProperty, lineIds }
 let metadata: unknown
 if (provider === 'pipedrive') {
  const fields = await providerJson('https://api.pipedrive.com/v1/dealFields', secret.token)
  need(fields.success === true && Array.isArray(fields.data) && !fields.additional_data?.pagination?.more_items_in_collection, 'Pipedrive must confirm the complete field map', 409)
  need([statusProperty, linkProperty].every(key => fields.data.some((f: any) => f.key === key && ['varchar', 'text'].includes(f.field_type) && f.edit_flag === true)), 'Choose writable custom text fields for status and protected link', 409)
  const wonStage = String(input.wonStage ?? ''), pipelineId = String(input.pipelineId ?? '')
  need(/^[1-9]\d{0,14}$/.test(wonStage) && /^[1-9]\d{0,14}$/.test(pipelineId), 'Choose the Closed won stage and pipeline ids', 409)
  const stage = await providerJson('https://api.pipedrive.com/v1/stages/' + wonStage, secret.token)
  const deal = await providerJson('https://api.pipedrive.com/v1/deals/' + source.deal_id, secret.token)
  need(stage.success === true && String(stage.data?.id) === wonStage && String(stage.data.pipeline_id) === pipelineId && stage.data.active_flag === true && stage.data.name.toLowerCase() === 'closed won', 'Pipedrive must confirm the selected Closed won stage', 409)
  need(deal.success === true && String(deal.data?.pipeline_id) === pipelineId, 'The deal no longer belongs to the selected pipeline', 409)
  for (const [index, line] of lines.entries()) {
   const remote = read.source!.lines.find((item: any) => item.id === lineIds[index])!
   need(remote.name === line.name && (remote.description ?? '') === (line.description ?? ''), 'Product name or description changes need separate provider preparation', 409)
   const body = { item_price: Number(line.unitPrice), quantity: Number(line.quantity), discount: 0, tax: 0, enabled_flag: true }
   operations.push({ key: '', method: 'PUT', path: 'deals/' + source.deal_id + '/products/' + remote.id, label: 'Priced row ' + remote.id, body, expected: { id: remote.id, product_id: remote.productId, item_price: body.item_price, quantity: body.quantity, sum: line.lineTotalCents / 100 } })
  }
  const body = { value: Number(amount), [statusProperty]: facts.status, [linkProperty]: link, ...(['signed', 'paid', 'won'].includes(facts.status) ? { stage_id: Number(wonStage), status: 'won' } : {}) }
  operations.push({ key: '', method: 'PUT', path: 'deals/' + source.deal_id, label: 'Deal amount, status, protected link and stage', body, expected: { id: source.deal_id, ...body } })
  for (const event of facts.events) operations.push({ key: 'event:' + row.id + ':' + row.revision + ':' + event.kind, method: 'POST', path: 'notes', label: event.kind + ' timeline note', body: { deal_id: Number(source.deal_id), content: 'Platter proposal ' + row.id + ', revision ' + row.revision + ': ' + event.kind + '. ' + link } })
  mapping.wonStage = wonStage; mapping.pipelineId = pipelineId; metadata = { fields, stage, deal }
 } else {
  const fields = await zohoJson('settings/fields?module=Deals', secret.token)
  need(Array.isArray(fields.fields) && !fields.info?.more_records, 'Zoho must confirm the complete deal field map', 409)
  need([statusProperty, linkProperty].every(key => fields.fields.some((f: any) => f.api_name === key && f.custom_field === true && ['text', 'textarea', 'website'].includes(f.data_type) && f.read_only === false && f.field_read_only === false)), 'Choose writable custom text fields for status and protected link', 409)
  const wonStage = text(input.wonStage, 'the Closed won stage', 100), stage = fields.fields.find((f: any) => f.api_name === 'Stage')
  need(stage && stage.pick_list_values?.some((value: any) => value.actual_value === wonStage && value.display_value.toLowerCase() === 'closed won'), 'Zoho must confirm the selected Closed won stage', 409)
  const deal = await zohoRecord('Deals', source.deal_id, secret.token), quoteId = originalSource.quoteId
  const details = lines.map((line: any, index: number) => {
   const remote = read.source!.lines.find((item: any) => item.id === lineIds[index])!
   need(remote.name === line.name, 'Product name changes need separate provider preparation', 409)
   return { id: remote.id, product: { id: remote.productId }, quantity: Number(line.quantity), list_price: Number(line.unitPrice), product_description: line.description ?? '', Discount: 0, line_tax: [] }
  })
  operations.push({ key: '', method: 'PUT', path: 'Quotes/' + quoteId, label: 'Quote product quantities and unit prices', body: { data: [{ id: quoteId, Product_Details: details }], trigger: [] }, expected: { module: 'Quotes', id: quoteId, lines: details, totalCents: option.cents } })
  const update = { id: source.deal_id, Amount: Number(amount), [statusProperty]: facts.status, [linkProperty]: link, ...(['signed', 'paid', 'won'].includes(facts.status) ? { Stage: wonStage } : {}) }
  operations.push({ key: '', method: 'PUT', path: 'Deals/' + source.deal_id, label: 'Deal amount, status, protected link and stage', body: { data: [update], trigger: [] }, expected: { module: 'Deals', id: source.deal_id, fields: update } })
  for (const event of facts.events) operations.push({ key: 'event:' + row.id + ':' + row.revision + ':' + event.kind, method: 'POST', path: 'Deals/' + source.deal_id + '/Notes', label: event.kind + ' timeline note', body: { data: [{ Note_Title: 'Platter ' + event.kind, Note_Content: 'Platter proposal ' + row.id + ', revision ' + row.revision + ': ' + event.kind + '. ' + link }] } })
  mapping.wonStage = wonStage; metadata = { fields, deal }
 }
 const remote = canonical({ source: read.source, metadata })
 for (const operation of operations) if (!operation.key) operation.key = 'write:' + row.id + ':' + row.revision + ':' + await hash(remote + canonical(operation))
 return { ...context, remote, plan: { provider, proposalId: row.id, revision: row.revision, version: row.version, accountId: connection.account_id, dealId: source.deal_id, mapping, status: facts.status, totalCents: option.cents, operations } }
}
export function sameNumber(actual: unknown, expected: unknown) {
 return typeof actual !== 'boolean' && actual !== null && actual !== '' && Number.isFinite(Number(actual)) && Number(actual) === Number(expected)
}
export async function performProviderWrite(provider: CrmProvider, operation: ProviderOperation, token: string) {
 if (provider === 'zoho') {
  const response = await zohoJson(operation.path, token, operation.method, operation.body), receipt = response.data
  need(receipt?.length === 1 && receipt[0].status === 'success' && receipt[0].code === 'SUCCESS', 'Zoho did not confirm the write', 409)
  const id = String(receipt[0].details?.id ?? '')
  need(/^[1-9]\d{0,24}$/.test(id), 'Zoho did not identify the written record', 409)
  if (operation.expected) {
   const expected = operation.expected
   need(id === expected.id, 'Zoho wrote another record', 409)
   const actual = await zohoRecord(expected.module, expected.id, token)
   if (expected.fields) need(Object.entries(expected.fields).every(([key, value]) => key === 'Amount' ? sameNumber(actual[key], value) : String(actual[key]) === String(value)), 'Zoho returned different deal values', 409)
   if (expected.lines) need(Array.isArray(actual.Product_Details) && actual.Product_Details.length === expected.lines.length && expected.lines.every((line: any) => {
    const row = actual.Product_Details.find((r: any) => String(r.id) === line.id)
    return row && String(row.product?.id) === line.product.id && sameNumber(row.quantity, line.quantity) && sameNumber(row.list_price, line.list_price) && row.product_description === line.product_description && sourceCents(row.Discount) === 0 && sourceCents(row.Tax) === 0
   }) && sourceCents(actual.Grand_Total) === expected.totalCents, 'Zoho returned different priced rows', 409)
  }
  return id
 }
 const response = await fetch('https://api.pipedrive.com/v1/' + operation.path, { method: operation.method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(operation.body), redirect: 'manual' })
 need(response.ok, 'Pipedrive did not confirm the write', 409)
 const raw = await response.text(); need(raw.length <= 262144, 'Pipedrive response was too large', 409)
 const receipt = JSON.parse(raw)
 need(receipt.success === true && /^[1-9]\d{0,14}$/.test(String(receipt.data?.id ?? '')), 'Pipedrive did not identify the written record', 409)
 if (operation.expected) need(Object.entries(operation.expected).every(([key, value]) => typeof value === 'number' ? sameNumber(receipt.data[key], value) : String(receipt.data[key]) === String(value)), 'Pipedrive returned different values', 409)
 return String(receipt.data.id)
}

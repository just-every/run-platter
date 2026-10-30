import type { Bindings } from '../../auth.server'
import { demoEffect } from '@runeditrun/rer/internal/modules/demo/index.mjs'
import { providerCredential, providerJson, salesforceInstanceOrigin } from '../connections'
import { need, text, hash, snapshot, type Actor } from '../model'
import { administrators, permitted } from '../permissions'
import { canonical } from './hubspot-draft'
import { readOpportunity } from './salesforce-draft'
import { reviewedSyncCommand } from './hubspot-sync'
import { syncFacts, type SyncOperation } from './hubspot-sync-plan'

const identifier = (value: unknown) => { const id = text(value, 'a Salesforce identifier', 100); need(/^[A-Za-z0-9_-]+$/.test(id), 'Use a Salesforce identifier'); return id }
const api = (secret: any) => salesforceInstanceOrigin(secret.instanceOrigin) + '/services/data/v61.0'
async function syncProposal(env: Bindings, actor: Actor, id: unknown) {
 need(administrators.includes(actor.role), 'Only owner and admins review Salesforce writes', 403)
 const row = await permitted(env.DB, actor, id, 'send')
 need(row.currency === 'USD' && ['sent', 'accepted', 'withdrawn'].includes(row.status), 'Send an approved USD revision before reviewing Salesforce writes', 409)
 need(!await env.DB.prepare('SELECT 1 FROM p_negotiations WHERE proposal_id=?').bind(row.id).first(), 'Finish the negotiated revision before reviewing Salesforce writes', 409)
 const source = await env.DB.prepare('SELECT * FROM p_crm_draft_sources WHERE proposal_id=?').bind(row.id).first<any>()
 need(source?.provider === 'salesforce', 'Start from a reviewed Salesforce opportunity before synchronizing', 409)
 const { connection, secret } = await providerCredential(env, 'workspace:salesforce')
 need(!connection.broken_at && connection.account_id === source.account_id && secret.instanceOrigin, 'Reconnect the original Salesforce organization', 409)
 return { row, source, connection, secret }
}
async function buildPlan(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 const { row, source, connection, secret } = await syncProposal(env, actor, input.proposalId)
 need(row.version === Number(input.version), 'The proposal changed; review again', 409)
 const linkProperty = identifier(input.linkProperty), wonStage = text(input.wonStage, 'the closed won stage', 100), lostStage = text(input.lostStage, 'the closed lost stage', 100)
 need(wonStage !== lostStage, 'Choose distinct closed stages')
 const base = api(secret), facts = await syncFacts(env, row)
 const [opportunityMeta, lineMeta, taskMeta, stages, read] = await Promise.all([
  providerJson(base + '/sobjects/Opportunity/describe', secret.token),
  providerJson(base + '/sobjects/OpportunityLineItem/describe', secret.token),
  providerJson(base + '/sobjects/Task/describe', secret.token),
  providerJson(base + '/query?q=' + encodeURIComponent('SELECT ApiName,IsActive,IsClosed,IsWon FROM OpportunityStage ORDER BY SortOrder'), secret.token),
  readOpportunity(env, { opportunityId: source.deal_id, companyId: source.company_id, contactId: source.contact_id }),
 ])
 const content = facts.accepted ? JSON.parse(facts.accepted.snapshot) : snapshot(row), options = content.options, option = options?.length === 1 ? options[0] : null
 need(option && option.tables?.length === 1 && !option.discount && !option.tax && !option.recurring && !option.optionalItems?.length, 'Salesforce writes require one fixed-price table without optional, recurring, tax or discount adjustments', 409)
 const lines = option.tables[0].lines, originalSource = JSON.parse(source.source_json)
 const original = await env.DB.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(row.id).first<any>()
 const originalLines = JSON.parse(original.snapshot).options[0].tables[0].lines
 need(lines.length === originalLines.length && lines.length === originalSource.lines.length, 'Added or removed products need separate Salesforce reconciliation', 409)
 const explicit = Array.isArray(input.lineIds) ? input.lineIds : typeof input.lineIds === 'string' && input.lineIds.trim() ? input.lineIds.trim().split(/\s+/) : undefined
 const lineIds = explicit ?? lines.map((line: any) => {
  const matches = originalLines.map((o: any, index: number) => ({ o, index })).filter(({ o }: any) => o.name === line.name)
  need(matches.length === 1, 'Explicitly map renamed or ambiguous rows to their retained opportunity product IDs', 409)
  return originalSource.lines[matches[0].index].id
 })
 need(lineIds.length === lines.length && new Set(lineIds).size === lines.length && lineIds.every((id: any) => originalSource.lines.some((s: any) => s.id === id)), 'Map every row to a different retained opportunity product', 409)
 need(lines.every((line: any) => !line.recurrence && !line.discountBps && !line.discountFixedCents && !line.groupDiscountBps && !line.groupDiscountFixedCents), 'Recurring or discounted rows need separate Salesforce preparation', 409)
 need(option.cents === option.tables[0].subtotalCents && (!facts.accepted || facts.accepted.total_cents === option.cents), 'Salesforce amount must equal the exact accepted rows', 409)
 const link = env.AUTH_ORIGIN + '/app/proposal?id=' + encodeURIComponent(row.id)
 const field = (meta: any, name: string, mode: string, types: string[]) => {
  const f = meta.fields?.find((f: any) => f.name === name)
  need(f && f[mode] === true && !f.calculated && types.includes(f.type), 'Salesforce must confirm writable field ' + name, 409)
  return f
 }
 need(opportunityMeta.updateable === true && lineMeta.updateable === true && taskMeta.createable === true, 'Salesforce must permit these object writes', 409)
 need(opportunityMeta.fields?.some((f: any) => f.name === 'Amount' && f.type === 'currency'), 'Salesforce must expose the opportunity amount', 409)
 const stageField = field(opportunityMeta, 'StageName', 'updateable', ['picklist'])
 const linkField = field(opportunityMeta, linkProperty, 'updateable', ['url', 'string'])
 need(linkField.custom === true && linkField.length >= link.length, 'Choose a writable custom field large enough for the protected staff link', 409)
 need(stages.done === true && !stages.nextRecordsUrl && Array.isArray(stages.records), 'Salesforce stage metadata was incomplete', 409)
 for (const [name, won] of [[wonStage, true], [lostStage, false]] as const) need(stages.records.some((s: any) => s.ApiName === name && s.IsActive === true && s.IsClosed === true && s.IsWon === won) && stageField.picklistValues?.some((s: any) => s.value === name && s.active === true), 'Salesforce must confirm the selected closed stages', 409)
 for (const [name, types] of [['Quantity', ['double']], ['UnitPrice', ['currency']], ['Description', ['textarea', 'string']]] as const) field(lineMeta, name, 'updateable', [...types])
 const descriptionLimit = lineMeta.fields.find((f: any) => f.name === 'Description').length
 for (const [name, types] of [['Subject', ['string']], ['WhatId', ['reference']], ['Description', ['textarea']], ['ActivityDate', ['date']], ['Status', ['picklist']]] as const) field(taskMeta, name, 'createable', [...types])
 need(taskMeta.fields.find((f: any) => f.name === 'WhatId').referenceTo?.includes('Opportunity') && taskMeta.fields.find((f: any) => f.name === 'Status').picklistValues?.some((p: any) => p.value === 'Completed' && p.active === true), 'Salesforce must confirm completed opportunity activities', 409)
 const destination = await providerJson(base + '/sobjects/Opportunity/' + source.deal_id + '?fields=Id,StageName,' + linkProperty, secret.token)
 need(destination.Id === source.deal_id, 'Salesforce did not confirm the destination', 409)
 const operations: SyncOperation[] = []
 for (const [index, line] of lines.entries()) {
  const remote = read.source!.lines.find((s: any) => s.id === lineIds[index]), retained = originalSource.lines.find((s: any) => s.id === lineIds[index])
  need(remote && retained && remote.productId === retained.productId && remote.pricebookEntryId === retained.pricebookEntryId && read.source!.pricebook.id === originalSource.pricebook.id, 'The destination product or price book changed; reconcile Salesforce first', 409)
  need((line.description ?? '').length <= descriptionLimit, 'Product description exceeds the Salesforce field limit', 409)
  operations.push({ key: '', method: 'PATCH', path: '/sobjects/OpportunityLineItem/' + remote.id, label: 'Opportunity product ' + remote.id, expectedTotalCents: line.lineTotalCents, body: { Quantity: Number(line.quantity), UnitPrice: Number(line.unitPrice), Description: line.description ?? '' } })
 }
 // Salesforce derives the opportunity amount from its products; confirm that total after the writes.
 const body: Record<string, unknown> = { [linkProperty]: link }
 if (['signed', 'paid', 'won'].includes(facts.status)) body.StageName = wonStage
 if (['declined', 'lost', 'withdrawn'].includes(facts.status)) body.StageName = lostStage
 operations.push({ key: '', method: 'PATCH', path: '/sobjects/Opportunity/' + source.deal_id, label: 'Opportunity total, protected link and stage', expectedAmountCents: option.cents, body })
 for (const event of facts.events) operations.push({ key: 'salesforce:event:' + row.id + ':' + row.revision + ':' + event.kind, method: 'POST', path: '/sobjects/Task', label: event.kind + ' activity', body: { Subject: 'Platter proposal ' + event.kind, WhatId: source.deal_id, Status: 'Completed', ActivityDate: new Date(event.at).toISOString().slice(0, 10), Description: 'Platter proposal ' + row.id + ', revision ' + row.revision + ': ' + event.kind + ' at ' + new Date(event.at).toISOString() + '. ' + link } })
 for (const operation of operations) if (!operation.key) operation.key = 'salesforce:write:' + row.id + ':' + row.revision + ':' + await hash(canonical(operation.body) + operation.path)
 const remote = canonical({ source: read.source, destination, opportunityMeta, lineMeta, taskMeta, stages })
 return { row, source, connection, remote, plan: { proposalId: row.id, revision: row.revision, version: row.version, accountId: connection.account_id, dealId: source.deal_id, mapping: { linkProperty, wonStage, lostStage, lineIds }, status: facts.status, totalCents: option.cents, operations } }
}
async function writeOperation(operation: SyncOperation, secret: any) {
 return demoEffect(async () => {
  const base = api(secret), response = await fetch(base + operation.path, { method: operation.method, headers: { authorization: 'Bearer ' + secret.token, 'content-type': 'application/json' }, body: JSON.stringify(operation.body), redirect: 'manual' })
  need(response.ok, 'Salesforce did not confirm this write', 409)
  let id = operation.path.split('/').at(-1)!
  if (operation.method === 'POST') {
   const raw = await response.text(); need(raw.length <= 262144, 'Salesforce response was too large', 409)
   const receipt = JSON.parse(raw)
   need(receipt.success === true && Array.isArray(receipt.errors) && receipt.errors.length === 0, 'Salesforce did not confirm activity creation', 409)
   id = identifier(receipt.id)
  }
  const fields = ['Id', ...Object.keys(operation.body), ...(operation.expectedTotalCents !== undefined ? ['TotalPrice'] : []), ...(operation.expectedAmountCents !== undefined ? ['Amount'] : [])]
  const path = operation.method === 'POST' ? operation.path + '/' + id : operation.path
  const read = await providerJson(base + path + '?fields=' + fields.join(','), secret.token)
  need(read.Id === id && Object.entries(operation.body).every(([key, value]) => typeof value === 'number' ? Number(read[key]) === value : read[key] === value), 'Salesforce returned different written values', 409)
  const expectedCents = operation.expectedTotalCents ?? operation.expectedAmountCents
  if (expectedCents !== undefined) {
   const total = String((operation.expectedTotalCents !== undefined ? read.TotalPrice : read.Amount) ?? '')
   need(/^\d{1,12}(\.\d{1,2})?$/.test(total), 'Salesforce returned an unsupported product total', 409)
   const [whole, fraction = ''] = total.split('.')
   need(Number(whole) * 100 + Number(fraction.padEnd(2, '0')) === expectedCents, 'Salesforce returned a different product or opportunity total', 409)
  }
  return id
 }, () => operation.path.split('/').at(-1)!)
}
export function salesforceSyncCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 return reviewedSyncCommand(env, actor, name, input, { provider: 'salesforce', prefix: 'crm.salesforce.', buildPlan, proposal: syncProposal, write: writeOperation })
}

import type { Bindings } from '../../auth.server'
import { providerCredential, providerJson } from '../connections'
import { need, text, hash, snapshot, type Actor } from '../model'
import { administrators, permitted } from '../permissions'
import { trackingSettings } from '../tracking'
import { canonical, readDeal } from './hubspot-draft'

const base = 'https://api.hubapi.com/crm/v3'
const identifier = (v: unknown) => { const id = text(v, 'a HubSpot identifier', 100); need(/^[A-Za-z0-9_-]+$/.test(id), 'Use a HubSpot identifier'); return id }
export type SyncOperation = { key: string; method: 'PATCH' | 'POST'; path: string; body: any; label: string; expectedTotalCents?: number }
export async function syncProposal(env: Bindings, actor: Actor, id: unknown) {
 need(administrators.includes(actor.role), 'Only owner and admins review CRM writes', 403)
 const row = await permitted(env.DB, actor, id, 'send')
 need(row.currency === 'USD' && ['sent', 'accepted', 'withdrawn'].includes(row.status), 'Send an approved USD revision before reviewing CRM writes', 409)
 need(!await env.DB.prepare('SELECT 1 FROM p_negotiations WHERE proposal_id=?').bind(row.id).first(), 'Finish the negotiated revision before reviewing CRM writes', 409)
 const source = await env.DB.prepare('SELECT * FROM p_crm_draft_sources WHERE proposal_id=?').bind(row.id).first<any>()
 need(source, 'Start from a reviewed HubSpot deal before synchronizing', 409)
 const { connection, secret } = await providerCredential(env, 'workspace:hubspot')
 need(!connection.broken_at && connection.account_id === source.account_id, 'Reconnect the original HubSpot account', 409)
 return { row, source, connection, secret }
}
export async function syncFacts(env: Bindings, row: any) {
 const db = env.DB, accepted = await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=? AND revision=?').bind(row.id, row.revision).first<any>()
 const events: { kind: string; at: number }[] = []
 const sent = await db.prepare("SELECT MIN(occurred_at) AS at FROM p_webhook_events WHERE proposal_id=? AND revision=? AND type='proposal.sent'").bind(row.id, row.revision).first<any>()
 if (sent?.at) events.push({ kind: 'sent', at: sent.at })
 // A CRM receipt exposes no recipient identity, location or reading detail.
 if ((await trackingSettings(db)).enabled) {
  const view = await db.prepare('SELECT MIN(viewed_at) AS at FROM p_views WHERE proposal_id=? AND revision=? AND verified=1').bind(row.id, row.revision).first<any>()
  if (view?.at) events.push({ kind: 'viewed', at: view.at })
 }
 if (accepted) events.push({ kind: 'signed', at: accepted.accepted_at })
 if (accepted) {
  const payments = (await db.prepare('SELECT id,cents,recorded_at FROM p_payment_records WHERE proposal_id=? AND revision=? AND currency=? ORDER BY recorded_at,id').bind(row.id, row.revision, row.currency).all<any>()).results
  const refunds = await db.prepare("SELECT COALESCE(SUM(r.cents),0) AS cents FROM p_refunds r JOIN p_payment_records p ON p.id=r.payment_id WHERE p.proposal_id=? AND p.revision=? AND r.status!='needs_review'").bind(row.id, row.revision).first<any>()
  if (payments.length && payments.reduce((n, p) => n + p.cents, 0) - (refunds?.cents ?? 0) >= accepted.total_cents) events.push({ kind: 'paid', at: payments.at(-1).recorded_at })
 }
 const terminal = await db.prepare('SELECT kind,occurred_at AS at FROM (SELECT * FROM p_outcomes UNION ALL SELECT * FROM p_outcome_records) WHERE proposal_id=? AND revision=? ORDER BY occurred_at DESC LIMIT 1').bind(row.id, row.revision).first<any>()
 if (terminal) events.push({ kind: terminal.kind, at: terminal.at })
 const status = terminal?.kind ?? (events.some(e => e.kind === 'paid') ? 'paid' : accepted ? 'signed' : events.some(e => e.kind === 'viewed') ? 'viewed' : row.status)
 return { accepted, events, status }
}
export async function buildSyncPlan(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 const { row, source, connection, secret } = await syncProposal(env, actor, input.proposalId)
 need(row.version === Number(input.version), 'The proposal changed; review again', 409)
 const statusProperty = identifier(input.statusProperty), linkProperty = identifier(input.linkProperty)
 need(statusProperty !== linkProperty && !['amount', 'pipeline', 'dealstage', 'dealname'].includes(statusProperty) && !['amount', 'pipeline', 'dealstage', 'dealname'].includes(linkProperty), 'Choose separate custom status and link properties')
 const pipelineId = identifier(input.pipelineId), wonStage = identifier(input.wonStage), lostStage = identifier(input.lostStage)
 need(wonStage !== lostStage, 'Choose distinct closed stages')
 const [statusMeta, linkMeta, pipelines, deal] = await Promise.all([
  providerJson(base + '/properties/deals/' + statusProperty, secret.token), providerJson(base + '/properties/deals/' + linkProperty, secret.token),
  providerJson(base + '/pipelines/deals', secret.token), providerJson(base + '/objects/deals/' + source.deal_id + '?properties=pipeline,dealstage,' + statusProperty + ',' + linkProperty, secret.token),
 ])
 const facts = await syncFacts(env, row)
 need(statusMeta.name === statusProperty && statusMeta.hubspotDefined === false && !statusMeta.archived && statusMeta.type === 'enumeration' && statusMeta.options?.some((o: any) => o.value === facts.status && !o.hidden) && !statusMeta.modificationMetadata?.readOnlyValue && !statusMeta.calculated, 'Choose a writable status property with the current status option', 409)
 need(linkMeta.name === linkProperty && linkMeta.hubspotDefined === false && !linkMeta.archived && linkMeta.type === 'string' && !linkMeta.modificationMetadata?.readOnlyValue && !linkMeta.calculated, 'Choose a writable text property for the protected proposal link', 409)
 const stages = pipelines.results?.find((p: any) => String(p.id) === pipelineId)?.stages ?? []
 const closed = (id: string, probability: number) => stages.some((s: any) => String(s.id) === id && String(s.metadata?.isClosed) === 'true' && Number(s.metadata?.probability) === probability)
 need(closed(wonStage, 1) && closed(lostStage, 0), 'HubSpot must confirm the selected Closed won and Closed lost stages', 409)
 need(String(deal.id) === source.deal_id && !deal.archived && String(deal.properties?.pipeline) === pipelineId, 'The deal no longer belongs to the reviewed pipeline', 409)
 const read = await readDeal(env, { dealId: source.deal_id, companyId: source.company_id, contactId: source.contact_id })
 const content = facts.accepted ? JSON.parse(facts.accepted.snapshot) : snapshot(row)
 const options = content.options, option = options?.length === 1 ? options[0] : null
 need(option && option.tables?.length === 1 && !option.discount && !option.tax && !option.recurring && !(option.optionalItems?.length), 'CRM writes require one fixed-price table without optional, recurring, tax or discount adjustments', 409)
 const original = await env.DB.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(row.id).first<any>()
 const originalLines = JSON.parse(original.snapshot).options[0].tables[0].lines, originalSource = JSON.parse(source.source_json).lines
 const lines = option.tables[0].lines
 need(lines.length === originalLines.length && lines.length === originalSource.length, 'Added or removed source rows need separate CRM reconciliation', 409)
 const explicitIds = Array.isArray(input.lineIds) ? input.lineIds : typeof input.lineIds === 'string' && input.lineIds.trim() ? input.lineIds.trim().split(/\s+/) : undefined
 const lineIds = explicitIds ?? lines.map((line: any) => {
  const matches = originalLines.map((o: any, index: number) => ({ o, index })).filter(({ o }: any) => o.name === line.name)
  need(matches.length === 1, 'Enter one explicit source line ID for each row when names changed or are ambiguous', 409)
  return originalSource[matches[0].index].id
 })
 need(lineIds.length === lines.length && new Set(lineIds).size === lineIds.length && lineIds.every((id: any) => typeof id === 'string' && originalSource.some((s: any) => s.id === id)), 'Explicitly map each row to a different retained source line ID', 409)
 need(lines.every((line: any) => !line.recurrence && !line.discountBps && !line.discountFixedCents && !line.groupDiscountBps && !line.groupDiscountFixedCents), 'Recurring or discounted rows need separate CRM preparation', 409)
 need(option.cents === option.tables[0].subtotalCents && (!facts.accepted || facts.accepted.total_cents === option.cents), 'The CRM amount must equal the exact copied rows', 409)
 const link = env.AUTH_ORIGIN + '/app/proposal?id=' + encodeURIComponent(row.id)
 const acceptedFields=input.acceptedFields===undefined?[]:input.acceptedFields
 need(Array.isArray(acceptedFields)&&acceptedFields.length<=20,'Choose at most twenty accepted field mappings')
 const fieldMapping=acceptedFields.map((entry:any)=>({fieldId:text(entry?.fieldId,'an accepted field id'),property:identifier(entry?.property)}))
 need(new Set(fieldMapping.map(entry=>entry.property)).size===fieldMapping.length&&fieldMapping.every(entry=>![statusProperty,linkProperty,'amount','pipeline','dealstage','dealname'].includes(entry.property)),'Choose distinct custom properties for collected values')
 need(!fieldMapping.length||facts.accepted,'Only accepted values may be sent to the CRM',409)
 const fieldMetadata=[],fieldProperties:Record<string,string>={}
 for(const entry of fieldMapping){
  const value=content.fieldValues?.[entry.fieldId]
  need(typeof value==='string'||typeof value==='boolean','This accepted field has no retained value',409)
  const meta=await providerJson(base+'/properties/deals/'+entry.property,secret.token)
  need(meta.name===entry.property&&meta.hubspotDefined===false&&!meta.archived&&meta.type==='string'&&!meta.modificationMetadata?.readOnlyValue&&!meta.calculated,'Choose a writable custom text property for collected values',409)
  fieldMetadata.push(meta);fieldProperties[entry.property]=String(value)
 }
 const fieldDestination=fieldMapping.length?await providerJson(base+'/objects/deals/'+source.deal_id+'?properties='+fieldMapping.map(entry=>entry.property).join(','),secret.token):undefined
 need(!fieldDestination||fieldDestination.id===source.deal_id&&!fieldDestination.archived,'The collected-field destination changed',409)
 const properties: Record<string, string> = { ...fieldProperties,amount: (option.cents / 100).toFixed(2), [statusProperty]: facts.status, [linkProperty]: link }
 if (facts.status === 'signed' || facts.status === 'paid' || facts.status === 'won') properties.dealstage = wonStage
 if (facts.status === 'declined' || facts.status === 'lost' || facts.status === 'withdrawn') properties.dealstage = lostStage
 const operations: SyncOperation[] = []
 for (const [index, line] of lines.entries()) {
  const id = lineIds[index]
  need(read.source!.lines.some((s: any) => s.id === id), 'A source line is no longer associated with the deal', 409)
  operations.push({ key: '', method: 'PATCH', path: '/objects/line_items/' + id, label: 'Priced row ' + id, expectedTotalCents: line.lineTotalCents, body: { properties: { name: line.name, description: line.description ?? '', quantity: line.quantity, price: line.unitPrice } } })
 }
 operations.push({ key: '', method: 'PATCH', path: '/objects/deals/' + source.deal_id, label: 'Deal amount, status, protected link and stage', body: { properties } })
 for (const event of facts.events) operations.push({ key: 'event:' + row.id + ':' + row.revision + ':' + event.kind, method: 'POST', path: '/objects/notes', label: event.kind + ' timeline note', body: { properties: { hs_timestamp: new Date(event.at).toISOString(), hs_note_body: 'Platter proposal ' + row.id + ', revision ' + row.revision + ': ' + event.kind + '. ' + link }, associations: [{ to: { id: source.deal_id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }] }] } })
 for (const op of operations) if (!op.key) op.key = 'write:' + row.id + ':' + row.revision + ':' + await hash(canonical({ method: op.method, path: op.path, body: op.body }))
 const remote = canonical({ source: read.source, deal, statusMeta, linkMeta, pipelines,...(fieldMapping.length?{fieldMetadata,fieldDestination}:{}) })
 return { row, source, connection, remote, plan: { proposalId: row.id, revision: row.revision, version: row.version, accountId: connection.account_id, dealId: source.deal_id, mapping: { statusProperty, linkProperty, pipelineId, wonStage, lostStage, lineIds,...(fieldMapping.length?{acceptedFields:fieldMapping}:{}) }, status: facts.status, totalCents: option.cents, operations } }
}

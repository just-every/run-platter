import { canonicalJson, sha256, type Json, type SourceRecord } from '../../modules/import-kit/src/d1/index.ts'
import { fail } from './errors'

type ObjectValue = Record<string, unknown>
type File = { name: string; source: string; bytes: Uint8Array }
type Document = { id: string; filename: string; title: string }
type Binding = { key: string; label: string; candidates: { id: string; label: string }[]; selected: string | null; reviewed: boolean }
type Fact = { id: string; kind: string; sourceId: string; fields: Record<string, string>; sourceFields: Record<string, string>; sourceData: ObjectValue;
 sourceHash: string; sourceFile: string; sourceLine: number; bindings: Record<string, string | null>; execution: string; notes: string[] }
const statuses = new Set(['draft', 'live', 'accepting', 'accepted', 'disabled', 'declined'])
const schedules = new Set(['one-off', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'halfYearly', 'yearly', 'twoYearly', 'threeYearly'])
export const qwilrId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value)
export const qwilrObject = (value: unknown): value is ObjectValue => value !== null && typeof value === 'object' && !Array.isArray(value)
const string = (value: unknown): value is string => typeof value === 'string'
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
const optionalObject = (value: unknown) => value === undefined || value === null || qwilrObject(value)
function acceptance(value: unknown): boolean {
 if (value === undefined || value === null) return true
 if (!qwilrObject(value) || !Number.isInteger(value.acceptersTotal) || !Number.isInteger(value.acceptersCount) || !Array.isArray(value.accepters)) return false
 if (!value.accepters.every(a => qwilrObject(a) && ['name', 'email', 'legalEntity', 'acceptedAt'].every(k => string(a[k])) && typeof a.esigned === 'boolean')) return false
 const quote = value.quote
 if (quote === undefined || quote === null) return true
 if (!qwilrObject(quote) || !finite(quote.amount) || !finite(quote.amountExcludingTax) || !Array.isArray(quote.quoteSections)) return false
 return quote.quoteSections.every(section => qwilrObject(section) && typeof section.selected === 'boolean' && optionalObject(section.metadata)
  && Array.isArray(section.lineItems) && section.lineItems.every(item => qwilrObject(item) && optionalObject(item.metadata)
   && (item.type === 'text' || item.type === 'variable' || (item.type === 'fixedCost' && finite(item.unitPrice) && finite(item.quantity)
    && typeof item.selected === 'boolean' && (item.billingSchedule === undefined || (string(item.billingSchedule) && schedules.has(item.billingSchedule)))))))
}
/** Validate the documented response, without claiming that unknown fields are editable content. */
export function qwilrPage(value: unknown, detail = true): value is ObjectValue & { id: string; name: string; status: string } {
 if (!qwilrObject(value) || !qwilrId(value.id) || !string(value.name) || !string(value.status) || !statuses.has(value.status)
  || !Array.isArray(value.tags) || !value.tags.every(string) || !(value.folderId === null || qwilrId(value.folderId))
  || !optionalObject(value.metadata) || !qwilrObject(value.links)) return false
 const links = value.links
 if (!['publicUrl', 'editorUrl', 'pdfUrl'].every(k => string(links[k])) || !(string(links.collaboratorUrl) || (!detail && links.collaboratorUrl === null))) return false
 if (!detail) return string(value.createdAt) && Number.isFinite(Date.parse(value.createdAt)) && (value.ownerId === undefined || qwilrId(value.ownerId))
 return qwilrId(value.ownerId) && qwilrObject(value.expiry) && typeof value.expiry.enabled === 'boolean'
  && optionalObject(value.paymentSettings) && acceptance(value.acceptance) && acceptance(value.previewAcceptance)
}
export function qwilrBlocks(value: unknown): value is (ObjectValue & { id: string; name: string; type: string })[] {
 return Array.isArray(value) && value.length <= 100 && value.every(block => qwilrObject(block) && qwilrId(block.id) && string(block.name) && string(block.type))
}

export function qwilrApiFacts(files: File[], documents: Document[], choices: Record<string, string>, moveinId: string) {
 const facts: Fact[] = [], records: SourceRecord[] = [], issues: string[] = [], unmapped: string[] = [], bindings: Binding[] = [], usedChoices = new Set<string>()
 let proposals = 0, billingSchedules = 0
 const seen = new Map<string, string>()
 const listed=new Map<string,{date:string;sha256:string;file:string}>()
 for(const file of files.filter(file=>/^qwilr-api\/(?:archived-)?pages-\d+\.json$/.test(file.name))) {
  let value:unknown
  try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(file.bytes))}catch{issues.push('Qwilr page list is not valid JSON');continue}
  if(!qwilrObject(value)||!Array.isArray(value.data)||!value.data.every(page=>qwilrPage(page,false))){issues.push('Qwilr page list does not match its documented schema');continue}
  for(const page of value.data as (ObjectValue&{id:string;createdAt:string})[]) {
   const previous=listed.get(page.id)
   if(previous&&previous.date!==page.createdAt)issues.push('Qwilr page has conflicting source creation dates')
   else if(!previous)listed.set(page.id,{date:page.createdAt,sha256:sha256(file.bytes),file:file.source})
  }
 }
 const add = (kind: string, sourceId: string, sourceFields: ObjectValue, file: File, sourceHash: string) => {
  const id = 'qwilr:api-' + (kind === 'proposals' ? 'pages' : 'blocks') + ':' + sourceId
  const prior = seen.get(id)
  if (prior) { if (prior !== sourceHash) issues.push('Qwilr source ID has conflicting response files'); return }
  seen.set(id, sourceHash)
  const fact: Fact = { id, kind, sourceId, fields: { id: sourceId, title: String(sourceFields.name), ...(kind === 'proposals' ? { status: String(sourceFields.status), ...(string(sourceFields.createdAt) ? { date: sourceFields.createdAt } : {}) } : { type: String(sourceFields.type) }) },
   sourceFields: Object.fromEntries(Object.entries(sourceFields).map(([key, value]) => [key, string(value) ? value : canonicalJson(value as Json)])),
   sourceData: sourceFields, sourceHash, sourceFile: file.source, sourceLine: 1, bindings: {}, execution: 'source-evidence-only',
   notes: ['Qwilr does not expose editable page or template bodies through this documented API.', 'Acceptance, prices, schedules and ownership are source evidence; signatures are not validated and no execution or role authority is granted.'] }
  facts.push(fact)
  const summary=kind==='proposals'?listed.get(sourceId):undefined
  if(summary){fact.fields.date??=summary.date;Object.assign(fact,{dateSource:summary})}
  if (kind !== 'proposals') { unmapped.push('Saved block ' + sourceId + ': summary retained; editable content requires rebuilding'); return }
  proposals++
  unmapped.push('Qwilr page '+sourceId+': editable body is unavailable from this API; rebuilding requires source content')
  const accepted = sourceFields.acceptance
  if (qwilrObject(accepted) && qwilrObject(accepted.quote) && Array.isArray(accepted.quote.quoteSections)) {
   for (const section of accepted.quote.quoteSections) if (qwilrObject(section) && Array.isArray(section.lineItems)) {
    billingSchedules += section.lineItems.filter(item => qwilrObject(item) && item.type === 'fixedCost' && string(item.billingSchedule)).length
   }
  }
  const candidates = documents.filter(document => document.title === sourceFields.name
   || document.filename.split('/').at(-1)?.replace(/\.pdf$/i, '') === sourceId)
   .filter((document, index, all) => all.findIndex(other => other.id === document.id) === index)
   .map(document => ({ id: document.id, label: document.filename + ' · ' + document.title }))
  const key = 'binding:' + id + ':document', explicit = Object.hasOwn(choices, key), chosen = choices[key]
  if (explicit) {
   usedChoices.add(key)
   if (chosen !== 'unmapped' && !candidates.some(candidate => candidate.id === chosen)) fail('invalid_export_binding', 409, 'Choose a currently offered original PDF or explicitly retain the page without an original')
  }
  const selected = explicit ? chosen === 'unmapped' ? null : chosen : candidates.length === 1 ? candidates[0].id : null
  fact.bindings.document = selected
  bindings.push({ key, label: 'Qwilr page ' + sourceId + ' · original PDF', candidates, selected, reviewed: explicit || candidates.length === 1 })
 }
 for (const file of files) {
  const name = file.name.replace(/^\/+/, ''), detail = name.match(/^qwilr-api\/page-([A-Za-z0-9_-]{1,100})\.json$/)
  if (!detail && name !== 'qwilr-api/saved-blocks.json') {
   if (!/^qwilr-api\/(?:archived-)?pages-\d+\.json$/.test(name)) unmapped.push(file.source + ': unsupported Qwilr API file')
   continue
  }
  if (file.bytes.length > 1024 * 1024) { issues.push('Qwilr API response exceeds the supported size'); continue }
  let parsed: unknown
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(file.bytes)) } catch { issues.push('Qwilr API response is not valid JSON'); continue }
  const sourceHash = sha256(file.bytes)
  if (detail) {
   if (!qwilrPage(parsed) || parsed.id !== detail[1]) { issues.push('Qwilr page response does not match its documented schema or file ID'); continue }
   if (proposals >= 100 && !seen.has('qwilr:api-pages:' + parsed.id)) { issues.push('Use at most 100 Qwilr pages per move-in'); continue }
   add('proposals', parsed.id, parsed, file, sourceHash)
  } else {
   if (!qwilrBlocks(parsed)) { issues.push('Qwilr saved-block response does not match its documented schema'); continue }
   for (const block of parsed) add('savedBlocks', block.id, block, file, sourceHash)
  }
 }
 for (const fact of facts) {
  const value = { ...fact, moveinId, provider: 'qwilr', contentMode: 'fixed-pdf' }
  const payload = { value, effects: [{ targetKind: 'source-facts', targetId: fact.id, value }] }
  records.push({ namespace: 'platter.exported-documents.v1', kind: 'source-facts', sourceId: fact.id,
   payload: payload as unknown as Json, payloadHash: sha256(canonicalJson(payload)), artifactHash: fact.sourceHash,
   location: { artifact: 'exports/' + fact.sourceHash + '.json', row: fact.sourceLine } })
 }
 const held = bindings.filter(binding => !binding.reviewed).length, omitted = bindings.filter(binding => binding.reviewed && !binding.selected).length
 return { records, usedChoices, report: { provider: 'qwilr' as const, mappings: {}, facts, bindings, issues, unmapped,
  counts: { clients: 0, services: 0, proposals, billingSchedules }, held, omitted }, canApply: !issues.length && !held }
}

import { Buffer } from 'node:buffer'
import { canonicalJson, sha256 } from '../../modules/import-kit/src/d1/index.ts'
import type { Diagnostic, Json, SourceArtifact, SourceBundle, SourceRecord } from '../../modules/import-kit/src/types.ts'
import { fail } from './errors.ts'
import { parseBusinessCsv } from './business-csv.ts'
import { businessPreset, bindBusinessHeaders } from './business-presets.ts'
import { businessNamespace, type BusinessImageInput, type BusinessKind, type BusinessRecord } from './business-model.ts'
import { normalizeBusinessRecord, splitImageUrls, validateBusinessBundles } from './business-normalize.ts'

function prepared(input: Record<string, unknown>) {
  const selected = businessPreset(input)
  const parsed = parseBusinessCsv(input.csv, selected.mapping.delimiter)
  bindBusinessHeaders(selected.kind, selected.format, selected.mapping, parsed.headers)
  return { ...selected, ...parsed }
}

/** The acquisition helper discovers URLs through exactly the reviewed mapper. */
export function businessImageUrls(input: Record<string, unknown>): string[] {
  const parsed = prepared(input)
  if (parsed.kind !== 'catalog' || !parsed.mapping.columns.images) return []
  const index = parsed.headers.indexOf(parsed.mapping.columns.images)
  return [...new Set(parsed.rows.flatMap(row => splitImageUrls(row.cells[index])))].sort()
}

function identity(id: string, field: string) {
  if (!id || id.length > 200 || /[\u0000-\u001f\u007f]/.test(id)) fail('invalid_source_id', 400, `${field} must be a nonempty ID of at most 200 characters without control characters`)
  return id
}

export function businessSource(input: Record<string, unknown>, imageInput: BusinessImageInput = {}) {
  const { kind, format, mapping, bytes, headers, rows } = prepared(input)
  const artifactHash = sha256(bytes), csvName = `${kind}.csv`
  const mappingValue = { kind, format, ...mapping, omitUnfetchedImages: Boolean(imageInput.allowUnfetched) }, mappingText = canonicalJson(mappingValue), mappingHash = sha256(mappingText)
  const mappingBytes = Buffer.from(mappingText, 'utf8')
  const artifacts: SourceArtifact[] = [
    { name: csvName, sha256: artifactHash, size: bytes.length, original: { status: 'available', base64: bytes.toString('base64') } },
    { name: 'reviewed-mapping.json', sha256: mappingHash, size: mappingBytes.length, original: { status: 'available', base64: mappingBytes.toString('base64') } },
  ]
  const diagnostics: Diagnostic[] = [], records: SourceRecord[] = []
  const companies = new Map<string, { value: BusinessRecord; line: number }>()
  const contacts: BusinessRecord[] = [], catalog: BusinessRecord[] = [], ids = new Set<string>()
  const images = new Map<string, NonNullable<BusinessImageInput['images']>[number]>()
  const expectedUrls = new Set(businessImageUrls(input))
  let imageBytes = 0
  for (const image of imageInput.images || []) {
    if (!expectedUrls.has(image.url) || images.has(image.url)) fail('invalid_image_artifact', 400, 'Image artifacts must correspond to one requested URL each')
    const original = image.artifact.original
    if (original?.status !== 'available') fail('invalid_image_artifact', 400, 'Image bytes must be available')
    const imageBody = Buffer.from(original.base64, 'base64')
    imageBytes += imageBody.length
    if (!imageBody.length || imageBody.length > 5 * 1024 * 1024 || imageBytes > 20 * 1024 * 1024 || imageBody.toString('base64') !== original.base64 || imageBody.length !== image.artifact.size || sha256(imageBody) !== image.artifact.sha256 || !/^image\//.test(image.mediaType)) fail('invalid_image_artifact', 400, 'Image artifact hash, size or media type is invalid (5 MiB each, 20 MiB total)')
    images.set(image.url, image)
    if (!artifacts.some(artifact => artifact.name === image.artifact.name)) artifacts.push(image.artifact)
    else if (!artifacts.some(artifact => artifact.name === image.artifact.name && artifact.sha256 === image.artifact.sha256)) fail('invalid_image_artifact', 400, 'Artifact names must identify exact bytes')
  }
  const mappedHeaders = new Set(Object.values(mapping.columns)), unknown = headers.filter(header => !mappedHeaders.has(header))
  for (const field of unknown) diagnostics.push({ severity: 'warning', code: 'unmapped_source_column', message: `${field} is retained losslessly in source_fields`, field })
  if (!mapping.columns[kind === 'contacts' ? 'contact_id' : 'id'] && format !== 'platter') diagnostics.push({ severity: 'warning', code: 'source_local_row_ids', message: 'This export has no mapped IDs. IDs use the original CSV SHA-256 and data-row ordinal; changed files are new source records.' })
  const add = (targetKind: BusinessKind, value: BusinessRecord, line: number) => {
    const payload = { value, mappingHash }
    records.push({ namespace: businessNamespace, kind: targetKind, sourceId: value.id, payload: payload as Json,
      payloadHash: sha256(canonicalJson(payload)), artifactHash, location: { artifact: csvName, row: line } })
  }
  for (const [ordinal, row] of rows.entries()) {
    const raw = Object.fromEntries(headers.map((header, i) => [header, row.cells[i]]))
    const fields = Object.fromEntries(Object.entries(mapping.columns).map(([field, header]) => [field, raw[header]]))
    const diagnostic = (severity: Diagnostic['severity'], code: string, message: string, field?: string) => diagnostics.push({ severity, code, message, field, location: { artifact: csvName, row: row.line } })
    const idField = kind === 'contacts' ? 'contact_id' : 'id'
    const explicit = (fields[idField] || '').trim()
    if (format === 'platter' && !explicit) diagnostic('error', 'source_id_required', `Platter ${idField} must be explicit`, idField)
    const id = identity(explicit || `csv:${artifactHash}:${ordinal + 1}`, idField)
    if (ids.has(id)) diagnostic('error', 'duplicate_source_id', `Duplicate ${idField} ${id}`, idField)
    ids.add(id)
    if (kind === 'contacts') {
      const companyLabel = fields.company_name?.trim() || ''
      const direct = fields.company_id?.trim() || '', selected = Object.hasOwn(mapping.companyIds, companyLabel) ? mapping.companyIds[companyLabel] : ''
      if (direct && selected && direct !== selected) diagnostic('error', 'company_mapping_conflict', 'Mapped company ID disagrees with the CSV company ID', 'company_id')
      fields.company_id = direct || selected
      if (companyLabel && !fields.company_id) diagnostic('error', 'company_id_required', `Company ${companyLabel} needs an explicit company ID in the CSV or reviewed companyIds mapping`, 'company_id')
      if (fields.company_id) identity(fields.company_id, 'company_id')
      const contact = normalizeBusinessRecord(kind, format, fields, raw, id, diagnostic)
      contacts.push(contact)
      if (fields.company_id && companyLabel) {
        const company: BusinessRecord = { id: fields.company_id, name: fields.company_name, billing_address: contact.billing_address, service_address: contact.service_address, tax_exempt: contact.tax_exempt ?? '', source_rows: [raw] }
        const previous = companies.get(company.id)
        if (!previous) companies.set(company.id, { value: company, line: row.line })
        else {
          for (const field of ['name', 'billing_address', 'service_address', 'tax_exempt']) {
            if (canonicalJson(previous.value[field]) !== canonicalJson(company[field])) diagnostic('error', 'inconsistent_company', `Company ID ${company.id} has conflicting ${field}; review the mapping or source rows`, field)
          }
          ;(previous.value.source_rows as Json[]).push(raw)
        }
      }
    } else {
      const value = normalizeBusinessRecord(kind, format, fields, raw, id, diagnostic)
      value.images = (value.images as { url: string; status: string }[]).map(({ url }): Json => {
        const acquired = images.get(url)
        if (!acquired) {
          const failure = imageInput.failures?.find(item => item.url === url)
          diagnostic(imageInput.allowUnfetched?'warning':'error', failure ? 'image_acquisition_failed' : 'image_acquisition_required', failure?.message || `Image ${url} needs acquisition before apply`, 'images')
          return { url, status: imageInput.allowUnfetched?'not-fetched':failure?'failed':'needs-acquisition', ...(imageInput.allowUnfetched?{owner_confirmation:'Imported without unfetched images for this reviewed file'}:{}) }
        }
        return { url, status: 'retained', artifact: acquired.artifact.name, sha256: acquired.artifact.sha256, size: acquired.artifact.size, media_type: acquired.mediaType }
      })
      catalog.push(value)
    }
  }
  const emails=new Set<string>()
  for(const contact of contacts){const email=String(contact.email??'');if(email&&emails.has(email))diagnostics.push({severity:'error',code:'duplicate_contact_email',message:'Two source contacts have the same exact email; review their explicit IDs',sourceId:contact.id});if(email)emails.add(email)}
  if (kind === 'catalog') validateBusinessBundles(catalog, diagnostics)
  // Companies precede contacts, so bounded apply and reverse-order undo retain
  // referential integrity, even when one CSV spans several requests.
  for (const { value, line } of companies.values()) add('companies', value, line)
  for (const [index, value] of (kind === 'contacts' ? contacts : catalog).entries()) add(kind, value, rows[index].line)
  const source: SourceBundle = { records, diagnostics, artifacts }
  return { source, mapping: mappingValue, companies: [...companies.values()].map(row => row.value), contacts, catalog,
    report: { sourceRows: rows.length, companies: companies.size, contacts: contacts.length, catalog: catalog.length, unmappedColumns: unknown,
      notes: ['All original CSV bytes and columns are retained.', 'IDs are explicit or local to the exact source file; names and emails never merge records.', 'Decimal, percentage, range, recurring, optional and custom metadata is retained without converting it into current cents pricing.'],
      imageUrls: [...expectedUrls], retainedImages: images.size } }
}

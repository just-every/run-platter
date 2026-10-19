import type { BusinessRecord } from './business-model.ts'
import type { Diagnostic, Json } from '../../modules/import-kit/src/types.ts'

export const splitImageUrls = (value: string) => value ? value.split(',').map(url => url.trim()).filter(Boolean) : []

export function normalizeBusinessRecord(kind: 'contacts' | 'catalog', format: string, fields: Record<string, string>, raw: Record<string, string>, id: string,
  diagnostic: (severity: Diagnostic['severity'], code: string, message: string, field?: string) => void): BusinessRecord {
  const value: BusinessRecord = { id, source_fields: raw }
  for (const [key, field] of Object.entries(fields)) if (!['id', 'contact_id', 'company_id', 'images', 'bundle_components'].includes(key)) value[key] = field
  if (kind === 'contacts') {
    if (!fields.first_name?.trim() && !fields.last_name?.trim() && !fields.email?.trim()) diagnostic('error', 'contact_identity_missing', 'Contact needs a name or email')
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) diagnostic('error', 'invalid_contact_email', 'Invalid contact email', 'email')
    value.company_id = fields.company_id || null
    if(fields.email)value.email=fields.email.trim()
    value.billing_address = fields.billing_address || Object.fromEntries(['street_address', 'city', 'postal_code', 'country', 'state'].filter(key => fields[key]).map(key => [key, fields[key]]))
    value.service_address = fields.service_address || Object.fromEntries(['street_address', 'city', 'postal_code', 'country', 'state'].filter(key => fields[`service_${key}`]).map(key => [key, fields[`service_${key}`]]))
  } else {
    if (!fields.name?.trim()) diagnostic('error', 'catalog_name_missing', 'Catalog item needs a name', 'name')
    for (const field of ['price', 'cost', 'min_price', 'max_price']) {
      if (!fields[field]) continue
      const decimal = /^[+-]?\d+(?:\.\d+)?$/.test(fields[field])
      if (!decimal || (format === 'pandadoc' && !/^[+-]?\d+(?:\.\d{1,5})?$/.test(fields[field]))) {
        diagnostic(format === 'pandadoc' ? 'error' : 'warning', 'price_needs_review', `${field} is retained exactly and needs pricing review`, field)
      }
    }
    if (fields.currency && fields.currency.toUpperCase() !== 'USD') diagnostic('warning', 'non_usd_currency', `${fields.currency} price retained without currency conversion`, 'currency')
    value.category_path = (fields.category || '').split('/').map(part => part.trim()).filter(Boolean)
    value.images = splitImageUrls(fields.images || '').map(url => ({ url, status: 'needs-acquisition' }))
    value.bundle_components = []
    if (fields.bundle_components?.trim()) {
      const components: Json[] = []
      for (const item of fields.bundle_components.split(',')) {
        const match = /^(.*):([0-9]+(?:\.[0-9]+)?)$/.exec(item.trim())
        if (!match || !match[1].trim() || !/[1-9]/.test(match[2])) {
          diagnostic('error', 'invalid_bundle_component', `Bundle component ${item} needs SKU:positive-quantity`, 'bundle_components'); continue
        }
        components.push({ sku: match[1].trim(), quantity: match[2] })
      }
      value.bundle_components = components
      value.package = true
    } else if (fields.type?.toLowerCase() === 'bundle') diagnostic('error', 'empty_bundle', 'Bundle has no SKU components', 'bundle_components')
    value.pricing_status = 'retained-for-review'
  }
  if (fields.tax_exempt) {
    const flag = fields.tax_exempt.trim().toLowerCase()
    if (['yes', 'true', '1'].includes(flag)) value.tax_exempt = true
    else if (['no', 'false', '0'].includes(flag)) value.tax_exempt = false
    else diagnostic('warning', 'tax_exemption_needs_review', 'Tax exemption retained exactly; review its meaning', 'tax_exempt')
  }
  return value
}

export function validateBusinessBundles(records: BusinessRecord[], diagnostics: Diagnostic[]) {
  const skus = new Map<string, BusinessRecord[]>()
  for (const record of records) if (typeof record.sku === 'string' && record.sku) skus.set(record.sku, [...(skus.get(record.sku) || []), record])
  const graph = new Map<string, string[]>()
  for (const record of records) {
    const edges: string[] = []
    for (const component of record.bundle_components as { sku: string; quantity: string; catalog_id?: string }[]) {
      const matches = skus.get(component.sku) || []
      if (matches.length !== 1) diagnostics.push({ severity: 'error', code: 'unresolved_bundle_component', message: `Bundle ${record.id}: SKU ${component.sku} has ${matches.length} source matches; supply an unambiguous component row`, sourceId: record.id, field: 'bundle_components' })
      else { component.catalog_id = matches[0].id; edges.push(matches[0].id) }
    }
    graph.set(record.id, edges)
  }
  const complete = new Set<string>(), active = new Set<string>()
  const visit = (id: string): boolean => {
    if (active.has(id)) return true
    if (complete.has(id)) return false
    active.add(id)
    const cycle = (graph.get(id) || []).some(visit)
    active.delete(id); complete.add(id)
    return cycle
  }
  for (const record of records) if (visit(record.id)) diagnostics.push({ severity: 'error', code: 'bundle_cycle', message: `Bundle ${record.id} contains a cyclic component reference`, sourceId: record.id })
}

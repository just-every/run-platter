import { fail } from './errors.ts'
import type { BusinessMapping } from './business-model.ts'

// Export columns are reviewed against the supplied files, never inferred by a provider call.
export const ignitionExportColumns = {
 clients: { id: 'Client ID', name: 'Client Name' },
 services: { id: '#ID', name: 'Service Name', description: 'Service Description', price: 'Price', currency: 'Currency' },
 proposals: { id: 'Proposal ID', title: 'Proposal Name', clientId: 'Client ID', date: 'Created Date', status: 'Status', currency: 'Currency', value: 'Value', document: 'PDF' },
 billingSchedules: { id: 'Billing Schedule ID', proposalId: 'Proposal ID', serviceId: 'Service ID', status: 'Status', date: 'Start Date', currency: 'Currency', value: 'Amount', frequency: 'Frequency' },
}
export const ignitionServiceFields = ['sku','unit_name','billing_frequency','price_type','billing_mode','min_price','max_price','cost','tax_code','income_account']
const contactFields = ['company_id', 'company_name', 'contact_id', 'first_name', 'last_name', 'email', 'title', 'phone', 'billing_address', 'service_address', 'tax_exempt']
const catalogFields = ['id', 'name', 'sku', 'price', 'currency', 'description', 'images', 'type', 'bundle_components', 'category', 'cost', 'billing_frequency', 'quantity', 'unit_name', 'price_type', 'billing_mode', 'min_price', 'max_price', 'terms', 'tax_exempt', 'tax_code', 'income_account', 'optional', 'adjustable', 'tags']
const addressFields = ['street_address', 'city', 'postal_code', 'country', 'state', 'service_street_address', 'service_city', 'service_postal_code', 'service_country', 'service_state']
const identity = (fields: string[]) => Object.fromEntries(fields.map(field => [field, field]))
const presets: Record<string, { delimiter: string; contacts?: Record<string, string>; catalog?: Record<string, string> }> = {
  platter: { delimiter: ',', contacts: identity(contactFields), catalog: identity(catalogFields) },
  pandadoc: { delimiter: ',', contacts: { email: 'email', first_name: 'first_name', last_name: 'last_name', company_name: 'company', phone: 'phone', title: 'title', ...identity(addressFields.slice(0, 5)) },
    catalog: { name: 'Name', sku: 'SKU', type: 'Type', bundle_components: 'SKUs_in_bundle', category: 'Category', price: 'Price', cost: 'Cost', currency: 'Currency', description: 'Description', images: 'Images', billing_frequency: 'Billing_frequency' } },
  betterproposals: { delimiter: ',', catalog: {
    id: "ProductID (Do not edit existing ID's, leave blank for new products)", name: 'Product Name', sku: 'Product Code',
    type: 'Product Type (Optional/Choice/Normal)', price: 'Price', price_type: 'Price Type (Amount/Percentage)', description: 'Description',
    billing_frequency: 'Recurring Type (One-off/Monthly/Quarterly/Annual)', tax_exempt: 'Tax Exempt (Yes/No)',
  } },
  qwilr: { delimiter: ',', catalog: { name: 'Description', description: 'Description', quantity: 'Quantity', price: 'Cost Per Item', unit_name: 'Unit Name', billing_frequency: 'RecurringFrequency' } },
  ignition: { delimiter: ',', catalog: { id: '#ID', name: 'Service Name', description: 'Service Description', price_type: 'Price Type', billing_mode: 'Billing Mode', price: 'Price', unit_name: 'Unit Name', min_price: 'Min Price', max_price: 'Max Price', terms: 'Service Terms', category: 'Service Category' } },
  proposify: { delimiter: ',', catalog: { name: 'Name', price: 'Price', quantity: 'Quantity', description: 'Description', type: 'Type', optional: 'Optional for clients', adjustable: 'Adjustable', tags: 'Tags' } },
}

function object(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_mapping', 400, `${name} must be an object`)
  return value as Record<string, unknown>
}
function strings(value: unknown, name: string): Record<string, string> {
  const entries = Object.entries(object(value, name))
  if (entries.some(([key, v]) => !key || typeof v !== 'string' || !v)) fail('invalid_mapping', 400, `${name} must map names to nonempty strings`)
  return Object.fromEntries(entries) as Record<string, string>
}

export function businessPreset(input: Record<string, unknown>) {
  const kind = input.kind
  if (kind !== 'contacts' && kind !== 'catalog') fail('invalid_import_kind', 400, 'Choose contacts or catalog')
  const format = typeof input.format === 'string' ? input.format.toLowerCase().replace(/[ _-]/g, '') : 'platter'
  let supplied: unknown = input.mapping ?? {}
  if (typeof supplied === 'string') {
    try { supplied = JSON.parse(supplied) } catch { fail('invalid_mapping', 400, 'mapping must be valid JSON') }
  }
  const custom = object(supplied, 'mapping')
  if (Object.keys(custom).some(key => !['delimiter', 'columns', 'companyIds'].includes(key))) fail('invalid_mapping', 400, 'mapping accepts delimiter, columns and companyIds')
  const preset = presets[format]
  if (format !== 'mapping' && (!preset || !preset[kind])) fail('mapping_required', 400, 'This export needs a reviewed column mapping; select mapping and name its delimiter and columns')
  if (format === 'mapping' && (custom.delimiter === undefined || custom.columns === undefined)) fail('mapping_required', 400, 'A reviewed mapping needs delimiter and columns')
  const delimiter = custom.delimiter ?? (format === 'pandadoc' && kind === 'contacts' ? ';' : preset?.delimiter)
  if (delimiter !== ',' && delimiter !== ';' && delimiter !== '\t') fail('invalid_mapping', 400, 'delimiter must be comma, semicolon or tab')
  const columns = custom.columns === undefined ? { ...preset![kind]! } : strings(custom.columns, 'columns')
  const allowed = new Set(kind === 'contacts' ? [...contactFields, ...addressFields] : catalogFields)
  for (const field of Object.keys(columns)) if (!allowed.has(field)) fail('invalid_mapping', 400, `Unknown normalized field ${field}`)
  const companyIds = custom.companyIds === undefined ? {} : strings(custom.companyIds, 'companyIds')
  const mapping: BusinessMapping = { delimiter, columns, companyIds }
  return { kind, format, mapping } as const
}

export function bindBusinessHeaders(kind: 'contacts' | 'catalog', format: string, mapping: BusinessMapping, headers: string[]) {
  // Platter's catalog permits additional columns and optional metadata. An
  // explicitly supplied mapping, and published preset layouts, bind exactly.
  if (format === 'platter') {
    const required = kind === 'contacts' ? contactFields : ['id', 'name']
    for (const field of required) if (!headers.includes(mapping.columns[field])) fail('invalid_csv_headers', 400, `Missing mapped header for ${field}`)
    mapping.columns = Object.fromEntries(Object.entries(mapping.columns).filter(([, header]) => headers.includes(header)))
  } else {
    for (const [field, header] of Object.entries(mapping.columns)) if (!headers.includes(header)) fail('invalid_csv_headers', 400, `Missing header ${header} mapped to ${field}`)
  }
  if (kind === 'catalog' && !mapping.columns.name) fail('invalid_mapping', 400, 'Catalog mapping needs name')
  if (kind === 'contacts' && !mapping.columns.first_name && !mapping.columns.last_name && !mapping.columns.email) fail('invalid_mapping', 400, 'Contact mapping needs a name or email')
}

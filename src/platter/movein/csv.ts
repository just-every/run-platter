import { Buffer } from 'node:buffer'
import { canonicalJson, sha256 } from '../../modules/import-kit/src/d1/index.ts'
import type { SourceBundle, SourceRecord } from '../../modules/import-kit/src/types.ts'
import { fail, requiredText } from './errors.ts'

export const namespace = 'platter.clients.csv.v1'
const columns = ['client_id', 'name', 'email']

// Adapted from Run Lanyard's CSV source reader, using Base's import-kit custody.
// RFC 4180 quoting, including embedded newlines; locations use physical lines.
function parse(text: string): { cells: string[]; line: number }[] {
  const rows: { cells: string[]; line: number }[] = []
  let cells: string[] = [], cell = '', state: 'plain' | 'quoted' | 'closed' = 'plain', line = 1, start = 1
  const push = () => { cells.push(cell); rows.push({ cells, line: start }); cells = []; cell = ''; state = 'plain' }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (state === 'quoted') {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else state = 'closed' }
      else {
        cell += ch
        if (ch === '\n' || (ch === '\r' && text[i + 1] !== '\n')) line++
      }
      continue
    }
    if (ch === '"') {
      if (state !== 'plain' || cell) fail('invalid_csv', 400, `Unexpected quote at line ${line}`)
      state = 'quoted'; continue
    }
    if (ch === ',') { cells.push(cell); cell = ''; state = 'plain'; continue }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      push(); line++; start = line; continue
    }
    if (state === 'closed') fail('invalid_csv', 400, `Unexpected text after a quote at line ${line}`)
    cell += ch
  }
  if (state === 'quoted') fail('invalid_csv', 400, 'Unclosed CSV quote')
  if (cell || cells.length || state === 'closed') push()
  return rows
}

export function clientSource(value: unknown): SourceBundle {
  const csv = requiredText(value, 'csv'), bytes = Buffer.from(csv, 'utf8')
  if (bytes.length > 100_000) fail('csv_too_large', 400, 'Client CSV is limited to 100,000 UTF-8 bytes')
  if (csv.includes('\0')) fail('invalid_csv', 400, 'CSV cannot contain null bytes')
  const rows = parse(csv.replace(/^\uFEFF/, ''))
  if (!rows.length || rows[0].cells.length !== columns.length || rows[0].cells.some((v, i) => v !== columns[i])) {
    fail('invalid_csv_headers', 400, `Use these exact headers: ${columns.join(',')}`)
  }
  const body = rows.slice(1)
  if (!body.length || body.length > 100) fail('invalid_client_count', 400, 'Import between 1 and 100 clients')
  const ids = new Set<string>(), emails = new Set<string>(), artifactHash = sha256(bytes)
  const records: SourceRecord[] = body.map(({ cells, line }) => {
    if (cells.length !== 3) fail('invalid_csv_row', 400, `Line ${line} must have three cells`)
    const [id, name, rawEmail] = cells.map(v => v.trim()), email = rawEmail.toLowerCase()
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !name || name.length > 200 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fail('invalid_client_row', 400, `Invalid client fields at line ${line}`, { line })
    }
    if (ids.has(id) || emails.has(email)) fail('duplicate_client', 400, `Duplicate client ID or email at line ${line}`, { line })
    ids.add(id); emails.add(email)
    const payload = { id, name, email }
    return { namespace, kind: 'clients', sourceId: id, payload, payloadHash: sha256(canonicalJson(payload)), artifactHash, location: { artifact: 'clients.csv', row: line } }
  })
  return { records, diagnostics: [], artifacts: [{ name: 'clients.csv', sha256: artifactHash, size: bytes.length, original: { status: 'available', base64: bytes.toString('base64') } }] }
}

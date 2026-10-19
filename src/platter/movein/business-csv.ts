import { Buffer } from 'node:buffer'
import { fail, requiredText } from './errors.ts'
import type { CsvRow } from './business-model.ts'

/** RFC 4180 cells, configurable delimiter, physical source line locations. */
export function parseBusinessCsv(value: unknown, delimiter: string) {
  const csv = requiredText(value, 'csv'), bytes = Buffer.from(csv, 'utf8')
  if (bytes.length > 2_000_000) fail('csv_too_large', 400, 'Business CSV is limited to 2,000,000 UTF-8 bytes')
  if (csv.includes('\0')) fail('invalid_csv', 400, 'CSV cannot contain null bytes')
  const text = csv.replace(/^\uFEFF/, ''), rows: CsvRow[] = []
  let cells: string[] = [], cell = '', state: 'plain' | 'quoted' | 'closed' = 'plain', line = 1, start = 1
  const push = () => { cells.push(cell); rows.push({ cells, line: start }); cells = []; cell = ''; state = 'plain' }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (state === 'quoted') {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else state = 'closed' }
      else { cell += ch; if (ch === '\n' || (ch === '\r' && text[i + 1] !== '\n')) line++ }
      continue
    }
    if (ch === '"') {
      if (state !== 'plain' || cell) fail('invalid_csv', 400, `Unexpected quote at line ${line}`)
      state = 'quoted'; continue
    }
    if (ch === delimiter) { cells.push(cell); cell = ''; state = 'plain'; continue }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      push(); line++; start = line; continue
    }
    if (state === 'closed') fail('invalid_csv', 400, `Unexpected text after a quote at line ${line}`)
    cell += ch
  }
  if (state === 'quoted') fail('invalid_csv', 400, 'Unclosed CSV quote')
  if (cell || cells.length || state === 'closed') push()
  if (rows.length < 2) fail('invalid_csv', 400, 'CSV needs headers and at least one data row')
  const headers = rows.shift()!.cells
  if (headers.some(h => !h) || new Set(headers).size !== headers.length) fail('invalid_csv_headers', 400, 'CSV headers must be nonempty and unique')
  if (rows.length > 1000) fail('invalid_record_count', 400, 'Import at most 1,000 CSV rows at a time')
  for (const row of rows) if (row.cells.length !== headers.length) fail('invalid_csv_row', 400, `Line ${row.line} has ${row.cells.length} cells; expected ${headers.length}`)
  return { bytes, headers, rows }
}

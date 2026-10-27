import { escape } from './shared'

const states: Record<string, string> = {
 queued: 'Waiting to import', applying: 'Import in progress', completed: 'Import complete',
 undoing: 'Undo in progress', undone: 'Import undone', failed: 'Import stopped; review before continuing',
}
export const importStatus = (value: unknown): string => states[String(value)] ?? 'Review this import before continuing'

// The journal keeps all custody in the API. Its screen explains what happened
// without presenting storage keys, hashes, or encoded file bodies as prose.
export function importJournal(result: any, business = false): string {
 const job = result.job ?? {}
 const originals = result.originals ?? []
 const provenance = result.provenance ?? []
 return `<p>${escape(importStatus(job.state))}. ${escape(job.checkpoint ?? 0)} of ${escape(job.total ?? 0)} changes processed.</p>`
  + '<h3>Original files</h3>'
  + (originals.length ? '<ul class="records">' + originals.map((file: any) => {
   const retained = ['available', 'retained'].includes(file.original?.status)
   const route = business ? 'business-original' : 'client-original'
   const link = `/api/platter/${route}?job=${encodeURIComponent(job.id)}&amp;name=${encodeURIComponent(file.name)}`
   return `<li>${retained ? `<a href="${link}">Download ${escape(file.name)}</a>` : `<span>${escape(file.name)} · Original file unavailable</span>`}<span>${escape(file.size)} bytes</span></li>`
  }).join('') + '</ul>' : '<p>No original files were retained.</p>')
  + '<h3>Record history</h3>'
  + (provenance.length ? '<ul class="records">' + provenance.map((record: any) => `<li><span>${escape(record.location?.artifact ?? 'Original file')}${record.location?.row ? ` · Row ${escape(record.location.row)}` : ''}</span><span>${record.reversed ? 'Undone' : 'Imported'}</span></li>`).join('') + '</ul>' : '<p>No records have been imported.</p>')
}

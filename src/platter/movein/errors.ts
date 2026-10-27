const explanations: Record<string, string> = {
  owner_required: 'Only the active owner can manage imports. Sign in as the owner and try again.',
  import_job_not_found: 'This import is unavailable. Open Import and choose a current import from its history.',
  unknown_import_command: 'This import action is unavailable. Open Import and choose an action shown there.',
  invalid_import_target: 'This import cannot write to those records. Preview the original CSV again before applying.',
  invalid_import_effect: 'The reviewed import no longer matches these records. Preview the original CSV again before applying.',
  native_business_record_conflict: 'An imported business record has changed. Keep the later edits and review the import before continuing.',
}
export function fail(code: string, status: number, message?: string, details?: unknown): never {
  throw Object.assign(new Error(message ?? explanations[code] ?? 'The import could not continue. Open Import and preview the original CSV again.'), { code, status, ...(details === undefined ? {} : { details }) })
}

export function requiredText(value: unknown, field: string): string {
  const labels: Record<string, string> = { csv: 'CSV content', id: 'An import from the history', fingerprint: 'A fresh import preview' }
  if (typeof value !== 'string' || !value.trim()) fail('invalid_input', 400, `${labels[field] ?? 'A required import value'} is needed. Open Import and preview the original CSV again.`)
  return value
}

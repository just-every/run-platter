export function fail(code: string, status: number, message = code, details?: unknown): never {
  throw Object.assign(new Error(message), { code, status, ...(details === undefined ? {} : { details }) })
}

export function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) fail('invalid_input', 400, `${field} is required`)
  return value
}

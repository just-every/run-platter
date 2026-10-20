import { need, type Actor } from './model'

export async function recordAudit(db: D1Database, actor: Pick<Actor, 'id'> & { role: string; keyId?: string }, action: string, subject: string) {
 await db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)')
  .bind(crypto.randomUUID(), actor.keyId ? `agent:${actor.keyId}` : actor.id, actor.role, action, subject, Date.now()).run()
}
export async function auditRows(db: D1Database, actor: Actor, query: URLSearchParams) {
 need(actor.role === 'owner', 'Only the owner reads the audit log', 403)
 const filters: string[] = [], values: (string | number)[] = []
 for (const [parameter, column] of [['actor', 'actor_id'], ['action', 'action'], ['subject', 'subject']] as const) {
  const value = query.get(parameter)
  if (value) { filters.push(`${column}=?`); values.push(value) }
 }
 const search = query.get('q')?.trim()
 if (search) {
  filters.push("(instr(lower(actor_id),lower(?))>0 OR instr(lower(action),lower(?))>0 OR instr(lower(subject),lower(?))>0)")
  values.push(search, search, search)
 }
 for (const [parameter, comparison] of [['from', '>='], ['to', '<=']] as const) {
  const value = query.get(parameter)
  if (value) { const at = Number(value); need(Number.isSafeInteger(at) && at >= 0, 'Use an epoch-millisecond audit time'); filters.push(`occurred_at${comparison}?`); values.push(at) }
 }
 return (await db.prepare(`SELECT p_audit.*,(SELECT reason FROM p_withdrawals w WHERE p_audit.action='proposal.withdraw' AND w.proposal_id=p_audit.subject AND w.withdrawn_at=p_audit.occurred_at LIMIT 1) AS reason FROM p_audit${filters.length ? ' WHERE ' + filters.join(' AND ') : ''} ORDER BY occurred_at,id`).bind(...values).all<any>()).results
}
export function auditCsv(rows: any[]) {
 const columns = ['id', 'actor_id', 'actor_role', 'action', 'subject', 'occurred_at', 'reason']
 const cell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "'" + '$&').replaceAll('"', '""') + '"'
 return [columns.join(','), ...rows.map(row => columns.map(column => cell(row[column])).join(','))].join('\r\n') + '\r\n'
}

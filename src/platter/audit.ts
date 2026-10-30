import { need, type Actor } from './model'

export async function recordAudit(db: D1Database, actor: Pick<Actor, 'id'|'agent'> & { role: string; keyId?: string }, action: string, subject: string) {
 await db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)')
  .bind(crypto.randomUUID(), actor.agent ? `agent:${actor.agent.id}` : actor.keyId ? `agent:${actor.keyId}` : actor.id, actor.agent ? 'agent' : actor.role, action, subject, Date.now()).run()
}
export async function auditRows(db: D1Database, actor: Actor, query: URLSearchParams) {
 need(['owner','admin'].includes(actor.role), 'Only the owner reads the audit log', 403)
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
 return (await db.prepare(`SELECT p_audit.*,(SELECT route FROM p_mail_attributions m WHERE m.mail_id=p_audit.id) AS mail_route,(SELECT sender_address FROM p_mail_attributions m WHERE m.mail_id=p_audit.id) AS sender_address,COALESCE((SELECT reason FROM p_withdrawals w WHERE p_audit.action IN ('proposal.withdraw','proposal.lose','proposal.win','proposal.decline') AND w.id=p_audit.id AND w.proposal_id=p_audit.subject),(SELECT reason FROM p_withdrawals w WHERE p_audit.action IN ('proposal.withdraw','proposal.lose','proposal.win','proposal.decline') AND w.proposal_id=p_audit.subject AND w.withdrawn_at=p_audit.occurred_at LIMIT 1)) AS reason FROM p_audit${filters.length ? ' WHERE ' + filters.join(' AND ') : ''} ORDER BY occurred_at,id`).bind(...values).all<any>()).results
}
export function auditCsv(rows: any[]) {
 const columns = ['id', 'actor_id', 'actor_role', 'action', 'subject', 'occurred_at', 'reason', 'mail_route', 'sender_address']
 const cell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "'" + '$&').replaceAll('"', '""') + '"'
 return [columns.join(','), ...rows.map(row => columns.map(column => cell(row[column])).join(','))].join('\r\n') + '\r\n'
}
/** What the audit page names each id by: proposal titles, client names, people and agent key labels. */
export async function auditNames(db: D1Database) {
 const [proposals, clients, people, keys, agents] = await Promise.all([
  db.prepare('SELECT id,title AS name FROM p_proposals').all<any>(), db.prepare('SELECT id,name FROM p_clients').all<any>(),
  db.prepare("SELECT id,COALESCE(NULLIF(display_name,''),email) AS name FROM oa_operators").all<any>(), db.prepare('SELECT id,label AS name FROM p_agent_keys').all<any>(), db.prepare("SELECT id,name||' for '||sponsor_name AS name FROM agent_door_agents").all<any>()])
 const map = (r: { results: any[] }) => new Map<string, string>(r.results.map(x => [String(x.id), String(x.name)]))
 return { proposals: map(proposals), clients: map(clients), people: map(people), keys: map({results:[...keys.results,...agents.results]}) }
}

import type { Bindings } from '../auth.server'
import { commit, exact, need, proposal, text, type Actor } from './model'
import { pendingNegotiation } from './negotiation'
import { queueMail, dispatchMail } from './mail'
import { currentTime, localDate, startOfDate, addDays } from './expiry-time'
import { installationZone } from './reports/report-state'

/** A rehearsal goes only to the active person's sign-in mailbox, never to a client. */
export async function sendTestMail(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 need(actor.role !== 'agent', 'A person sends a test to themselves', 403)
 need(['recipient', 'to', 'email', 'cc', 'bcc'].every(key => input[key] === undefined), 'A test can only be sent to your sign-in address')
 const db = env.DB, row = await proposal(db, input.id)
 exact(row, input)
 const pending = await pendingNegotiation(db, row.id)
 need(pending || ['draft', 'approved'].includes(row.status), 'Test an unsent revision', 409)
 const revision = pending?.revision ?? row.revision
 const subject = text(input.subject, 'a test subject', 200), message = text(input.message, 'a test message', 10000)
 need(!/[\r\n]/.test(subject), 'The subject must be a single line')
 const missing = (subject + '\n' + message).match(/\{([^{}]+)\}/)
 need(!missing, 'Fill the variable before testing: ' + (missing?.[1] ?? ''))
 const person = await db.prepare("SELECT email FROM oa_operators WHERE id=? AND status='active' AND role IN ('owner','member')").bind(actor.id).first<{email: string}>()
 need(person, 'Sign in again before testing', 403)
 const at = await currentTime(db), zone = await installationZone(db), day = localDate(at, zone)
 const start = startOfDate(day, zone), end = startOfDate(addDays(day, 1), zone)
 const countSql = "SELECT COUNT(*) AS n FROM p_audit WHERE actor_id=? AND subject=? AND action='proposal.test-mail' AND occurred_at>=? AND occurred_at<?"
 const values = [actor.id, row.id, start, end]
 const count = async () => (await db.prepare(countSql).bind(...values).first<{n: number}>())!.n
 need(await count() < 10, 'Ten tests per person per proposal per calendar day. Try again tomorrow.', 429)
 const previewUrl = env.AUTH_ORIGIN + '/app/preview?' + new URLSearchParams({id: row.id, revision: String(revision)})
 const mailId = crypto.randomUUID()
 const body = message + '\n\nPreview this revision (sign-in required):\n' + previewUrl
 try {
  await commit(db, actor, [
   queueMail(env, row.id, person.email, '[Test] ' + subject, body, null, null, mailId),
   db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), actor.id, actor.role, 'proposal.test-mail', row.id, at),
  ], false, {
   sql: `EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?) AND (${countSql})<10`,
   values: [row.id, row.version, ...values],
  })
 } catch (error) {
  if ((error as any)?.status === 409) need(await count() < 10, 'Ten tests per person per proposal per calendar day. Try again tomorrow.', 429)
  throw error
 }
 await dispatchMail(env, row.id, mailId)
 return {id: row.id, tested: true, recipient: person.email}
}

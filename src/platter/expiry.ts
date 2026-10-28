import { deliveryChange } from './delivery-settings'
import { actorById } from './credentials'
import { permitted, senders } from './permissions'
import type { Bindings } from '../auth.server'
import { commit, exact, fail, need, proposal, type Actor } from './model'
import { dispatchMail, queueMail } from './mail'
import { installationZone } from './reports/report-state'
import { addDays, calendarDate, currentTime, expiryDeadline, startOfDate } from './expiry-time'
export { currentTime } from './expiry-time'

/** Bind one logical currentTime after this fragment. The clock is re-read inside the commit. */
export function expiryOpenSql(alias = 'p') {
 return `NOT EXISTS(SELECT 1 FROM p_expiry ex WHERE ex.proposal_id=${alias}.id AND ex.deadline_at IS NOT NULL AND ex.deadline_at<=MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0)))`
}
export async function expiryFor(db: D1Database, row: any, at?: number) {
 const now = at ?? await currentTime(db)
 const saved = await db.prepare('SELECT * FROM p_expiry WHERE proposal_id=?').bind(row.id).first<any>()
 const requests = (await db.prepare('SELECT id,revision,deadline_at,requested_at,resolved_at,resolution FROM p_reopen_requests WHERE proposal_id=? ORDER BY requested_at,id').bind(row.id).all<any>()).results
 return {
  mode: saved?.mode ?? 'never', days: saved?.period_days ?? null, date: saved?.expires_on ?? null,
  timeZone: saved?.time_zone ?? await installationZone(db), sentAt: saved?.sent_at ?? null,
  deadlineAt: saved?.deadline_at ?? null, warningDays: saved?.warning_days ?? null, warningSentAt: saved?.warning_sent_at ?? null,
  expired: row.status === 'sent' && saved?.deadline_at != null && saved.deadline_at <= now,
  reopenRequests: requests.map(r => ({ id: r.id, revision: r.revision, deadlineAt: r.deadline_at, requestedAt: r.requested_at, resolvedAt: r.resolved_at, resolution: r.resolution })),
 }
}

/** Include in the owner's send transaction. Fresh invitations preserve the first send date;
 * a newly negotiated revision starts its period again and resolves retained requests. */
export async function expirySendStatements(db: D1Database, id: string, ownerId: string, at: number, revision = false) {
 const saved = await db.prepare('SELECT * FROM p_expiry WHERE proposal_id=?').bind(id).first<any>()
 if (saved?.sent_at != null && !revision) return []
 const current = await proposal(db,id)
 const sentAt = !revision && current.status === 'sent' ? saved?.sent_at ?? null : at
 const zone = await installationZone(db), mode = saved?.mode ?? 'never', days = saved?.period_days ?? null
 const deadline = expiryDeadline(mode, days, saved?.expires_on ?? null, sentAt, zone)
 const expiresOn = deadline.expiresOn, deadlineAt = mode === 'date' && expiresOn ? startOfDate(expiresOn,zone) : deadline.deadlineAt
 const writes = [db.prepare(`INSERT INTO p_expiry(proposal_id,mode,period_days,expires_on,time_zone,sent_at,deadline_at,warning_days,owner_id)
 VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET expires_on=excluded.expires_on,time_zone=excluded.time_zone,sent_at=excluded.sent_at,deadline_at=excluded.deadline_at,owner_id=excluded.owner_id,warning_sent_at=NULL`)
  .bind(id, mode, days, expiresOn, zone, sentAt, deadlineAt, saved?.warning_days ?? null, ownerId)]
 if (revision) writes.push(db.prepare("UPDATE p_reopen_requests SET resolved_at=?,resolution='reissued' WHERE proposal_id=? AND resolved_at IS NULL").bind(at, id))
 return writes
}
function integer(value: unknown, label: string, min: number) {
 const n = Number(value)
 need(value !== '' && value !== null && value !== undefined && Number.isInteger(n) && n >= min && n <= 36500, `Enter ${label} from ${min} to 36500`)
 return n
}
export async function expiryCommand(env: Bindings, a: Actor, name: string, p: Record<string, unknown>) {
 need(senders.includes(a.role), 'Only the owner changes expiry', 403)
 need(name === 'expiry.set' || name === 'expiry.remove', 'Unknown expiry command', 404)
 const db = env.DB, row = await proposal(db, p.id), at = await currentTime(db)
 exact(row, p)
 need(['draft', 'approved', 'sent'].includes(row.status), 'Accepted agreements never expire and cannot be changed', 409)
 const mode = name === 'expiry.remove' ? 'never' : String(p.mode ?? '')
 need(['never', 'days', 'date'].includes(mode), 'Choose days, a date, or no expiry')
 const days = mode === 'days' ? integer(p.days, 'expiry days', 1) : null
 const explicitDate = mode === 'date' ? calendarDate(p.date) : null
 const warningDays = mode === 'never' || p.warningDays === '' || p.warningDays == null ? null : integer(p.warningDays, 'warning lead days', 1)
 const previous = await db.prepare('SELECT * FROM p_expiry WHERE proposal_id=?').bind(row.id).first<any>()
 const sentAt = previous?.sent_at ?? null, zone = await installationZone(db)
 need(mode !== 'days' || row.status !== 'sent' || sentAt !== null,'This legacy offer has no recorded send time. Choose an expiry date or send a negotiated revision.',409)
 const deadline = expiryDeadline(mode, days, explicitDate, sentAt, zone)
 const expiresOn = deadline.expiresOn, deadlineAt = mode === 'date' && row.status === 'sent' ? startOfDate(expiresOn!,zone) : deadline.deadlineAt
 const writes = [db.prepare(`INSERT INTO p_expiry(proposal_id,mode,period_days,expires_on,time_zone,sent_at,deadline_at,warning_days,owner_id)
 VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET mode=excluded.mode,period_days=excluded.period_days,expires_on=excluded.expires_on,time_zone=excluded.time_zone,sent_at=excluded.sent_at,deadline_at=excluded.deadline_at,warning_days=excluded.warning_days,owner_id=excluded.owner_id`)
  .bind(row.id, mode, days, expiresOn, zone, sentAt, deadlineAt, warningDays, a.id),
  db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),deliveryChange(db,a,row,name,{mode,days,date:expiresOn,timeZone:zone,warningDays},at)]
 if (deadlineAt === null || deadlineAt > at) writes.push(db.prepare('UPDATE p_reopen_requests SET resolved_at=?,resolution=? WHERE proposal_id=? AND resolved_at IS NULL').bind(at, mode === 'never' ? 'removed' : 'extended', row.id))
 await commit(db, a, writes, true, { sql: "EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved','sent'))", values: [row.id, row.version] })
 return { id: row.id, version: row.version + 1, expiry: await expiryFor(db, row, at) }
}

/** Client context must come from clientContext; the session and expiration are rechecked atomically. */
export async function requestReopen(env: Bindings, c: any) {
 need(c.verified, 'Verify your email before requesting reopening', 401)
 const db = env.DB, at = await currentTime(db), id = crypto.randomUUID()
 const saved = await db.prepare('SELECT deadline_at FROM p_expiry WHERE proposal_id=?').bind(c.row.id).first<any>()
 need(c.row.status === 'sent' && saved?.deadline_at != null && saved.deadline_at <= at, 'Only an expired unsigned offer can be reopened', 409)
 try {
  await db.batch([
   db.prepare(`INSERT INTO p_guard(ok) VALUES((EXISTS(SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id JOIN p_expiry e ON e.proposal_id=p.id
    WHERE s.token=? AND p.id=? AND s.revision=p.revision AND p.revision=? AND p.status='sent'
    AND s.session_hash=? AND s.session_expires>MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0))
    AND e.deadline_at=? AND NOT (${expiryOpenSql('p')}))))`)
    .bind(c.token, c.row.id, c.row.revision, c.share.session_hash, at, saved.deadline_at, at),
   db.prepare('INSERT INTO p_reopen_requests(id,proposal_id,revision,deadline_at,requested_at) VALUES(?,?,?,?,?) ON CONFLICT(proposal_id,revision,deadline_at) DO NOTHING').bind(id, c.row.id, c.row.revision, saved.deadline_at, at),
   db.prepare('DELETE FROM p_guard'),
  ])
 } catch (e) { if (String(e).includes('CHECK constraint')) fail('The proposal or verification changed. Reload before continuing.', 409); throw e }
 return { message: 'Your request to reopen this proposal has been saved for the firm.' }
}

/** Only server.ts supplies this argument from CronController.scheduledTime. */
export async function runExpiry(env: Bindings, at: number) {
 need(Number.isSafeInteger(at) && at >= 0, 'Invalid cron trigger time')
 const db = env.DB
 await db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=MAX(observed_at,excluded.observed_at)').bind(at).run()
 const now = await currentTime(db)
 const due = (await db.prepare(`SELECT e.*,p.title,p.revision,p.version,s.slot_id,s.token,COALESCE(s.recipient,c.email) AS recipient
 FROM p_expiry e JOIN p_proposals p ON p.id=e.proposal_id JOIN p_clients c ON c.id=p.client_id
 JOIN p_shares s ON s.proposal_id=p.id AND s.revision=p.revision
 WHERE p.status='sent' AND e.warning_days IS NOT NULL AND e.warning_sent_at IS NULL AND e.deadline_at>?
 AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=p.id)
 AND (p.recipient_plan='[]' OR EXISTS(SELECT 1 FROM json_each(p.recipient_plan) r WHERE json_extract(r.value,'$.id')=s.slot_id AND json_extract(r.value,'$.role') IN ('signer','countersigner')))
 AND NOT EXISTS(SELECT 1 FROM p_recipient_signatures sig WHERE sig.proposal_id=p.id AND sig.revision=p.revision AND sig.slot_id=s.slot_id)`).bind(now).all<any>()).results
 const handled=new Set<string>()
 for (const e of due) {
  if(handled.has(e.proposal_id))continue
  handled.add(e.proposal_id)
  if (startOfDate(addDays(e.expires_on, -e.warning_days), e.time_zone) > now) continue
  const owner = await actorById(db,e.owner_id)
  if(owner){try{await permitted(db,owner,e.proposal_id,'send')}catch{continue}}
  if (!owner || !senders.includes(owner.role)) continue
  const subject = 'Expiry warning: ' + e.title
  const body = `This proposal expires at the start of ${e.expires_on} (${e.time_zone}). Verify your email to review and accept before that date.\n${env.AUTH_ORIGIN}/p/${e.token}\n\nThis is a fixed automatic expiry warning. Shared editable email templates are not available.`
  try {
   await commit(db, owner, [
    db.prepare('UPDATE p_expiry SET warning_sent_at=? WHERE proposal_id=?').bind(now, e.proposal_id),
    ...due.filter(r=>r.proposal_id===e.proposal_id).map(r=>queueMail(env,r.proposal_id,r.recipient,subject,body.replace('/p/'+e.token,'/p/'+r.token))),
    db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), 'scheduler', 'owner', 'expiry.warning', e.proposal_id, now),
   ], true, { sql: `EXISTS(SELECT 1 FROM p_expiry e JOIN p_proposals p ON p.id=e.proposal_id JOIN p_shares s ON s.proposal_id=p.id
    WHERE p.id=? AND p.version=? AND p.status='sent' AND p.revision=? AND s.revision=p.revision AND s.token=?
    AND e.owner_id=? AND e.deadline_at=? AND e.warning_days=? AND e.warning_sent_at IS NULL AND ${expiryOpenSql('p')}
    AND NOT EXISTS(SELECT 1 FROM p_acceptances WHERE proposal_id=p.id))`, values: [e.proposal_id, e.version, e.revision, e.token, owner.id, e.deadline_at, e.warning_days, now] })
  } catch (error) { if ((error as any).status === 409) continue; throw error }
  await dispatchMail(env, e.proposal_id)
 }
}

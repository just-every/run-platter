import { performanceFilters, salesPerformance } from './performance'
import { actorById } from '../credentials'
import type { Bindings } from '../../auth.server'
import { operatorMail } from '../../mail.server.mjs'
import { demoEffect } from '@runeditrun/rer/internal/modules/demo/index.mjs'
import { capturesMail } from '../mail'
import { commit, fail, need, text, type Actor } from '../model'
import { pipeline } from '../pipeline'
import { state } from '../state'
import { pipelineMail } from './pipeline-csv'
import { activePeople, installationZone } from './report-state'
import { nextRun, validZone } from './zone'

// REPORT-005: owner-named people receive a report at an hour in the installation's time zone; each run is claimed once.
const filterKeys = ['group','quarter','view','q', 'owner', 'status', 'client', 'nextAction', 'dueFollowup', 'minValue', 'maxValue', 'minAge', 'maxAge', 'sort', 'direction']

/** Keep only the pipeline's own filters, in a fixed order, after the pipeline validates them. */
export function savedFilters(value: unknown) {
 const raw = new URLSearchParams(typeof value === 'string' ? value : ''), params = new URLSearchParams()
 for (const key of filterKeys) { const v = raw.get(key); if (v) params.set(key, v) }
 if(params.get('view')==='sales-performance')performanceFilters(params);else pipeline([], params)
 return params.toString()
}

function recipientEmails(p: Record<string, unknown>) {
 const listed = Array.isArray(p.recipients) ? p.recipients : Object.keys(p).filter(k => k.startsWith('recipient:') && p[k]).map(k => k.slice('recipient:'.length))
 const emails = [...new Set(listed.map(v => String(v).trim().toLowerCase()))]
 need(emails.length >= 1 && emails.length <= 10, 'Choose one to ten people to receive the report')
 return emails
}

export async function reportCommand(env: Bindings, a: Actor, name: string, p: Record<string, unknown>) {
 const db = env.DB
 need(['owner','admin'].includes(a.role), 'Only the owner schedules report email', 403)
 if (name === 'report.time-zone') {
  const zone = text(p.timeZone, 'an IANA time zone such as America/New_York', 64)
  need(validZone(zone), 'Enter an IANA time zone such as America/New_York')
  const at = Date.now(), schedules = (await db.prepare('SELECT * FROM p_report_schedules').all<any>()).results
  await commit(db, a, [db.prepare('INSERT INTO p_installation_settings(singleton,time_zone) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET time_zone=excluded.time_zone').bind(zone),
   ...schedules.map(s => db.prepare('UPDATE p_report_schedules SET next_run_at=? WHERE id=?').bind(nextRun(s.cadence, s.weekday, s.hour, at, zone), s.id))], true)
  return { timeZone: zone }
 }
 if (name === 'report.unschedule') {
  const id = text(p.id, 'a schedule')
  need(await db.prepare('SELECT id FROM p_report_schedules WHERE id=?').bind(id).first(), 'Schedule not found', 404)
  await commit(db, a, [db.prepare('DELETE FROM p_report_schedules WHERE id=?').bind(id)], true)
  return { id, deleted: true }
 }
 need(name === 'report.schedule', 'Unknown report command', 404)
 need(p.report === undefined || p.report === 'pipeline', 'Choose a report')
 const cadence = String(p.cadence ?? ''), hour = Number(p.hour), weekday = cadence === 'weekly' ? Number(p.weekday) : null
 need(cadence === 'daily' || cadence === 'weekly', 'Choose daily or weekly')
 need(Number.isInteger(hour) && hour >= 0 && hour <= 23, 'Choose an hour from 0 to 23')
 need(weekday === null || (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6), 'Choose a weekday')
 const people = await activePeople(db), recipients = recipientEmails(p).map(email => people.find(person => person.email === email)?.id ?? fail(`${email} is not an active person in this installation`))
 const id = crypto.randomUUID(), at = Date.now(), filters = savedFilters(p.filters)
 await commit(db, a, [db.prepare('INSERT INTO p_report_schedules(id,report,filters,cadence,weekday,hour,recipients,owner_id,created_at,next_run_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
  .bind(id, 'pipeline', filters, cadence, weekday, hour, JSON.stringify(recipients), a.id, at, nextRun(cadence, weekday, hour, at, await installationZone(db)))], true)
 return { id }
}

/** Cron entry: build every due report as of the trigger's time and mail it to its people. */
export async function runDueReports(env: Bindings, at: number) {
 const db = env.DB, zone = await installationZone(db), due = (await db.prepare('SELECT * FROM p_report_schedules WHERE next_run_at<=? ORDER BY next_run_at,id').bind(at).all<any>()).results
 for (const s of due) {
  const claimed = await db.prepare('UPDATE p_report_schedules SET next_run_at=?,last_run_at=? WHERE id=? AND next_run_at=?').bind(nextRun(s.cadence, s.weekday, s.hour, at, zone), at, s.id, s.next_run_at).run()
  if (!claimed.meta.changes) continue
  const person=await actorById(db,s.owner_id),owner=person&&['owner','admin'].includes(person.role)?person:undefined
  const runId = crypto.randomUUID(), people = await activePeople(db), ids: string[] = JSON.parse(s.recipients)
  const to = owner ? people.filter(p => ids.includes(p.id)) : [], skipped = owner ? ids.filter(id => !to.some(p => p.id === id)).map(() => 'no longer active') : ['schedule owner is no longer an active owner']
  const snapshot=owner?await state(env,owner):null
  const report = snapshot ? new URLSearchParams(s.filters).get('view')==='sales-performance'?await salesPerformance(db,owner!,new URLSearchParams(s.filters)):pipeline(snapshot.proposals,new URLSearchParams(s.filters),at,snapshot.followups) : { rows: [], count: 0 }
  const writes = [db.prepare('INSERT INTO p_report_runs(id,schedule_id,ran_at,row_count,skipped) VALUES(?,?,?,?,?)').bind(runId, s.id, at, report.count, JSON.stringify(skipped))]
  if (owner) {
   const [subject, body] = pipelineMail(report as any, s.filters)
   for (const person of to) writes.push(db.prepare('INSERT INTO p_report_mail(id,run_id,recipient,subject,body,status,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(), runId, person.email, subject, body, capturesMail(env) ? 'local' : 'pending', at))
  }
  await db.batch(writes)
  await dispatchReportMail(env, runId)
 }
}

// Claim before contacting the provider; an uncertain attempt is never resent blindly.
async function dispatchReportMail(env: Bindings, runId: string) {
 if (capturesMail(env)) return
 const sender = operatorMail(env); if (!sender) return
 const rows = (await env.DB.prepare("SELECT * FROM p_report_mail WHERE run_id=? AND status='pending'").bind(runId).all<any>()).results
 for (const row of rows) {
  const claimed = await env.DB.prepare("UPDATE p_report_mail SET status='sending' WHERE id=? AND status='pending'").bind(row.id).run(); if (!claimed.meta.changes) continue
  try {
   const result = await demoEffect(() => sender.send({ from: env.MAIL_FROM!, to: [row.recipient], deliveryId: row.id, subject: row.subject, text: row.body, html: '<pre>' + row.body.replace(/[&<>]/g, (c: string) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)) + '</pre>', headers: {} }), () => ({ provider: 'demo', status: 'accepted' as const, providerMessageId: null }))
   await env.DB.prepare('UPDATE p_report_mail SET status=?,provider_message_id=? WHERE id=?').bind(result?.status === 'accepted' ? 'accepted' : 'uncertain', result?.providerMessageId ?? null, row.id).run()
  } catch { await env.DB.prepare("UPDATE p_report_mail SET status='uncertain' WHERE id=?").bind(row.id).run() }
 }
}

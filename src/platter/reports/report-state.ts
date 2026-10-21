import type { Bindings } from '../../auth.server'
import { capturesMail } from '../mail'
import type { Actor } from '../model'

// REPORT-005 read side for the owner: who may be named, each schedule and its recent runs.
export const installationZone = async (db: D1Database) => (await db.prepare('SELECT time_zone FROM p_installation_settings WHERE singleton=1').first<any>())?.time_zone ?? 'UTC'
export const activePeople = (db: D1Database) => db.prepare("SELECT id,email,display_name,role FROM oa_operators WHERE status='active' AND role IN ('owner','admin','member') ORDER BY role DESC,display_name").all<any>().then(r => r.results)

export async function reportState(env: Bindings, a: Actor) {
 if (!['owner','admin'].includes(a.role)) return {}
 const db = env.DB, people = await activePeople(db), everyone = (await db.prepare('SELECT id,email FROM oa_operators').all<any>()).results
 const schedules = (await db.prepare('SELECT * FROM p_report_schedules ORDER BY created_at,id').all<any>()).results
 const runs = (await db.prepare('SELECT * FROM p_report_runs ORDER BY ran_at DESC,id').all<any>()).results
 const mail = (await db.prepare('SELECT id,run_id,recipient,subject,status,created_at FROM p_report_mail ORDER BY created_at DESC,id').all<any>()).results
 return {
  timeZone: await installationZone(db),
  reportPeople: people.map(p => ({ email: p.email, name: p.display_name, role: p.role })),
  reportSchedules: schedules.map(s => ({ id: s.id, report: s.report, filters: s.filters, cadence: s.cadence, weekday: s.weekday, hour: s.hour, nextRunAt: s.next_run_at, lastRunAt: s.last_run_at,
   recipients: JSON.parse(s.recipients).map((id: string) => everyone.find(o => o.id === id)?.email ?? 'removed person'),
   runs: runs.filter(r => r.schedule_id === s.id).slice(0, 5).map(r => ({ ranAt: r.ran_at, count: r.row_count, skipped: JSON.parse(r.skipped), mail: mail.filter(m => m.run_id === r.id) })) })),
  reportOutbox: capturesMail(env) ? (await db.prepare('SELECT id,recipient,subject,body,status FROM p_report_mail ORDER BY created_at DESC LIMIT 30').all()).results : [],
 }
}


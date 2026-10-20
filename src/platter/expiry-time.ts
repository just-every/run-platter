import { need } from './model'
import { localHour } from './reports/zone'

/** The installation clock only advances from a real cron trigger, never an HTTP parameter. */
export async function currentTime(db: D1Database) {
 const clock = await db.prepare('SELECT observed_at FROM p_expiry_clock WHERE singleton=1').first<{ observed_at: number }>()
 return Math.max(Date.now(), clock?.observed_at ?? 0)
}

export function calendarDate(value: unknown) {
 const date = String(value ?? '')
 const parsed = new Date(date + 'T00:00:00Z')
 need(/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date, 'Enter an expiry date as YYYY-MM-DD')
 need(date >= '0100-01-01' && date <= '9998-12-31', 'Choose an expiry date between years 0100 and 9998')
 return date
}
export function localDate(at: number, zone: string) {
 const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at).map(p => [p.type, p.value]))
 return `${parts.year}-${parts.month}-${parts.day}`
}
export function addDays(date: string, days: number) {
 const at = new Date(date + 'T00:00:00Z')
 at.setUTCDate(at.getUTCDate() + days)
 return calendarDate(at.toISOString().slice(0, 10))
}
export function startOfDate(date: string, zone: string) {
 const [y, m, d] = calendarDate(date).split('-').map(Number)
 return localHour(y, m, d, 0, zone)
}
export function expiryDeadline(mode: string, days: number | null, date: string | null, sentAt: number | null, zone: string) {
 const expiresOn = mode === 'days' ? sentAt === null ? null : addDays(localDate(sentAt, zone), days!) : mode === 'date' ? date : null
 return { expiresOn, deadlineAt: expiresOn && sentAt !== null ? startOfDate(expiresOn, zone) : null }
}

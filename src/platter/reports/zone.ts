// Wall-clock arithmetic in an IANA time zone, for schedules set in the installation's own time.
const formats = new Map<string, Intl.DateTimeFormat>()
const minute = 60000, day = 86400000

export function validZone(zone: string) {
 try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return true } catch { return false }
}
function wall(at: number, zone: string) {
 let format = formats.get(zone)
 if (!format) formats.set(zone, format = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }))
 const p = Object.fromEntries(format.formatToParts(at).map(part => [part.type, Number(part.value)]))
 return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute }
}
const offset = (at: number, zone: string) => { const w = wall(at, zone); return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min) - Math.floor(at / minute) * minute }

/** The instant a local date and hour occur. A repeated hour (clocks back) takes its first
 * occurrence; a skipped hour (clocks forward) takes the first instant after the gap. */
export function localHour(y: number, m: number, d: number, hour: number, zone: string) {
 const local = Date.UTC(y, m - 1, d, hour)
 const candidates = [local - offset(local - day, zone), local - offset(local + day, zone)].sort((a, b) => a - b)
 const exact = candidates.filter(at => { const w = wall(at, zone); return w.d === new Date(local).getUTCDate() && w.h === hour && w.min === 0 })
 return exact[0] ?? candidates[1]
}

/** The first scheduled instant strictly after `after`: daily at `hour`, or weekly on `weekday` (0 is Sunday), in `zone`. */
export function nextRun(cadence: string, weekday: number | null, hour: number, after: number, zone: string) {
 const today = wall(after, zone)
 for (let i = -1; i <= 8; i++) {
  const date = new Date(Date.UTC(today.y, today.m - 1, today.d + i))
  if (cadence === 'weekly' && date.getUTCDay() !== weekday) continue
  const at = localHour(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, zone)
  if (at > after) return at
 }
 throw new Error('No scheduled time found')
}

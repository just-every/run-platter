// The demo's clock: every seeded event falls in the studio's working day (9:00 to 17:30 in its own zone) on the
// calendar day it lands on, keeps its order, and is never later than now. Each day's 24 hours map in order onto
// its working hours; the timeline ends at the latest working moment that has already happened.
const OPEN = 9 * 60, CLOSE = 17 * 60 + 30, DAY = 86400000

function wall(at: number, zone: string) {
  const part = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(at).map(p => [p.type, Number(p.value)]))
  return { y: part.year!, m: part.month!, d: part.day!, minutes: part.hour! * 60 + part.minute! + (part.second! + (at % 1000) / 1000) / 60 }
}
/** The instant a wall-clock time on a calendar day reads in the zone. */
function instant(y: number, m: number, d: number, minutes: number, zone: string): number {
  let guess = Date.UTC(y, m - 1, d) + minutes * 60000
  for (let i = 0; i < 2; i++) { const w = wall(guess, zone); guess += (Date.UTC(y, m - 1, d) + minutes * 60000) - (Date.UTC(w.y, w.m - 1, w.d) + w.minutes * 60000) }
  return Math.round(guess)
}

export function businessClock(now: number, zone: string) {
  const working = (at: number) => { const w = wall(at, zone); return instant(w.y, w.m, w.d, OPEN + w.minutes / 1440 * (CLOSE - OPEN), zone) }
  const today = wall(now, zone)
  // The point on the raw timeline whose working time is now (or the last close before now).
  const end = today.minutes >= CLOSE ? now
    : today.minutes < OPEN ? instant(today.y, today.m, today.d, 0, zone) - 1
    : instant(today.y, today.m, today.d, (today.minutes - OPEN) / (CLOSE - OPEN) * 1440, zone)
  return { ago: (days: number) => working(end - Math.round(days * DAY)) }
}

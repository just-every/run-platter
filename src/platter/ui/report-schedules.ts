import { date, escape, field, form, hidden, panel } from './shared'

// REPORT-005: export the filtered pipeline and email it to named people on a UTC schedule.
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const filterKeys = ['view','currency','bookedFrom','bookedTo','receivedFrom','receivedTo','q', 'owner', 'status', 'client', 'nextAction', 'dueFollowup', 'minValue', 'maxValue', 'minAge', 'maxAge', 'sort', 'direction']
const statusLabel: Record<string, string> = { local: 'Captured locally; no email was sent', pending: 'Queued', sending: 'Sending', accepted: 'Accepted by provider', uncertain: 'Provider result uncertain; not resent' }
const when = (s: any, zone: string) => `${s.cadence === 'weekly' ? `Weekly on ${days[s.weekday]}` : 'Daily'} at ${String(s.hour).padStart(2, '0')}:00 ${zone}`

export function reportSchedulesPanel(state: any, selection: URLSearchParams) {
  if (!['owner','admin'].includes(state.actor?.role)) return ''
  const filters = new URLSearchParams(); for (const key of filterKeys) { const v = selection.get(key); if (v) filters.set(key, v) }
  const query = filters.toString(),revenue=selection.get('view')==='recorded-revenue'
  const schedules = (state.reportSchedules ?? []).map((s: any) => `<li><article><h3>${escape(when(s, state.timeZone))}</h3><dl><dt>Filters</dt><dd>${escape(s.filters || 'All proposals')}</dd><dt>Recipients</dt><dd>${s.recipients.map(escape).join(', ')}</dd><dt>Next run</dt><dd>${date(s.nextRunAt)}</dd></dl>`
    + (s.runs.length ? `<ul aria-label="Recent report runs">${s.runs.map((r: any) => `<li>${date(r.ranAt)} · ${escape(r.count)} proposals${r.skipped.length ? ` · skipped: ${r.skipped.map(escape).join(', ')}` : ''}${r.mail.map((m: any) => `<br>${escape(m.recipient)}: ${escape(statusLabel[m.status] ?? m.status)}`).join('')}</li>`).join('')}</ul>` : '<p>No runs yet.</p>')
    + form('report.unschedule', '/app', hidden('id', s.id) + '<button>Stop this schedule</button>') + '</article></li>').join('')
  const people = (state.reportPeople ?? []).map((p: any) => `<label class="choice"><input type="checkbox" name="recipient:${escape(p.email)}" value="yes"><span>${escape(p.name)} · ${escape(p.email)}</span></label>`).join('')
  const create = form('report.schedule', '/app' + (query ? '?' + query : ''), hidden('filters', query)
    + `<div class="editor-grid"><label>Frequency<select name="cadence"><option value="weekly">Weekly</option><option value="daily">Daily</option></select></label>`
    + `<label>Day (weekly)<select name="weekday">${days.map((d, i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${d}</option>`).join('')}</select></label>`
    + `<label>Hour (${escape(state.timeZone)})<select name="hour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}"${h === 9 ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></label></div>`
    + `<fieldset><legend>Recipients</legend>${people}</fieldset><button>Schedule report email</button>`)
  return panel('Report export and email', `<p><a href="/api/platter/pipeline.csv${query ? '?' + escape(query) : ''}" download>Download ${revenue?'recorded revenue':'pipeline'} CSV</a> with the filters and sort shown above.</p>`
    + '<p>Scheduled email repeats the selected report view with these filters, built at the scheduled time in the installation time zone. Recipients are people in this installation; anyone no longer active is skipped. Platter records provider acceptance, not delivery.</p>'
    + form('report.time-zone', '/app' + (query ? '?' + query : ''), field('Installation time zone', 'timeZone', state.timeZone, 'required maxlength="64" autocomplete="off"') + '<p class="muted">An IANA name such as America/New_York. Schedule hours follow its daylight saving changes.</p><button>Save time zone</button>')
    + (schedules ? `<ul class="records" aria-label="Report schedules">${schedules}</ul>` : '<p>No report email is scheduled.</p>') + create)
}

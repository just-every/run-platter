// 02 · Six firms, seven clients: one row per proposal, a dotted five-stage track from first send to first payment.
import { firms, p1, p2, p3, p4, p5, p6, p7, type FirmId } from '../records'
import { check, cursor, dots, firmMark, head, note, sparks, t } from '../parts'

type Stage = { date: string; short: string; tag?: string; open?: boolean }
type Row = { firm: FirmId; client: string; place?: string; stages: [Stage, Stage, Stage, Stage]; pay: string; payDate: string; payShort: string; extra?: string; declined?: boolean }
const s = (date: string, tag?: string): Stage => ({ date, short: date.replace(/^\w+ /, ''), tag })
const open: Stage = { date: '—', short: '—', open: true }

const rows: Row[] = [
  { firm: 'fernhill', client: 'Bluebonnet Café', stages: [s('Tue Oct 6'), s('Tue Oct 6'), s('Wed Oct 7', 'rev 2'), s('Thu Oct 8')], pay: `${p1.deposit} deposit · ACH settled`, payDate: 'Tue Oct 13', payShort: `${p1.deposit} deposit · ACH` },
  { firm: 'magnolia', client: 'Raman–Whitley wedding', stages: [s('Tue Oct 6'), s('Wed Oct 7'), s('Thu Oct 8', `guests 120 → ${p2.guests}`), s('Fri Oct 9')], pay: `${p2.deposit} deposit · card`, payDate: 'Fri Oct 9', payShort: `${p2.deposit} deposit · card`, extra: 'priya' },
  { firm: 'evergreen', client: 'Honeysuckle Café', stages: [s('Tue Oct 6'), s('Tue Oct 6'), s('Thu Oct 8', 'follow-up'), s('Mon Oct 12')], pay: `${p3.retainer} first month · card`, payDate: 'Mon Oct 12', payShort: `${p3.retainer} first month · card` },
  { firm: 'evergreen', client: 'Northpoint Property Mgmt', stages: [{ ...s('Tue Oct 6'), tag: 'bounced, resent' }, s('Tue Oct 6'), s('Thu Oct 8', 'follow-up'), s('Thu Oct 15')], pay: `${p4.setup} setup · ACH settled`, payDate: 'Tue Oct 20', payShort: `${p4.setup} setup · ACH` },
  { firm: 'northlight', client: 'Sweet Ridge Bakery', stages: [s('Fri Oct 9'), s('Fri Oct 9'), open, s('Tue Oct 13')], pay: `${p5.deposit} deposit · card`, payDate: 'Tue Oct 13', payShort: `${p5.deposit} deposit · card` },
  { firm: 'brightwire', client: 'Lakeside Dental', place: 'Manchester → Laconia, NH', stages: [s('Fri Oct 9'), s('Mon Oct 12'), open, s('Wed Oct 14')], pay: '', payDate: 'Thu Oct 22', payShort: '', declined: true },
  { firm: 'junepark', client: 'Novak–Diaz wedding', stages: [s('Wed Oct 14'), s('Wed Oct 14'), s('Thu Oct 15', 'rev 2'), s('Fri Oct 16')], pay: `${p7.retainer} retainer · card`, payDate: 'Fri Oct 16', payShort: `${p7.retainer} retainer · card` },
]
const dot = (st: Stage) => st.open ? '<span class="trk-dot open" aria-hidden="true"></span>' : `<span class="trk-dot" aria-hidden="true">${check}</span>`

function stage(st: Stage, i: number, row: Row): string {
  const back = i === 2
  const label = st.open ? '<span class="trk-date">—</span>'
    : back ? `<span class="trk-tag">${t(st.tag!)}</span><span class="trk-date">${t(st.date)}</span>`
    : i === 0 && st.tag ? `<span class="trk-date">${t(st.date)}</span><span class="trk-sub">${t(st.tag)}</span>`
    : `<span class="trk-date">${t(st.date)}</span>`
  const short = st.open ? '—' : t(st.short)
  return `<li class="trk-stage${back ? ' back' : ''}">${dot(st)}<span class="trk-long">${label}</span><span class="trk-short${back && !st.open ? ' hl' : ''}">${short}</span>${row.extra === 'priya' && back ? cursor('Priya', 'client', 'client', 'trk-cursor') : ''}</li>`
}
function payment(row: Row): string {
  if (row.declined) return `<li class="trk-stage pay declined">${dot(row.stages[0])}<span class="trk-long"><span class="pill red">${t('Declined Mon Oct 19')}</span><span class="trk-arrow" aria-hidden="true">→</span><span class="pill sage">${t('ACH settled Thu Oct 22')}${' '}✓</span></span><span class="trk-short">Oct${' '}22</span></li>`
  return `<li class="trk-stage pay">${dot(row.stages[0])}<span class="trk-long"><span class="trk-date">${t(row.pay)}</span><span class="trk-date">${t(row.payDate)}${' '}✓</span></span><span class="trk-short">${t(row.payDate.replace(/^\w+ /, ''))}</span></li>`
}
const rowHtml = (row: Row) => {
  const f = firms[row.firm]
  const payLine = row.declined
    ? `<p class="fr-pay"><span class="pill red">${t('Declined Oct 19')}</span><span class="pill sage">${t('ACH settled Oct 22')}${' '}✓</span></p>`
    : `<p class="fr-pay">${t(row.payShort)}${' '}✓</p>`
  return `<li class="fr-row card-m">${firmMark(row.firm, 52)}<div class="fr-name"><h3><span class="fr-firm">${t(f.name)}</span>${' '}<span class="fr-arrow">→</span> <span class="fr-client">${t(row.client)}</span></h3><p class="fr-place">${t(row.place ?? f.place)}</p></div><ol class="trk" aria-label="${f.name} to ${row.client}: sent ${row.stages[0].date}, signed ${row.stages[3].date}, first payment ${row.payDate}">${row.stages.map((st, i) => stage(st, i, row)).join('')}${payment(row)}</ol>${payLine}</li>`
}
const STAGES = ['Sent', 'Read', 'Back and forth', 'Signed', 'First payment']

export const firmsSection = (): string => `<section id="firms" class="sec firms">
${head(['Six firms', 'Seven clients', 'Tue Oct 6 – Thu Oct 22'], 'Seven proposals.', 'Every client said yes.', t('Six small firms in five states, two weeks in October. Each row is one firm’s own Platter, from first send to first payment.'), 'center')}
${sparks('fr-sparks')}
<div class="fr-board">
<div class="fr-head"><p class="fr-note">${note('all seven by Fri Oct 16!')}<svg class="hand-arrow" viewBox="0 0 30 40" aria-hidden="true"><path d="M16 2c-4 10-5 20-2 33M7 27l7 9 8-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></p>
<ol class="fr-stages" aria-hidden="true">${STAGES.map(x => `<li>${x}</li>`).join('')}</ol></div>
<p class="fr-legend">${dots(STAGES)}</p>
<ol class="fr-rows">${rows.map(rowHtml).join('\n')}</ol>
</div>
<p class="fr-total pill sage big">${dots([`${t('7 of 7 signed by Fri Oct 16')} ✓`, `${t('7 of 7 first payments in by Thu Oct 22')} ✓`], '', true)}</p>
</section>`

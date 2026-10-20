// 03 · Draft: Brightwire IT → Lakeside Dental, Fri Oct 9. The Zoom call, the agent's cited draft and the Gauge check.
import { p6 } from '../records'
import { cursor, dots, head, line, ok, sparks, t } from '../parts'

const cite = (time: string) => `<span class="cite">${time}</span>`
// Margin bars on one linear 0–100% scale at every width; the 35% floor is a tick on each.
const bar = (value: number, kind: 'amber' | 'sage', label: string) => `<figure class="gauge-bar ${kind}"><figcaption>${label}</figcaption><svg viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="expected margin ${value}% against a 35% floor"><rect width="100" height="8" rx="4" class="track"/><rect width="${value}" height="8" rx="4" class="fill"/><line x1="35" x2="35" y1="-2" y2="10" class="floor"/></svg><span class="floor-label" style="left:35%">35% floor</span></figure>`

const quotes = [
  ['04:12', 'Dr. Alvarez', 'The server is from 2017, and the X-ray software freezes every afternoon.'],
  ['11:48', 'Kim', 'We close Saturdays, so the move has to happen then.'],
  ['19:05', 'Kim', 'Backups go on a USB drive I take home on Fridays.'],
  ['27:30', 'Kim', 'Can you do our front-desk phones too?'],
]

export const draftSection = (): string => `<section id="draft" class="sec draft">
${head(['Draft', 'Brightwire IT → Lakeside Dental', 'Fri Oct 9'], 'A 40-minute call.', 'A priced draft by 10:52.', t('The agent drafted Lakeside’s proposal from the Zoom call and Brightwire’s catalog, then checked it against Brightwire’s last five installs. Owen raised the hours and sent it.'), 'split')}
<div class="dr-flow">
<article class="card dr-zoom tilt-l"><h3 class="serif">${line('Zoom · Fri Oct 9, 10:00–10:40 am')}</h3><p class="sub">Owen Brady, Dr. Elena Alvarez, Kim Russo</p>
<ul class="dr-quotes">${quotes.map(([time, who, said]) => `<li><span class="mono">[${time}]</span><span><b>${who}:</b> ‘${t(said)}’</span></li>`).join('')}</ul></article>
<span class="dr-link" aria-hidden="true">${cite('04:12')}</span>
<article class="card dr-draft"><h3 class="serif">${line('Drafted by the agent · 10:52 am')}</h3><p class="sub">two packages from Brightwire’s catalog</p>
<h4 class="serif">${line('Package A · Server setup')}</h4>
<ul class="dr-lines">
${[['On-site install and data migration', '12 h × $150.00 = $1,800.00', '11:48'], ['Tower server, mirrored storage, configured', '1 × $2,600.00', '04:12'], ['Backup appliance and nightly off-site copy', '1 × $1,000.00', '19:05']].map(([what, sum, at]) => `<li>${dots([t(what), `${t(sum)} ${cite(at)}`])}</li>`).join('')}
</ul>
<p class="dr-total">Total ${p6.draft}</p>
<h4 class="serif">${line('Package B · Server setup + Managed care')}</h4>
<p>${t('Package A + $390.00/mo × 12')}</p>
<p class="dr-out">${dots([`${t('Front-desk phones')} ${cite('27:30')}`, t('not in your catalog'), t('left out')], 'dl-grey')}</p>
<p class="dr-terms">${line('30% deposit charged on hardware order day · balance on install, net 15')}</p></article>
<span class="dr-link" aria-hidden="true">${cite('11:48')}</span>
<article class="card dr-gauge tilt-r"><h3 class="serif">Checked against Gauge</h3>
<p class="sub">${line('5 server setups since March: 15.5, 16.0, 17.5, 15.0, 17.0 h on site · average 16.2 h')}</p>
<p class="sub">${line('blended cost $62.00/h · server cost $2,180.00 · backup appliance cost $640.00 · margin floor 35%')}</p>
${bar(29, 'amber', `<b>${t('At 12 h quoted:')}</b> ${line('expected margin 29% · below your floor')}`)}
${bar(36, 'sage', `<b>${t('At 16 h:')}</b> ${line(`${p6.priced} · expected margin 36%`)}`)}
<p class="dr-free">${ok('Dev Patel and Luis Ortiz free Sat Oct 31')}</p>
<p class="dr-log">${line(`11:20 am · Owen applied 16 h · install $2,400.00 · Package A ${p6.priced}`)}</p>
<p class="dr-log">${line('11:24 am · sent by Owen ✓')}</p>
${sparks('dr-sparks')}${cursor('Owen', 'Brightwire', 'firm', 'dr-cursor')}</article>
</div>
</section>`

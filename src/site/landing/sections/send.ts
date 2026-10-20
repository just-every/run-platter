// 05 · Send and follow up: Evergreen Digital → Northpoint Property Mgmt and Honeysuckle Café, Tue Oct 6 – Thu Oct 15.
import { mail, p3, p4 } from '../records'
import { cursor, dots, head, line, sparks, t, tn } from '../parts'

// Reading bars share one scale: 4:10 (250 s), the longest read, fills the track.
const SCALE = 250
const secs = (m: string) => { const [a, b] = m.split(':').map(Number); return a * 60 + b }
const bars = (rows: [string, string][]) => `<div class="rd"><h4>Read Tue Oct 6</h4><ul>${rows.map(([what, time]) => `<li><span class="rd-what">${t(what)}</span><svg class="rd-bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="8" rx="4" class="track"/><rect width="${(secs(time) / SCALE * 100).toFixed(1)}" height="8" rx="4" class="fill"/></svg><span class="rd-time">${time}</span></li>`).join('')}</ul></div>`
// each delivery row: its time, then what happened
const delivery = (rows: { text: string; cls?: string }[]) => `<ol class="dlv">${rows.map(r => {
  const [when, ...rest] = r.text.split(' · ')
  // a mailbox may break after its @ on a phone
  const body = `<span class="dlv-when">${t(when)}</span>${dots(rest.map(t)).replace(/@/g, '@<wbr>')}`
  return `<li${r.cls ? ` class="${r.cls}"` : ''}><span class="dlv-arrow" aria-hidden="true">↓</span>${r.cls === 'opened' ? `<span class="pill sage">${body}</span>` : `<span class="dlv-body">${body}</span>`}</li>`
}).join('')}</ol>`

const northpoint = `<article class="card sd-client sd-n"><div class="sd-a"><h3 class="serif">${line('Northpoint · leasing site and local search')}</h3>
<p class="sub">${t(`Launch ${p4.setup}, or Launch + Growth retainer ${p4.setup} + ${p4.monthly}/mo × 12`)}</p>
<div class="sd-top">${delivery([
  { text: `Tue Oct 6, 9:05 am · sent from ${mail.alicia}` },
  { text: `9:06 · bounced: no such mailbox, ${mail.bounced} · follow-up opened`, cls: 'bounce' },
  { text: `9:21 · resent to ${mail.tom}, the address on Tom’s HubSpot contact · delivered` },
  { text: '10:47 am · opened · desktop · Dallas, TX ✓', cls: 'opened' },
])}
${bars([['Parkside Lofts case study', '2:40'], ['Scope and timeline', '1:05'], ['Pricing', '0:20']])}</div></div>
<div class="sd-note tom-note card-s"><p>${t('Hi Tom, you spent time on the Parkside Lofts case study. Your plan starts with the same first 90 days. Want a 15-minute walk through pricing?')}</p><p class="meta">${t('edited 1 line, sent by Alicia 8:41 am')}</p></div>
<div class="sd-chips"><p class="pill line">${line('Mon Oct 12, 6:15 pm · opened on phone · Dallas, TX · 3 min on pricing')}</p>
<p class="pill sage">${line(`Thu Oct 15, 10:20 am · signed · Launch + Growth retainer · first year ${p4.firstYear} ✓`)}</p></div></article>`

const honeysuckle = `<article class="card sd-client sd-h"><div class="sd-a"><h3 class="serif">${line('Honeysuckle Café · social')}</h3>
<p class="sub">${t(`Launch kit $1,800.00, or Social retainer ${p3.retainer}/mo × 6`)}</p>
<div class="sd-top">${delivery([
  { text: 'Tue Oct 6, 9:30 am · sent · delivered' },
  { text: '7:55 pm · opened · phone · Dallas, TX ✓', cls: 'opened' },
])}
${bars([['Social retainer option', '4:10'], ['Pricing', '1:30'], ['Launch kit', '0:50']])}</div></div>
<div class="sd-note grace-note card-s"><p>${t('Hi Grace, you spent time on the retainer option. Here is month one: 12 posts, 4 reels and a menu shoot.')}</p><p class="meta">${t('sent by Alicia 8:44 am')}</p>${cursor('Alicia', 'Evergreen', 'firm', 'sd-cursor')}</div>
<div class="sd-chips"><p class="pill sage">${line(`Mon Oct 12, 2:05 pm · signed · Social retainer ✓ · first month ${p3.retainer} paid by card`)}</p></div></article>`

const agent = `<div class="sd-agent" role="group" aria-label="Agent: Alicia’s follow-up queue"><div class="sd-agent-head"><p class="meta">${t('Agent · Thu Oct 8, 8:30 am')}</p><h3 class="serif">${t('Alicia’s follow-up queue')}</h3>
<p>2 proposals read, not signed</p><p>2 follow-ups drafted from what each client read</p></div>
<ul class="sd-queue"><li class="tom">${line('→ Tom · Northpoint · drafted')}</li><li class="grace">${line('→ Grace · Honeysuckle · drafted')}</li></ul></div>`

export const sendSection = (): string => `<section id="send" class="sec send">
${head(['Send & follow up', 'Evergreen Digital → Northpoint Property Mgmt and Honeysuckle Café', 'Tue Oct 6 – Thu Oct 15'], 'Read section by section.', 'Followed up on what they read.', t('Alicia sent both proposals from her own Outlook. Platter showed what each client read, and on Thursday the agent drafted two different notes.'), 'center')}
<div class="sd-grid">
<h3 class="sd-col-head n serif">${sparks('sd-spark-l')}${tn('Evergreen Digital → Northpoint Property Mgmt')}</h3>
<h3 class="sd-col-head h serif">${tn('Evergreen Digital → Honeysuckle Café')}${sparks('sd-spark-r')}</h3>
${northpoint}${agent}${honeysuckle}
<span class="sd-tie tom" aria-hidden="true"></span><span class="sd-tie grace" aria-hidden="true"></span>
</div>
</section>`

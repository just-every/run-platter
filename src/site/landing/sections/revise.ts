// 06 · Questions and revisions: Fernhill → Bluebonnet Café (Wed Oct 7) and June Park → the Novak–Diaz wedding (Thu Oct 15).
import { p1, p7 } from '../records'
import { check, cursor, head, initials, line, sparks, t } from '../parts'

const hl = (text: string) => `<mark>${t(text)}</mark>`
const change = (from: string, to: string) => `<li>${t(from)}${' '}→ ${hl(to)}</li>`
const arrow = '<span class="rv-arrow" aria-hidden="true"></span>'
const comment = (tag: string, who: string, init: string, when: string, body: string, cls = '') => `<article class="card rv-c ${cls}"><span class="pill grey rv-tag">${tag}</span><div class="rv-msg">${initials(init, cls === 'client' ? 'rose' : 'lilac')}<div><p class="rv-who">${line(`${who} · ${when}`)}</p><p>${t(body)}</p></div></div></article>`
const signed = (text: string) => `<p class="rv-signed card-s">${sparks('rv-spark')}<span class="tick big" aria-hidden="true">${check}</span><span>${line(text)}</span></p>`

const fernhill = `<div class="rv-row"><h3 class="serif rv-title">${line('Fernhill Design Studio → Bluebonnet Café · Austin, TX')}</h3><div class="rv-steps">
${comment('Timeline', 'Rosa Mendez', 'RM', 'Wed Oct 7, 9:12 am CT', 'Could the boards be up by Oct 30? We relaunch the fall menu Mon Nov 2. And we’ll need two.', 'client')}${arrow}
<article class="card rv-c rv-reply"><div class="rv-msg">${initials('BW', 'lilac')}<div><p class="rv-who">${line('Ben Whitfield · 11:40 am')}</p><p>${t('Yes. Two boards, installed Fri Oct 30. Rev 2 is on its way.')}</p></div></div>${cursor('Ben', 'Fernhill', 'firm', 'rv-cursor')}</article>${arrow}
<article class="card rv-rev"><h4 class="serif">${t('Rev 1 → Rev 2')}</h4><ul>${change(`Menu boards 1 × ${p1.board}`, `2 × ${p1.board} = ${p1.boards}`)}${change('Boards installed Fri Nov 13', 'Fri Oct 30')}${change(`Austin 8.25% tax ${p1.rev1Tax}`, p1.tax)}${change(`Better total ${p1.rev1Total}`, p1.total)}${change(`50% deposit ${p1.rev1Deposit}`, p1.deposit)}</ul><p class="meta">${line('11:48 am · rev 2 sent by Ben · rev 1 link retired')}</p></article>${arrow}
${signed('Thu Oct 8, 8:05 am · Better + 2 menu boards · signed ✓ · deposit by ACH')}
</div></div>`

const junepark = `<div class="rv-row"><h3 class="serif rv-title">${line('June Park Photography → Novak–Diaz wedding · Portland, OR')}</h3><p class="pill grey rv-sent">${line('Rev 1 sent Wed Oct 14, 4:00 pm PT · read 9:10 pm · 2 min on pricing')}</p><div class="rv-steps">
${comment('Coverage', 'Ellie Novak', 'EN', 'Thu Oct 15, 7:30 am PT', 'Could you add drone shots over the St. Johns Bridge?', 'client')}${arrow}
<article class="card rv-c rv-reply"><div class="rv-msg">${initials('JP', 'lilac')}<div><p class="rv-who">${line('June Park · 9:58 am')}</p><p>${t('Yes. Added as an add-on, 30 minutes of drone coverage.')}</p></div></div></article>${arrow}
<article class="card rv-rev"><h4 class="serif">${t('Rev 1 → Rev 2')}</h4><ul><li>${hl(`+ Drone add-on · 30 min · ${p7.drone}`)}</li>${change(`Total ${p7.rev1}`, p7.total)}<li>Oregon sales tax $0.00</li><li>${t(`Booking retainer ${p7.retainer}, unchanged`)}</li></ul><p class="meta">${line('10:05 am · rev 2 sent by June · rev 1 link retired')}</p></article>${arrow}
${signed(`Fri Oct 16, 12:20 pm · signed on her phone ✓ · retainer ${p7.retainer} paid by card`)}
</div></div>`

export const reviseSection = (): string => `<section id="revise" class="sec revise">
${head(['Questions & revisions', 'Fernhill → Bluebonnet Café, Wed Oct 7', 'June Park → Novak–Diaz wedding, Thu Oct 15'], 'Asked on the page.', 'Rev 2 the same day.', t('Clients ask right on the proposal. The firm answers, sends rev 2 with every change marked, and the old link stops working.'), 'split')}
${fernhill}${junepark}
</section>`

// 10 · Interlude: Sweet Ridge Bakery's back kitchen at dawn, Tue Oct 20. 11 · Change order: Northlight → Sweet Ridge.
import { p5 } from '../records'
import { check, cursor, head, line, note, pill, t } from '../parts'
import { plate } from '../plates'
import { maya } from '../signatures'
import { drawn } from './sign'

export const interludeSection = (): string => `<section class="interlude" aria-label="Tue Oct 20: Northlight Video filming at Sweet Ridge Bakery">
<div class="il-scene">${plate('interlude', 'Sweet Ridge Bakery’s back kitchen at dawn: Maya slides loaves from the deck oven while Northlight’s crew films her from a slider, with a boom mic and one soft box.', '(min-width: 1440px) 1320px, calc(100vw - 32px)')}
<p class="il-tag card-s">${line('Tue Oct 20 · Northlight Video at Sweet Ridge Bakery · shoot day ✓ · 3 edits due Fri Oct 30', '', true)}</p></div>
</section>`

const done = (text: string) => `<li><span class="tick" aria-hidden="true">${check}</span><span>${line(text)}</span></li>`

export const changeSection = (): string => `<section id="change" class="sec change">
<article class="ch-agreement" aria-label="Signed agreement"><h3 class="serif">${line('Agreement · signed Tue Oct 13')}</h3>
<p class="ch-line">${t('Shoot day $3,200.00')} <span class="nw">+ <span class="ringed"><span>3 edits</span></span></span> <span class="nw">${t(`× ${p5.edit} = ${p5.total}`)}</span></p>
<p class="ch-line">${t('Included: 60 s brand film, 30 s ad, 15 s social cut')}</p>
<p class="ch-line">${t(`Additional edits ${p5.edit} each`)}</p><hr>
<p class="ch-line">${t('Delivery: Fri Oct 30')}</p><p class="ch-line">${t('Payment: 50% deposit, balance on delivery')}</p>
<div class="ch-sign">${drawn(maya, 'Signature: Maya Delgado', 'ch-sig')}<p>${line('Maya Delgado · Sweet Ridge Bakery')}</p></div></article>
<div class="ch-right">${head(['Change order', 'Northlight Video → Sweet Ridge Bakery', 'Tue Oct 20 – Wed Oct 21'], 'A fourth cut.', 'Its own change order.', t('After the shoot, Maya asked for a holiday cut. The agent priced it against the signed scope as its own change order, Jess sent it, and the bakery paid that afternoon.'))}
<ol class="ch-asks"><li class="card-s">${line('Tue Oct 20, 2:40 pm · Maya: ‘Could we also get a 15-second holiday version?’')}</li><li class="card-s">${line('3:05 pm · Asana · Edit 4, holiday 15 s · added by Theo')}</li></ol>
<article class="card ch-co"><div class="ch-co-head"><div><h3 class="serif">Change order CO-1</h3><p class="sub">${t('linked to the agreement of Tue Oct 13')}</p></div>${pill(`${t('Paid Wed Oct 21')} ✓`, 'sage')}</div>
<p class="ch-agent"><b>${t('Agent, Wed Oct 21, 8:15 am:')}</b> ${line(`Edit 4 is beyond the 3 edits signed · drafted 1 × ${p5.edit} = ${p5.edit} · delivered with the others Fri Oct 30`)}</p>
<div class="ch-foot"><ul class="ch-done">${done('9:02 am · sent by Jess')}${done(`1:30 pm · Maya signed and paid ${p5.edit} by card`)}</ul>
<p class="ch-note">${note('original agreement unchanged · same SHA-256')}</p></div>${cursor('Maya', 'client', 'client', 'ch-cursor')}</article></div>
<span class="ch-tie" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M1 3C30 13 62 9 78 32S94 92 99 98"/></svg></span>
<p class="sec-foot">${line('Asana project made at signing Tue Oct 13 · one task per accepted line: Shoot day, Edits × 3 · Edit 4 task added by Theo Tue Oct 20')}</p>
</section>`

// 13 · Closing: Bluebonnet Café's front at 4:30 pm on Fri Oct 30, three firm cards over its foot, then the call to run it.
import { firmMark, heading, line, t, check } from '../parts'
import { plate } from '../plates'

export const closingSection = (): string => `<section class="closing" aria-label="Signed and paid. On the calendar.">
<div class="cl-scene">${plate('closing', 'Bluebonnet Café at 4:30 pm on Fri Oct 30: a blue awning under the painted sign, the two new fall menu boards in the window, Rosa behind the counter, a pot of hibiscus by the door, and Ben in a studio apron carrying the empty board crate.', '(min-width: 1440px) 1320px, (max-width: 760px) 200vw, 100vw')}
<ul class="cl-cards">
<li class="card cl-card">${firmMark('fernhill', 44)}<p><b>Bluebonnet Café</b><br>${t('2 menu boards up Fri Oct 30 ✓')}</p></li>
<li class="card cl-card"><span class="tick big" aria-hidden="true">${check}</span><p>${line('7 proposals · 7 signed', 'b')}<br>${t('7 first payments in ✓')}</p></li>
<li class="card cl-card"><span class="cl-marks">${firmMark('junepark', 40)}${firmMark('magnolia', 40)}</span><p>${line('Next · Sat Nov 7 Novak–Diaz wedding')}<br>${t('Sat Nov 14 Raman–Whitley wedding')}</p></li>
</ul></div>
<div class="cl-copy">${heading('Signed and paid.', 'On the calendar.')}
<p class="cl-free">100% free and open source. MIT licensed.</p>
<p class="cl-actions"><a class="cta" href="/run">Run Platter →</a><a class="cl-docs" href="/docs">Read the docs</a></p></div>
</section>`

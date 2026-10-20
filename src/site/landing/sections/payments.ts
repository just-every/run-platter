// 09 · Payments: Brightwire IT → Lakeside Dental, Mon Oct 19 – Thu Oct 22. The page's one failure and its recovery.
import { p6 } from '../records'
import { check, cursor, head, line, ok, t } from '../parts'

// each event's lines as drawn, centred under its dot
const sep = (s: string) => t(s).replace(/ · /g, '\u00a0·\u00a0')
const event = (cls: string, lines: string[], tag = '') => `<li class="ev ${cls}"><span class="ev-dot" aria-hidden="true">${cls === 'done' ? check : ''}</span>${tag}<span class="ev-text">${lines.map(l => `<span>${sep(l)}</span>`).join('')}</span></li>`
const evidence = (k: string, v: string) => `<div><dt class="caps">${k}</dt><dd>${line(v)}</dd></div>`

export const paymentsSection = (): string => `<section id="payments" class="sec payments">
${head(['Payments', 'Brightwire IT → Lakeside Dental', 'Mon Oct 19 – Thu Oct 22'], 'Card declined at 9:00.', 'One invoice, paid once.', t('The deposit card was over its limit. The agent found why, drafted Kim a bank-transfer link for the same invoice, and Owen sent it.'), 'center')}
<div class="py-col">
<ol class="card py-rail">${event('fail', ['Mon Oct 19, 9:00 am ET · deposit', `${p6.deposit} · Visa ${p6.card} · over the card’s limit`], '<span class="pill red ev-tag">Declined</span>')}${event('', ['9:01 · Kim and Owen told,', 'with the reason'])}${event('', ['11:05 am · Kim paid by ACH', 'from the link · bank verified · processing'])}${event('done', ['Thu Oct 22, 9:30 am', 'succeeded ✓'])}</ol>
<span class="py-down" aria-hidden="true"></span>
<article class="card py-agent"><h3 class="serif">${line('Agent · Mon Oct 19, 9:04 am · Lakeside Dental')}</h3>
<dl class="py-ev">${evidence('Scheduled', `30% deposit ${p6.deposit}, due today (hardware order day)`)}${evidence('Stripe', 'declined, card over its limit · no other payment on this amount')}${evidence('QuickBooks', `invoice ${p6.invoice} · ${p6.deposit} · open since Wed Oct 14`)}</dl>
<p class="py-draft">${t(`Draft to Kim: ‘The card on file was declined for being over its limit. You can pay invoice ${p6.invoice} by bank transfer from this link.’`)}</p>
<p class="py-sent"><span class="pill sage">${ok('sent by Owen 9:20 am')}</span>${cursor('Owen', 'Brightwire', 'firm', 'py-cursor')}</p></article>
<span class="py-down" aria-hidden="true"></span>
<article class="card py-inv"><div><h3 class="serif">Invoice ${p6.invoice}</h3><p class="serif py-inv-sub">${line(`Lakeside Dental · deposit · ${p6.deposit}`)}</p><p class="meta">${line('attempts: card declined Mon Oct 19 · ACH Mon Oct 19 → settled Thu Oct 22')}</p></div><span class="pill sage py-paid">${ok('Paid')}</span></article>
<ul class="py-chips"><li class="pill sage">${line('Reconciled · 1 amount · 1 invoice · 2 attempts · 0 mismatches ✓')}</li><li class="pill grey">${line('Thu Oct 22, 10:15 am · Dev ordered the server · install Sat Oct 31')}</li></ul>
</div>
</section>`

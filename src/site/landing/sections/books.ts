// 08 · Books: Fernhill → Bluebonnet Café, Thu Oct 8 – Wed Oct 14. The HubSpot deal, Stripe clearing in QuickBooks, the bank line.
import { p1 } from '../records'
import { eyebrow, heading, line, ok, sparks, t } from '../parts'

const amount = (label: string, value: string) => `<li><span>${t(label)}</span><span class="num">${value}</span></li>`

export const booksSection = (): string => `<section id="books" class="sec books">
<header class="sec-head bk-copy">${eyebrow(['Books', 'Fernhill → Bluebonnet Café', 'Thu Oct 8 – Wed Oct 14'])}${heading('Paid in Stripe.', 'Matched in QuickBooks.')}
<p class="lede">${t('Rosa’s deposit settled on Tuesday. The HubSpot deal, invoice 2041 and Wednesday’s payout all agree, Stripe’s fee included.')}</p></header>
<article class="card bk-deal"><p class="caps">HubSpot deal</p><h3 class="serif">${line('Bluebonnet Café · brand refresh')}</h3><p class="pill sage">${t('Closed won Thu Oct 8')}</p>
<p class="bk-big serif">${p1.total}</p><ul class="bk-lines">${amount('Better package', p1.better)}${amount(`Menu boards 2 × ${p1.board}`, p1.boards)}${amount('Austin 8.25% tax', p1.tax)}</ul>
<p class="meta">${line('sent Tue Oct 6 · viewed Tue Oct 6 · signed Thu Oct 8 · paid Tue Oct 13')}</p></article>
<article class="card bk-ledger">${sparks('bk-sparks')}<h3 class="serif bk-title">Stripe clearing</h3><p class="caps">QuickBooks Online</p>
<div class="bk-t"><div class="bk-in"><h4 class="serif">In</h4><p>${line(`Tue Oct 13 · Rosa Mendez · ACH · ${p1.deposit} → invoice ${p1.invoice}`)}</p>
<p class="bk-inv card-s">${line(`Invoice ${p1.invoice} · deposit 50% · ${p1.deposit} · created Thu Oct 8 · paid Tue Oct 13 ✓`)}</p></div>
<div class="bk-out"><h4 class="serif">Out</h4><ul><li><span>${t('Stripe fee → Bank fees')}</span><span class="num">${p1.fee}</span></li><li><span>${line(`Wed Oct 14 · payout → Business checking ${p1.account}`)}</span><span class="num">${p1.payout}</span></li></ul></div></div>
<p class="bk-bal"><span class="serif">Balance</span><span class="pill sage">${ok('$0.00')}</span></p></article>
<p class="card-s bk-half">${line(`Second half ${p1.deposit} · invoiced Fri Oct 30 when the boards are up · net 15, due Sat Nov 14`)}</p>
<p class="card bk-bank">${line(`Wed Oct 14 · Business checking ${p1.account} · Stripe payout ${p1.payout} · matched ✓`)}</p>
</section>`

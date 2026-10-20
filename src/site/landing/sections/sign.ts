// 07 · Sign: Brightwire IT → Lakeside Dental, Wed Oct 14. Two client signers in order, and the certificate of completion.
import { p6 } from '../records'
import { eyebrow, line, note, t } from '../parts'
import { elena } from '../signatures'

export const drawn = (sig: { viewBox: string; transform: string; d: string }, label: string, cls: string): string =>
  `<svg class="sig-drawn ${cls}" viewBox="${sig.viewBox}" role="img" aria-label="${label}"><g transform="${sig.transform}"><path d="${sig.d}" fill="currentColor"/></g></svg>`

const signer = (name: string, rows: string[], sig: string) => `<div class="ct-signer"><h4 class="serif">${name}</h4>${sig}<ul>${rows.map(r => `<li>${line(r)}</li>`).join('')}</ul></div>`

export const signSection = (): string => `<section id="sign" class="sec sign">
<div class="sg-copy">${eyebrow(['Sign', 'Brightwire IT → Lakeside Dental', 'Wed Oct 14'])}
<h2 class="display"><span>Dr. Alvarez, then Kim.</span> <span class="grad">Signed in order, with proof.</span></h2>
<p class="lede">${t('Each signer opened their own link and entered a mailbox code. The signed PDF and its certificate reached everyone, and the deal closed in Salesforce.')}</p>
<ol class="sg-ladder"><li class="card-s"><span class="sg-n">1</span>${line('Dr. Elena Alvarez · signer · 12:35 pm ✓')}</li><li class="card-s"><span class="sg-n">2</span>${line('Kim Russo, office manager · signer · 4:46 pm ✓')}</li></ol>
<p class="sg-order">Kim could sign only after Dr. Alvarez</p>
<ul class="sg-chips"><li class="pill sage">${line('4:46 pm · signed PDF and certificate emailed to Dr. Alvarez, Kim Russo and Owen Brady ✓')}</li><li class="pill sage">${line('Filed to Google Drive · Clients / Lakeside Dental ✓')}</li><li class="pill sage">${line(`Salesforce · Lakeside Dental, Server setup · Closed Won ${p6.priced} ✓`)}</li></ul></div>
<article class="sg-cert" aria-label="Certificate of completion"><div class="ct-inner"><h3 class="serif ct-title">Certificate of completion</h3>
<p>${line('Brightwire IT → Lakeside Dental · Server setup · rev 1')}</p><p>${t('Completed Wed Oct 14, 4:46 pm ET')}</p><p>${t('Document SHA-256 9b2e…4f70')}</p>
${signer('Dr. Elena Alvarez', ['Verified by mailbox code 12:33 pm', 'Read the electronic records disclosure and consented 12:34 pm', 'Drawn signature 12:35 pm', 'Laconia, NH · iPhone, Safari'], drawn(elena, 'Drawn signature: Elena Alvarez', 'ct-sig'))}
<p class="ct-note">${note('signed between patients')}<svg class="hand-arrow" viewBox="0 0 60 30" aria-hidden="true"><path d="M58 6C42 18 24 22 4 22M12 14l-8 8 9 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></p>
${signer('Kim Russo', ['Verified by mailbox code 4:43 pm', 'Consented 4:44 pm', 'Typed signature 4:46 pm', 'Laconia, NH · Windows, Edge'], '<p class="sig-typed ct-sig" aria-label="Typed signature: Kim Russo">Kim Russo</p>')}
</div></article>
<p class="sec-foot">${line(`4:46 pm · QuickBooks deposit invoice ${p6.invoice}, ${p6.deposit}, created · 4:48 pm · Kim saved the practice card for the deposit, charged Mon Oct 19`)}</p>
</section>`

// 04 · Build: Magnolia & Thyme → the Raman–Whitley wedding, Mon Oct 5 – Fri Oct 9. The client page and its six sources.
import { p2 } from '../records'
import { cursor, dots, head, line, note, ok, sparks, t } from '../parts'

const NB = ' '

const source = (side: 'l' | 'r', title: string, body: string, cls = '') => `<article class="card bd-src ${side}${cls ? ' ' + cls : ''}">${sparks('bd-spark')}<h3 class="serif">${title}</h3>${body}</article>`
const kv = (rows: [string, string][]) => `<dl class="bd-kv">${rows.map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`
const swatch = (name: string, hex: string) => `<span class="swatch" style="--c:${hex}" role="img" aria-label="${name}"></span>`

const left = [
  source('l', dots(['Template', 'Wedding', `plated dinner${NB}·${NB}v4`]), `<p>${t('blocks, payment terms (30% deposit, balance 8 days before), reminders 2, 5 and 9 days, expires 14 days after sending')}</p>`, 'tilt-l'),
  source('l', 'Content library', kv([['Team', t('Hannah Brooks, chef-owner')], ['Tasting gallery', t('12 photos')], ['Terms', line('weddings v3 · locked')]])),
  source('l', 'Brand kit', `<p>${t('Magnolia & Thyme logo, fonts and colors')}</p><p class="swatches">${swatch('deep green', '#1F4A36')}${swatch('blush', '#EBC3C8')}${swatch('gold', '#C9A04A')}</p>`, 'tilt-l'),
]
const right = [
  source('r', 'Catalog', kv([['MT-WED-PL', line(`Wedding package, plated · per guest · ${p2.perGuest}`)], ['MT-LNT', line('Late-night taco bar · per guest · $9.00')], ['MT-TST', line('Champagne toast · per guest · $6.00')]]), 'tilt-r'),
  source('r', 'Fields', kv([['{client.first_name}', t('→ Priya')], ['{event.date}', t('→ Sat Nov 14, 2026')], ['{event.venue}', t('→ backyard, Wilmington, DE')]])),
  source('r', 'Guest count', `<p class="struck">${line(`sent Tue Oct 6 with 120 · ${p2.sent120} · deposit ${p2.deposit120}`)}</p><p class="hl-block">${line(`→ Thu Oct 8, 7:40 pm · Priya set ${p2.guests} · ${p2.total} · deposit ${p2.deposit}`)}</p>`, 'tilt-r'),
]
const page = `<article class="card bd-page" aria-label="Priya and Sam’s wedding proposal, as the client sees it">
<p class="bd-brand">Magnolia &amp; Thyme</p>${sparks('bd-brand-spark')}
<h3 class="bd-title">Priya and Sam’s wedding</h3><p class="bd-when">${line('Sat Nov 14, 2026 · backyard, Wilmington, DE')}</p>
<nav class="bd-nav" aria-label="Proposal sections (drawing)">${dots(['Our story', 'Menu', 'Team', 'Tasting gallery', 'Pricing', 'Terms', 'Sign'])}</nav>
<div class="bd-pkg"><h4>${line('Wedding package · plated dinner and service')}</h4><p>${t(`${p2.guests} guests × ${p2.perGuest} = ${p2.total}`)}</p>
<div class="bd-step"><span class="bd-step-label">Guests</span><span class="stepper" aria-hidden="true"><span>−</span><b>${p2.guests}</b><span>+</span></span>${cursor('Priya', 'client', 'client', 'bd-cursor')}<span class="bd-range">you can set 100–160</span></div></div>
<ul class="bd-opts"><li><span class="box" aria-hidden="true"></span>${line(`Late-night taco bar · ${p2.guests} × $9.00 = $1,260.00`)}</li><li><span class="box" aria-hidden="true"></span>${line(`Champagne toast · ${p2.guests} × $6.00 = $840.00`)}</li></ul>
<p class="bd-row"><span>Delaware sales tax</span><span>$0.00</span></p>
<p class="bd-row total"><span>Total</span><span>${p2.total}</span></p>
<p class="pill sage bd-dep">${line(`Deposit 30% ${p2.deposit} · paid by card Fri Oct 9 ✓`)}</p>
<p class="bd-bal">${t(`balance ${p2.balance} due Fri Nov 6`)}</p>
<p class="bd-foot">Views of this page are measured.</p></article><p class="sticky bd-sticky">${note('Priya added 20 guests herself!')}</p>`

const strip = ['Sent Tue Oct 6, 10:30 am', 'opened Wed Oct 7, 8:10 pm', 'reminder Thu Oct 8 ✓', 'signed Fri Oct 9, 12:15 pm ✓', 'later reminders cancelled', 'expiry Tue Oct 20 not reached']

export const buildSection = (): string => `<section id="build" class="sec build">
${head(['Build', 'Magnolia & Thyme → Raman–Whitley wedding', 'Mon Oct 5 – Fri Oct 9'], 'Your template, your catalog.', 'Their guest count.', t('Hannah built the wedding proposal from her plated-dinner template. Every price came from her catalog, and Priya set the guest count herself.'), 'split')}
<div class="bd-anatomy"><div class="bd-col l">${left.join('')}</div>${page}<div class="bd-col r">${right.join('')}</div></div>
<ol class="bd-strip">${strip.map((x, i) => `<li class="pill ${i >= 1 && i <= 3 ? 'sage' : 'grey'}">${x.endsWith('✓') ? ok(x.slice(0, -2)) : t(x)}</li>`).join('')}</ol>
</section>`

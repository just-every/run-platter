// 01 · Hero: "Proposals clients sign and pay." around the one Fernhill → Bluebonnet proposal, the firms' proposals fanned
// at its edges and seven clients down both sides. Every string is HTML; the vignettes are the approved drawing, redrawn
// clean by 12ui. Positions are on the approved image's 1536 × 1024 canvas (header row y 0–56 is the site header).
import { mail, p1, p2, p4, p5, p6, p7, type FirmId } from '../records'
import { check, cursor, firmMark, line, note, sparks, t } from '../parts'
import { plate } from '../plates'
import { rosa } from '../signatures'
import { drawn } from './sign'

const at = (x: number, y: number, w: number, extra = '') => `style="--x:${x};--y:${y};--w:${w}${extra ? ';' + extra : ''}"`
const NB = ' '

// the seven clients' drawings, at their frame on the canvas
const vignettes: [string, number, number, number, string][] = [
  ['v-north', 17, 76, 231, 'Northpoint Property Mgmt’s front desk: Tom Becker hands a printed proposal across the counter.'],
  ['v-dental', 17, 405, 275, 'Lakeside Dental’s reception: Dr. Alvarez and Kim Russo read the proposal between patients.'],
  ['v-bakery', 0, 682, 451, 'Sweet Ridge Bakery’s counter: Maya Delgado reads her proposal beside the pastry case, hibiscus in front.'],
  ['v-cafe', 1233, 99, 303, 'Honeysuckle Café: Grace Ferreira and a colleague read the proposal at a sidewalk table.'],
  ['v-park', 1248, 398, 275, 'Ellie Novak reads the June Park proposal by the river, the Portland skyline behind.'],
  ['v-office', 1080, 679, 456, 'A client signs at a sunny office desk, hibiscus in front.'],
]
// HTML cards on the drawing: where they sit, their accent and their lines
type Tag = { id: string; x: number; y: number; w: number; tone: 'rose' | 'sage' | 'butter' | 'plain'; lines: string[] }
const tags: Tag[] = [
  { id: 'opened', x: 128, y: 236, w: 148, tone: 'plain', lines: ['Opened Mon Oct 12', 'Dallas, TX · phone', '3 min on pricing'] },
  { id: 'northpoint', x: 32, y: 304, w: 262, tone: 'rose', lines: ['Evergreen Digital →', 'Northpoint Property Mgmt', `setup ${p4.setup} + ${p4.monthly}/mo × 12`, `first year ${p4.firstYear}`] },
  { id: 'lakeside', x: 32, y: 592, w: 254, tone: 'sage', lines: ['Lakeside Dental', 'Dr. Alvarez, then Office Mgr Kim', 'signed in order Wed Oct 14 ✓'] },
  { id: 'followup', x: 52, y: 845, w: 264, tone: 'butter', lines: ['Follow-up Thu Oct 8:', '‘you spent time on the retainer option’', '→ signed Mon Oct 12 ✓'] },
  { id: 'bounced', x: 1258, y: 318, w: 248, tone: 'rose', lines: [`Bounced: ${mail.bounced}`, `→ resent to ${mail.tom}`, 'Tue Oct 6 → opened ✓'] },
  { id: 'junepark', x: 1255, y: 571, w: 262, tone: 'butter', lines: ['June Park Photography', '2 min on pricing', 'drone add-on asked → rev 2 Thu Oct 15', '→ signed Fri Oct 16 ✓'] },
]
const tagHtml = (g: Tag) => `<p class="hx-tag ${g.tone} hx-${g.id}${g.x > 768 ? ' end' : ''}" ${at(g.x, g.y, g.w)}>${g.lines.map((l, i) => `<span${i === 0 && g.id !== 'opened' && g.id !== 'followup' && g.id !== 'bounced' ? ' class="b"' : ''}>${t(l)}</span>`).join('')}</p>`

// the firms' own proposals, fanned at the edges of Fernhill's
type Fan = { firm: FirmId; name: string; kind: string; thumb: string; x: number; y: number; w: number; r: number; lines: string[] }
const fans: Fan[] = [
  { firm: 'magnolia', name: 'Magnolia & Thyme', kind: 'Catering', thumb: 't-catering', x: 326, y: 436, w: 206, r: -8.5, lines: ['Wedding Package', `${p2.guests} guests × ${p2.perGuest}`, `<b>= ${p2.total}</b>`, '30% deposit', `<b>${p2.deposit}</b> paid ✓`] },
  { firm: 'northlight', name: 'Northlight', kind: 'Video', thumb: 't-video', x: 340, y: 708, w: 190, r: -7, lines: [`Shoot day ${p5.shoot}`, `+ 3 edits × ${p5.edit}`, `<b>= ${p5.total}</b>`, 'signed Tue Oct 13'] },
  { firm: 'junepark', name: 'June Park', kind: 'Photography', thumb: 't-photo', x: 1004, y: 438, w: 206, r: 7, lines: ['Wedding collection', p7.rev1, 'Drone add-on', p7.drone, `<b>= ${p7.total}</b>`, 'signed Fri Oct 16'] },
  { firm: 'brightwire', name: 'Brightwire IT', kind: '', thumb: 't-server', x: 1018, y: 708, w: 208, r: 7, lines: ['Server setup', p6.priced, `${p6.deposit} deposit`, 'card declined Mon Oct 19', '→ ACH settled Thu Oct 22 ✓'] },
]
// a line with one bold figure in it
const rich = (l: string) => l.split(/(<b>.*?<\/b>)/).map(seg => seg.startsWith('<b>') ? `<b>${t(seg.slice(3, -4))}</b>` : t(seg)).join('')
const fanHtml = (f: Fan) => `<article class="hx-fan hx-${f.firm}" ${at(f.x, f.y, f.w, `--r:${f.r}deg`)}><header>${firmMark(f.firm, 40)}<p><span class="serif">${t(f.name)}</span>${f.kind ? `<span class="kind">${f.kind}</span>` : ''}</p></header>${plate(f.thumb, '', '(min-width: 2200px) 250px, (min-width: 1280px) 12vw, 40vw', 'hx-thumb')}<p class="hx-fan-lines">${f.lines.map(l => `<span>${rich(l)}</span>`).join('')}</p></article>`

const tier = (name: string, price: string, lines: string[], picked = false) => `<div class="hx-tier${picked ? ' picked' : ''}"><p class="hx-tier-name">${name}</p><p class="hx-tier-price">${price}</p><ul>${lines.map(l => `<li>${t(l)}</li>`).join('')}</ul></div>`
const addon = (name: string, price: string, on = false) => `<li class="${on ? 'on' : ''}"><span class="box" aria-hidden="true">${on ? check : ''}</span><span>${t(name)}</span><span class="num">${t(price)}</span></li>`

const proposal = `<article class="hx-proposal" ${at(500, 394, 540)} aria-label="Fernhill Design Studio’s proposal to Bluebonnet Café">
<header class="hx-p-head">${firmMark('fernhill', 44)}<div><h2 class="serif">Fernhill Design Studio</h2><p class="hx-p-to">${t('→ Bluebonnet Café, Austin TX')}</p><p class="hx-p-rev">${line('brand refresh · rev 2 · Wed Oct 7')}</p></div></header>
<p class="hx-picked">${note('she picked Better!')}<svg class="hand-arrow" viewBox="0 0 40 40" aria-hidden="true"><path d="M34 4C28 18 20 28 8 34M6 22l1 13 13-2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></p>

<div class="hx-tiers">${cursor('Rosa', 'client', 'client', 'hx-rosa')}${tier('Good', '$4,200.00', ['Logo refresh', 'Color palette', '3 concepts', '2 rounds'])}${tier('Better', p1.better, ['Everything in Good', 'Menu design', 'Interior graphics', '4 concepts', '3 rounds'], true)}${tier('Best', '$9,800.00', ['Everything in Better', 'Exterior signage', 'Website updates', '5 concepts', 'Unlimited rounds'])}</div>
<div class="hx-sum"><div class="hx-addons"><p class="b">Add-ons</p><ul>${addon('Menu boards', `2 × ${p1.board} = ${p1.boards}`, true)}${addon('Window vinyl', '$800.00')}${addon('Social templates', '$500.00')}</ul></div>
<div class="hx-total"><p class="hx-tax"><span>Austin 8.25% tax</span><span class="num">${p1.tax}</span></p><p class="hx-eq"><span>${p1.better} + ${p1.boards}</span> <span>+ ${p1.tax}</span></p><p class="hx-big">=${NB}${p1.total}</p><p class="b">${t(`50% deposit ${p1.deposit}`)}</p></div></div>
<div class="hx-sign"><div class="hx-sig">${drawn(rosa, 'Signature: Rosa Mendez', 'hx-sig-svg')}<p>Rosa Mendez<br>Bluebonnet Café</p></div><span class="hx-pay">Pay deposit</span>${sparks('hx-spark-ben')}</div>
<p class="hx-story">${t('Rosa asked Wed Oct 7: boards by Oct 30? → rev 2 → signed Thu Oct 8')}<br>${t('ACH settled Tue Oct 13 ✓')}</p>
<p class="hx-books"><span>HubSpot deal won</span><span>${t(`QuickBooks invoice ${p1.invoice} ${p1.deposit} paid ✓`)}</span></p>
${cursor('Ben', 'Fernhill', 'firm', 'hx-ben')}
</article>`

// dotted connectors from the clients' cards to the firms' proposals, on the canvas
const links = `<svg class="hx-links" viewBox="0 56 1536 968" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#8B1950" stroke-width="2.4" stroke-dasharray="0.1 7" stroke-linecap="round">
<path d="M280 262c40 20 70 60 82 130"/><path d="M286 576c22-10 40-14 58-14"/><path d="M302 690c18 0 34 4 48 14"/>
<path d="M1252 254c-14 30-14 50-6 64"/><path d="M1254 598c-20 8-38 10-56 10"/><path d="M1250 742c-14-24-28-40-48-50"/></g></svg>`

const copy = `<div class="hx-copy">
<h1 class="hx-h1"><span>Proposals clients</span> <span class="grad">sign and pay.</span></h1>
<p class="hx-sub">${t('Platter turns your templates and catalog into branded proposals, sends them from your own mailbox, shows what each client read, and collects the signature and deposit together.')}</p>
<p class="hx-alt">100% free, open source alternative to <b>PandaDoc</b>, <b>Proposify</b> and <b>Better${NB}Proposals</b></p>
<div class="hx-actions"><a class="cta" href="/run">Run Platter →</a><p class="hx-links-row"><a href="https://demo.run-platter.com/">Try the demo</a><a href="/docs">Read the docs</a></p></div>
</div>`

// below the desktop the clients' drawings stack whole, each with its card
const tiles: [string, string[], string][] = [
  ['v-north', ['opened', 'northpoint'], 'Northpoint Property Mgmt’s front desk.'], ['v-cafe', ['bounced'], 'Honeysuckle Café’s sidewalk table.'],
  ['v-dental', ['lakeside'], 'Lakeside Dental’s reception.'], ['v-park', ['junepark'], 'Ellie Novak reads by the river.'],
  ['v-bakery-s', ['followup'], 'Sweet Ridge Bakery’s counter.'],
]
const tileHtml = ([img, ids, alt]: [string, string[], string]) => `<li class="hx-tile">${plate(img, alt, '(max-width: 760px) 46vw, 30vw')}${ids.map(id => { const g = tags.find(x => x.id === id)!; return `<p class="hx-tag ${g.tone}">${g.lines.map((l, i) => `<span${i === 0 && !['opened', 'followup', 'bounced'].includes(id) ? ' class="b"' : ''}>${t(l)}</span>`).join('')}</p>` }).join('')}</li>`

export const heroSection = (): string => `<section class="hero" aria-label="Platter">
<div class="hx-canvas">
${copy}
<div class="hx-art" aria-hidden="false">${vignettes.map(([name, x, y, w, alt]) => `<div class="hx-v" ${at(x, y, w)}>${plate(name, alt, `(min-width: 2200px) ${Math.round(w * 2200 / 1536)}px, ${(w / 15.36).toFixed(2)}vw`, '', name === 'v-cafe' || name === 'v-north')}</div>`).join('')}
<p class="hx-sign-np" ${at(132, 128, 84)} aria-hidden="true"><span>NORTHPOINT</span><span>Property Mgmt</span></p>
${links}${sparks('hx-spark-1')}${sparks('hx-spark-2')}${sparks('hx-spark-3')}${sparks('hx-spark-4')}
${tags.map(tagHtml).join('')}</div>
<div class="hx-fans">${fans.map(fanHtml).join('')}</div>
${proposal}
</div>
<ul class="hx-tiles">${tiles.map(tileHtml).join('')}</ul>
</section>`

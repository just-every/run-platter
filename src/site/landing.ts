import { siteDocument } from './frame'

const actions = () => '<div class="site-actions"><a class="button" href="/run">Run Platter →</a><a href="/docs">Read the docs</a></div>'
const radio = (selected = false) => `<span class="draw-radio${selected ? ' selected' : ''}" aria-hidden="true"></span>`
const download = '<span class="draw-button secondary">Download deposit invoice CSV</span>'
const offered = (title: string, price: string, deposit: string, selected = false) => `<div class="draw-option${selected ? ' chosen' : ''}"><strong>${title}</strong><b>${price}</b><span>Deposit ${deposit}</span></div>`
const step = (n: number, title: string, card: string) => `<div class="hero-step"><h2><span class="numeral">${n}</span>${title}</h2><div class="draw-card">${card}</div></div>`
const heroDrawing = () => `<div class="hero-plate plate" role="img" aria-label="Platter: two options, the client chooses Campaign and accepts, the deposit invoice is ready"><div class="hero-steps">${step(1,'Two options',`<strong>Brand photography</strong><div class="draw-row">${radio()}<span>Essentials</span><span>$2,400.00</span></div><div class="draw-row">${radio()}<span>Campaign</span><span>$4,200.00</span></div>`)}<span class="step-arrow" aria-hidden="true">→</span>${step(2,'They choose',`<div class="draw-row chosen">${radio(true)}<span>Campaign — $4,200.00</span></div><div class="draw-field">Priya Shah</div><span class="draw-button">Accept proposal</span>`)}<span class="step-arrow" aria-hidden="true">→</span>${step(3,'Deposit ready',`<strong>Proposal accepted</strong><div class="draw-row"><span>Deposit due</span><span>$1,050.00</span></div>${download}`)}</div></div>`
const feature = (id: string, title: string, body: string, drawing: string, modifier = '') => `<section class="feature ${modifier}" id="${id}"><div class="feature-copy"><h2>${title}</h2><p>${body}</p></div><div class="feature-plate plate"><div class="draw-card">${drawing}</div></div></section>`
const icon = (path: string) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`
const included = [
  ['Email-verified acceptance','<rect x="5" y="8" width="22" height="16" rx="2"/><path d="m6 10 10 8 10-8"/>'],
  ['Recorded approvals','<path d="M9 4h14v24H9zM12 10h8M12 15h8M12 20h4"/><path d="m18 23 3 3 6-7"/>'],
  ['Fresh client links','<path d="m14 10 4-4a6 6 0 0 1 8 8l-4 4M18 22l-4 4a6 6 0 0 1-8-8l4-4m2 6 8-8"/>'],
  ['Erase unused clients','<path d="M8 10h16M12 10V6h8v4M10 10l1 17h10l1-17M14 14v9M18 14v9"/>'],
  ['Backup and restore','<path d="M7 12a10 10 0 1 1-1 11M7 5v7h7M16 10v9l5 3"/>'],
  ['Your own account','<circle cx="16" cy="11" r="5"/><path d="M6 28v-3a10 10 0 0 1 20 0v3"/>'],
]
export function landingHtml(): string {
  const content = `<main id="main" class="landing"><section class="landing-hero"><h1><span>Send a proposal.</span> <span>Get a yes.</span></h1><p class="subhead">Offer two prices. Your client picks one, accepts online, and the deposit invoice is ready.</p><p class="alternative">100% free, open source alternative to <strong>Qwilr</strong>, <strong>Proposify</strong> and <strong>PandaDoc</strong></p>${actions()}<p class="licence">Free and open source, MIT licensed.</p>${heroDrawing()}</section><div class="features">`
    + feature('options','Two prices, side by side.','Give every proposal two options and a deposit. Your client sees exactly what each one costs.',`<span class="draw-label">Offer options</span><div class="draw-options">${offered('Essentials','$2,400.00','$600.00')}${offered('Campaign','$4,200.00','$1,050.00',true)}</div>`)
    + feature('free','100% free.','Free as in code, free as in cost. MIT licensed, on your own computer or your own account.','<span class="license-card">MIT License</span>','compact')
    + feature('kept','The yes, kept exactly.','Sending freezes the offer. The acceptance records who chose which option, and when.','<strong>Client acceptance</strong><dl><dt>Accepted by</dt><dd>Priya Shah</dd><dt>Chosen option</dt><dd>Campaign</dd><dt>Total</dt><dd>$4,200.00</dd><dt>Deposit due</dt><dd>$1,050.00</dd></dl>')
    + feature('invoice','A deposit invoice for your books.',"Export the deposit as one invoice CSV in Xero's columns. Export it again and you get the same invoice.",`<strong>Invoice INV-0007</strong>${download}`)
    + feature('agents','Let an agent draft it.','Give an agent a key to prepare proposals. You check the prices and send.','<strong>Agent keys</strong><div class="draw-row"><span>Proposal assistant</span><span class="draw-status">Active</span></div>')
    + feature('move-in','Bring your clients.','Paste your client list, preview it, then apply. Undo it if you need to.','<div class="import-drawing"><span class="draw-button secondary">Preview import</span><span class="import-arrow" aria-hidden="true">→</span><span class="draw-button">Apply reviewed import</span></div>')
    + `</div><section id="included" class="included"><h2>Also included</h2><div class="included-grid">${included.map(([label,path])=>`<div><span class="icon-circle">${icon(path)}</span><span>${label}</span></div>`).join('')}</div></section><section id="try" class="closing plate"><h2>Try it on your next proposal.</h2><p>Keep what you use today. Send one client a proposal from Platter and see how it lands.</p>${actions()}</section></main>`
  return siteDocument('Platter — proposals your clients accept online', content)
}

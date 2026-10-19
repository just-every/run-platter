import { fontHead } from '../../base/font-head'

export type Feedback = { message?: string; error?: string; result?: any }
export const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
export const money = (cents: number, currency?: string): string => `$${(Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ' ' + escape(currency) : ''}`
export const date = (value: unknown): string => {
  if (!value) return '—'
  const parsed = new Date(typeof value==='number'?value:String(value))
  return Number.isNaN(parsed.getTime()) ? escape(value) : escape(parsed.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })) + ' UTC'
}
export const hidden = (name: string, value: unknown): string => `<input type="hidden" name="${escape(name)}" value="${escape(value)}">`
export const field = (label: string, name: string, value: unknown = '', extra = ''): string => `<label>${escape(label)}<input name="${escape(name)}" value="${escape(value)}" ${extra}></label>`
export const area = (label: string, name: string, value: unknown = '', extra = ''): string => `<label>${escape(label)}<textarea name="${escape(name)}" rows="5" ${extra}>${escape(value)}</textarea></label>`
export const action = (command: string, returnTo: string): string => `/app/action?name=${encodeURIComponent(command)}&amp;returnTo=${encodeURIComponent(returnTo)}`
export const form = (command: string, returnTo: string, contents: string, draft?: string): string => `<form method="post" action="${action(command, returnTo)}"${draft ? ` data-draft="${escape(draft)}"` : ''}>${contents}</form>`
export const panel = (title: string, contents: string): string => `<section class="panel"><h2>${escape(title)}</h2>${contents}</section>`
export const empty = (text: string): string => `<div class="empty-state"><img src="/brand/empty.svg" width="120" height="60" alt=""><p class="muted">${escape(text)}</p></div>`
export const proposalPath = (id: unknown): string => `/app/proposal?id=${encodeURIComponent(String(id))}`
export const ownerOnly = (): string => panel('Owner access required', '<p>Your account can prepare proposals. Ask the owner to manage clients, imports, or agent access.</p>')
const safeLink = (value: unknown): string | null => {
  const href = String(value ?? '')
  return /^\/(?!\/)/.test(href) || /^https?:\/\//i.test(href) ? href : null
}
export function notices(feedback?: Feedback): string {
  if (!feedback) return ''
  const result = feedback.result
  let html = feedback.error ? `<div class="notice error" role="alert"><strong>Could not complete this action</strong><p>${escape(feedback.error)}</p></div>` : ''
  if (feedback.message) html += `<p class="notice" role="status">${escape(feedback.message)}</p>`
  for (const key of ['shareUrl', 'inviteUrl']) {
    const link = result && safeLink(result[key])
    if (link) html += `<div class="notice"><p>${key === 'shareUrl' ? 'Client proposal link' : 'Invitation link'}</p><a class="wrap" href="${escape(link)}">${escape(link)}</a></div>`
  }
  const token = result && (result.token || result.apiKey || result.key)
  if (typeof token === 'string') html += `<div class="notice" role="status"><strong>Copy your agent key now</strong><p>This key is shown once. Store it securely.</p><code class="wrap">${escape(token)}</code></div>`
  return html
}
export function document(title: string, contents: string, options: { actor?: any; path?: string; feedback?: Feedback; status?: number; client?: boolean; beforeTitle?: string } = {}): Response {
  const { actor, path, feedback, client } = options
  const links = [['/app', 'Proposals'], ['/app/clients', 'Clients'], ['/app/import', 'Import'], ['/app/access', 'Agent access'], ['/app/audit', 'Audit log'], ['/app/settings','Vendor documents']]
    .filter(([href]) => actor?.role === 'owner' || href === '/app')
    .map(([href, label]) => `<a href="${href}"${(path?.split('?')[0] === href || href === '/app' && path?.startsWith('/app/proposal')) ? ' aria-current="page"' : ''}>${label}</a>`).join('')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Platter</title>${fontHead}<link rel="stylesheet" href="/rer-theme.css"><link rel="stylesheet" href="/platter.css"><script src="/platter.js" defer></script></head><body${actor ? ` data-draft-scope="${escape(actor.id)}"` : ''}${!feedback?.error && (feedback?.message || feedback?.result) ? ' data-action-success="true"' : ''}><a class="skip" href="#main">Skip to content</a><header><a class="brand" href="${client ? '#' : '/app'}"><img src="/brand/mark.svg" width="32" height="32" alt=""><span data-rer-name>Platter</span></a>${actor ? `<nav aria-label="Main navigation">${links}</nav><p class="identity">${escape(actor.email)} · ${escape(actor.role)}</p>` : '<span class="muted">Client proposal</span>'}</header><main id="main"${client ? ' class="client-page"' : ''}>${options.beforeTitle ?? ''}<h1>${escape(title)}</h1>${notices(feedback)}${contents}</main></body></html>`
  return new Response(html, { status: options.status ?? 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'strict-origin', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'" } })
}

export const statusPill = (value: unknown): string => `<span class="status ${['accepted', 'active'].includes(String(value).toLowerCase()) ? 'status-filled' : ''}">${escape(value)}</span>`
export const optionPair = (options: any[], depositBps: number, chosen?: string, currency?: string): string => `<div class="option-pair">${options.map(option => `<div class="offer-option${option.id === chosen ? ' chosen' : ''}"><strong>${escape(option.label)}</strong><span class="option-price">${money(option.cents,currency)}</span><span class="muted">Deposit ${money(Math.round(option.cents * depositBps / 10000),currency)}</span></div>`).join('')}</div>`

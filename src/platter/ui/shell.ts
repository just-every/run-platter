import { embedFrameSources } from '../documents/embeds'
import { createHash } from 'node:crypto'
import { fontHead } from '../../base/font-head'
import { escape, notices, type Feedback } from './shared'

// The app's one frame (owner pick A): a white top bar with the mark and serif wordmark, the tabs with the
// gradient underline on the current one, the installation's clock and the person's initials.
const tabs = [['/app', 'Proposals'], ['/app/clients', 'Clients'], ['/app/import', 'Import'], ['/app/access', 'Agent access'], ['/app/audit', 'Audit log'], ['/app/settings', 'Vendor documents'], ['/app/team','Team'], ['/app/approvals','Approvals']]
const icons = '<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" href="/brand/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">'
// Each part of the app's stylesheet is linked from the head so all load at once (an @import chain loads them in turn).
const parts = ['shell', 'forms', 'panels', 'composer', 'line', 'document'].map(part => `<link rel="stylesheet" href="/app/${part}.css">`).join('')
const policy = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; media-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; frame-src 'self' "+embedFrameSources

function clock(now: number, zone: string): string {
  const part = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).formatToParts(now).map(p => [p.type, p.value]))
  return `<time class="clock" datetime="${new Date(now).toISOString()}">${escape(`${part.weekday} ${part.month} ${part.day}, ${part.year} · ${part.hour}:${part.minute} ${String(part.dayPeriod).toLowerCase()} ${part.timeZoneName}`)}</time>`
}
const initials = (name: string, email: string) => (name.trim() ? name.trim().split(/\s+/).map(word => word[0]).slice(0, 2).join('') : email[0] ?? '?').toUpperCase()

export interface FrameOptions { actor?: any; path?: string; feedback?: Feedback; status?: number; client?: boolean; beforeTitle?: string; eyebrow?: string; zone?: string; name?: string; inlineNotices?: boolean; layout?: string; styles?:string; collection?:boolean }

export function document(title: string, contents: string, options: FrameOptions = {}): Response {
  const { actor, path, feedback, client } = options
  const zone = options.zone ?? 'UTC'
  const current = path?.split('?')[0]
  const links = tabs.filter(([href]) => actor?.role === 'owner' || href === '/app' || ['owner','admin'].includes(actor?.role)&&['/app/team','/app/approvals','/app/audit','/app/settings'].includes(href) || actor?.role!=='agent'&&href==='/app/team')
    .map(([href, label]) => `<a href="${href}"${(current === href || href === '/app' && path?.startsWith('/app/proposal')) ? ' aria-current="page"' : ''}>${label}</a>`).join('')
  const person = actor ? `<div class="topbar-end">${clock(Date.now(), zone)}<p class="identity" title="${escape(actor.email)} · ${escape(actor.role)}"><span class="avatar" aria-hidden="true">${escape(initials(options.name ?? '', String(actor.email)))}</span><span class="who">${escape(actor.email)} · ${escape(actor.role)}</span></p></div>` : '<span class="client-tag">Client proposal</span>'
  const styleHash=options.styles?createHash('sha256').update(options.styles).digest('base64'):''
  const style=options.styles?`<style>${options.styles}</style>`:''
  const responsePolicy=options.collection?policy.replace("script-src 'self'","script-src 'self' https://js.stripe.com https://*.js.stripe.com").replace("connect-src 'self'","connect-src 'self' https://api.stripe.com").replace("frame-src 'self'","frame-src 'self' https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com"):policy
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Platter</title>${icons}${fontHead}<link rel="stylesheet" href="/rer-theme.css">${parts}${style}<script src="/platter.js" defer></script></head>`
    + `<body${actor ? ` data-draft-scope="${escape(actor.id)}"` : ''}${!feedback?.error && (feedback?.message || feedback?.result) ? ' data-action-success="true"' : ''}><a class="skip" href="#main">Skip to content</a>`
    + `<header class="topbar"><a class="brand" href="${client ? '#' : '/app'}"><img src="/brand/mark-32.svg" width="40" height="40" alt=""><span data-rer-name>Platter</span></a>${actor ? `<nav aria-label="Main navigation">${links}</nav>` : ''}${person}</header>`
    + `<main id="main" class="${client ? 'client-page' : 'app-page'}${options.layout ? ' ' + escape(options.layout) : ''}"${client ? ' tabindex="-1"' : ''}>${options.beforeTitle ?? ''}${options.eyebrow ?? ''}<h1>${escape(title)}</h1>${options.inlineNotices ? '' : notices(feedback, client)}${contents}</main></body></html>`
  return new Response(html, { status: options.status ?? 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'strict-origin', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': options.styles?responsePolicy.replace("style-src 'self'","style-src 'self' 'sha256-"+styleHash+"'"):responsePolicy } })
}

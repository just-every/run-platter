// The page's shared furniture: type helpers, the section head, pills, cursors, hand notes, sparks and checks.
import { escape } from '../../platter/ui/shared'
import { firms, type FirmId } from './records'

const NB = ' '
// Keep a date, a time, a figure with its unit and an equation's terms on one line.
export function glue(text: string): string {
  return text
    .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Oct|Nov) (\d+)/g, `$1${NB}$2${NB}$3`)
    .replace(/\b(Oct|Nov|March) (\d+)/g, `$1${NB}$2`)
    .replace(/(\d) (am|pm|h|min|s|ET|CT|PT|guests|edits|posts|reels|items|bundles|zips|PDFs|blocks|photos|days|attempts?|amounts?|invoices?|mismatches|signed|open|proposals|firms|first|of)\b/g, `$1${NB}$2`)
    .replace(/ ([×=+→]) /g, `${NB}$1${NB}`)
    .replace(/ (✓)/g, `${NB}$1`)
    .replace(/(\d+) (×)/g, `$1${NB}$2`)
}
export const t = (text: string): string => glue(escape(text))
// A line of phrases joined by "·": the separators sit between phrases and never start or end a wrapped line.
// Short phrases wrap whole, with the separator hidden at a line's start; a list holding a long phrase flows as text
// with each "·" glued to the words on both sides, so lines break inside phrases and never beside a separator.
const plainLength = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, 'x').length
export const dots = (phrases: string[], cls = ''): string => phrases.some(p => plainLength(p) > 26)
  ? `<span class="dl-i${cls ? ' ' + cls : ''}">${phrases.join(`${NB}·${NB}`)}</span>`
  : `<span class="dl${cls ? ' ' + cls : ''}">${phrases.map(p => `<span>${p}</span>`).join('')}</span>`
// Split a plain string on " · " into such a line.
export const line = (text: string, cls = ''): string => text.includes(' · ') ? dots(text.split(' · ').map(t), cls) : `<span class="${cls}">${t(text)}</span>`

export const eyebrow = (parts: string[]): string => `<p class="eyebrow">${dots(parts.map(t))}</p>`
export const heading = (first: string, second: string, tag = 'h2'): string => `<${tag} class="display"><span>${t(first)}</span> <span class="grad">${t(second)}</span></${tag}>`
export const head = (eyebrowParts: string[], first: string, second: string, body: string, cls = ''): string =>
  `<header class="sec-head ${cls}">${eyebrow(eyebrowParts)}${heading(first, second)}<p class="lede">${body}</p></header>`

export const check = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
export const tick = `<span class="tick" aria-hidden="true">${check}</span>`
export const ok = (text: string): string => `${t(text)}${NB}<span class="ok" aria-label="done">✓</span>`
export const pill = (text: string, kind: 'sage' | 'red' | 'grey' | 'butter' | 'line' = 'sage'): string => `<span class="pill ${kind}">${text}</span>`

const arrow = '<svg class="cursor-arrow" viewBox="0 0 20 22" aria-hidden="true"><path d="M2 1.5l15 8.6-6.6 1.6 3.9 7.3-2.7 1.4-3.9-7.4L2.8 17.4z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>'
// A person on the page: a client in a mulberry pill, a firm in a butter pill.
export const cursor = (name: string, who: string, side: 'client' | 'firm', cls = ''): string =>
  `<span class="cursor ${side}${cls ? ' ' + cls : ''}" aria-hidden="true">${arrow}<span class="cursor-pill">${escape(name)}${NB}·${NB}${escape(who)}</span></span>`
export const note = (text: string, cls = ''): string => `<span class="hand${cls ? ' ' + cls : ''}">${escape(text)}</span>`
export const sparks = (cls = ''): string => `<svg class="sparks${cls ? ' ' + cls : ''}" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 4l4 10M22 2v11M34 8l-7 8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>`
export const initials = (text: string, cls = ''): string => `<span class="avatar${cls ? ' ' + cls : ''}" aria-hidden="true">${escape(text)}</span>`

// Each firm's own painted mark, cut once from the approved images (public/landing/marks).
export const firmMark = (id: FirmId, size = 48): string => `<img class="firm-mark" src="/landing/marks/${id}.png" srcset="/landing/marks/${id}.png 2x" width="${size}" height="${size}" alt="${escape(firms[id].mark)}" loading="lazy" decoding="async">`

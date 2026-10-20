import { escape } from '../platter/ui/shared'
import { identity } from '../identity'
import run from './run.json'

const mark = (size: number) => `<img src="/brand/mark.svg" alt="" width="${size}" height="${size}">`
export const siteHeader = (): string => `<header class="site-header"><a class="site-brand" href="/">${mark(40)}Platter</a><nav aria-label="Site"><a href="/docs">Docs</a><a href="/contract">Contract</a><a href="${run.repository}">Source</a></nav></header>`
export const siteFooter = (): string => `<footer class="site-footer"><p class="site-foot-brand"><a class="site-brand" href="/">${mark(36)}Platter</a><span>Free, open source proposal software</span></p><nav aria-label="Footer"><a href="/docs">Docs</a><a href="/contract">Contract</a><a href="${run.repository}">Source</a><span>MIT licensed</span></nav></footer>`
const icons = '<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" href="/brand/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">'
export function siteDocument(title: string, content: string, description = identity.tagline, head = ''): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}">${icons}<link rel="stylesheet" href="/rer-theme.css"><link rel="stylesheet" href="/site.css">${head}</head><body><a class="skip" href="#main">Skip to content</a>${siteHeader()}${content}${siteFooter()}</body></html>`
}

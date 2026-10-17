import { escape } from '../platter/ui/shared'
import { identity } from '../identity'
import run from './run.json'

export const siteHeader = (): string => `<header class="site-header"><a class="site-brand" href="/"><img src="/brand/mark.svg" alt="" width="32" height="32">Platter</a><nav aria-label="Site"><a href="/docs">Docs</a><a href="/contract">Contract</a><a href="${run.repository}">Source</a></nav></header>`
export const siteFooter = (): string => `<footer class="site-footer"><span>Platter · MIT licensed</span><nav aria-label="Footer"><a href="/docs">Docs</a><a href="${run.repository}">Source</a></nav></footer>`
export function siteDocument(title: string, content: string, description = identity.tagline): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="icon" href="/brand/mark.svg"><link rel="stylesheet" href="/rer-theme.css"><link rel="stylesheet" href="/site.css"></head><body><a class="skip" href="#main">Skip to content</a>${siteHeader()}${content}${siteFooter()}</body></html>`
}

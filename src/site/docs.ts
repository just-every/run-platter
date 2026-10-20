/// <reference types="vite/client" />
import { siteDocument } from './frame'

// Every served article is repository Markdown. This list also owns local link
// resolution: files outside it link to source rather than a nonexistent route.
const articles = [
  { path: '/docs', source: 'docs/README.md', title: 'Overview' },
  { path: '/docs/getting-started', source: 'docs/GETTING-STARTED.md', title: 'Getting started' },
  { path: '/docs/proposals', source: 'docs/PROPOSALS.md', title: 'Proposals and acceptance' },
  { path: '/docs/agent-access', source: 'docs/AGENT-ACCESS.md', title: 'Agent access' },
  { path: '/docs/move-in', source: 'docs/MOVE-IN.md', title: 'Move in your clients' },
  { path: '/docs/backup-restore', source: 'docs/BACKUP-RESTORE.md', title: 'Backup and restore' },
  { path: '/docs/readme', source: 'README.md', title: 'Repository README' },
  { path: '/docs/contract', source: 'CONTRACT.md', title: 'First-release contract' },
  { path: '/docs/acceptance', source: 'ACCEPTANCE.md', title: 'Supported jobs' },
  { path: '/docs/source', source: 'docs/SOURCE.md', title: 'Source reuse' },
]
const markdown = import.meta.glob<string>([
  '../../docs/*.md', '../../README.md', '../../CONTRACT.md', '../../ACCEPTANCE.md',
], { query: '?raw', import: 'default', eager: true })
const repository = 'https://github.com/just-every/run-platter/blob/main/'
const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!)

function linkTarget(target: string, source: string): string | null {
  if (/^https?:\/\//i.test(target)) return target
  if (target.startsWith('#')) return target
  // Raw HTML and arbitrary URL schemes never become active markup.
  if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//')) return null
  if (target === '/' || target === '/run' || articles.some(article => article.path === target)) return target
  // Installation-only routes must not send a public-site reader to a dead page.
  if (/^\/(?:app|api|p|signin|setup)(?:[/?#]|$)/.test(target)) return null
  const resolved = new URL(target, `https://source.invalid/${source}`)
  const filename = decodeURIComponent(resolved.pathname.slice(1))
  const article = articles.find(item => item.source === filename)
  return article ? article.path + resolved.hash : repository + resolved.pathname.slice(1) + resolved.hash
}

// A deliberately small Markdown subset: escape HTML first, then emit only the
// elements used by these docs. No raw HTML, scripts, image embeds or plugins.
function inline(value: string, source: string): string {
  const tokens = /`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let result = '', from = 0
  for (const match of value.matchAll(tokens)) {
    result += escape(value.slice(from, match.index))
    if (match[1] !== undefined) result += `<code>${escape(match[1])}</code>`
    else if (match[2] !== undefined) {
      const href = linkTarget(match[3], source)
      const label = inline(match[2], source)
      result += href ? `<a href="${escape(href)}">${label}</a>` : label
    } else if (match[4] !== undefined) result += `<strong>${escape(match[4])}</strong>`
    else result += `<em>${escape(match[5])}</em>`
    from = match.index! + match[0].length
  }
  return result + escape(value.slice(from))
}

// A heading never strands its last word: a short final pair of words stays on one line.
const keepLastPair = (html: string): string => html.replace(/ ([^\s<>]+ [^\s<>]+)$/, (whole, pair: string) => pair.length <= 20 ? ` ${pair.replace(' ', '\u00a0')}` : whole)

function renderMarkdown(content: string, source: string): string {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const result: string[] = []
  const slugs = new Map<string, number>()
  const listItem = (line: string) => line.match(/^\s*(?:([-+*])|\d+\.)\s+(.+)$/)
  const heading = (line: string) => line.match(/^(#{1,6})\s+(.+)$/)
  const tableRule = (line: string) => /^\s*\|?\s*:?-{3,}:?\s*\|[\s|:\-]*$/.test(line)
  const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
  for (let i = 0; i < lines.length;) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const fence = line.match(/^```([\w-]*)\s*$/)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++])
      if (i < lines.length) i++
      result.push(`<pre tabindex="0"><code${fence[1] ? ` class="language-${escape(fence[1])}"` : ''}>${escape(code.join('\n'))}</code></pre>`)
      continue
    }
    const title = heading(line)
    if (title) {
      const base = title[2].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-')
      const count = slugs.get(base) ?? 0
      slugs.set(base, count + 1)
      const id = count ? `${base}-${count}` : base
      result.push(`<h${title[1].length} id="${escape(id)}">${keepLastPair(inline(title[2], source))}</h${title[1].length}>`)
      i++; continue
    }
    if (i + 1 < lines.length && line.includes('|') && tableRule(lines[i + 1])) {
      const header = cells(line).map(cell => `<th scope="col">${inline(cell, source)}</th>`).join('')
      const rows: string[] = []
      i += 2
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(`<tr>${cells(lines[i++]).map(cell => `<td>${inline(cell, source)}</td>`).join('')}</tr>`)
      }
      result.push(`<div class="docs-table" role="region" aria-label="Reference table" tabindex="0"><table><thead><tr>${header}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`)
      continue
    }
    const first = listItem(line)
    if (first) {
      const tag = first[1] ? 'ul' : 'ol'
      const items: string[] = []
      while (i < lines.length) {
        const item = listItem(lines[i])
        if (!item || (item[1] ? 'ul' : 'ol') !== tag) break
        let text = item[2]
        i++
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !listItem(lines[i])) text += ' ' + lines[i++].trim()
        items.push(`<li>${inline(text, source)}</li>`)
      }
      result.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }
    const paragraph = [line.trim()]
    i++
    while (i < lines.length && lines[i].trim() && !heading(lines[i]) && !listItem(lines[i]) && !lines[i].startsWith('```')) {
      if (i + 1 < lines.length && lines[i].includes('|') && tableRule(lines[i + 1])) break
      paragraph.push(lines[i++].trim())
    }
    result.push(`<p>${inline(paragraph.join(' '), source)}</p>`)
  }
  return result.join('\n')
}

export function docsPages(): { path: string; html: string }[] {
  return articles.map(article => {
    const content = markdown[`../../${article.source}`]
    if (typeof content !== 'string') throw new Error(`Missing documentation source: ${article.source}`)
    const title = content.match(/^# (.+)$/m)?.[1] ?? article.title
    const nav = articles.map(item => `<li><a href="${item.path}"${item.path === article.path ? ' aria-current="page"' : ''}>${escape(item.title)}</a></li>`).join('')
    const body = `<main id="main" class="docs-layout"><nav class="docs-nav" aria-label="Documentation"><p>Platter docs</p><ul>${nav}</ul></nav><article class="docs-article">${renderMarkdown(content, article.source)}<p class="docs-source"><a href="${repository + article.source}">View this page on GitHub</a></p></article></main>`
    return { path: article.path, html: siteDocument(`${title} · Platter docs`, body, 'Guides for running Platter, preparing proposals, client acceptance, agent access and preserving your records.') }
  })
}

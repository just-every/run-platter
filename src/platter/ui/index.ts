import { accessPage, clientsPage, importPage } from './admin'
import { proposalPage, proposalsPage } from './proposals'
import { document, escape, panel, type Feedback } from './shared'
export { renderClient } from './client'

export function renderMissing(): Response {
  return document('Page not found', '<p>This page is unavailable. Check the link or return to your proposals.</p><a href="/app">Go to proposals</a>', { status: 404 })
}
export function renderApp(state: any, path: string, feedback?: Feedback): Response {
  const url = new URL(path, 'https://platter.invalid')
  let content: string | null
  let title: string
  switch (url.pathname) {
    case '/app': title = 'Proposals'; content = proposalsPage(state); break
    case '/app/proposal': title = 'Proposal'; content = proposalPage(state, url.searchParams.get('id') ?? ''); break
    case '/app/clients': title = 'Clients'; content = clientsPage(state); break
    case '/app/import': title = 'Client import'; content = importPage(state, feedback); break
    case '/app/access': title = 'Agent access'; content = accessPage(state); break
    default: return renderMissing()
  }
  if (content === null) return renderMissing()
  if (state.actor?.role === 'owner' && url.pathname === '/app/proposal' && state.outbox?.length) {
    content += panel('Local development mail', `<p>Messages captured locally for this installation.</p><ul class="records">${state.outbox.map((message: any) => `<li><article><h3>${escape(message.subject)}</h3><p>To: ${escape(message.recipient)} · ${escape(message.status)}</p><p class="preserve">${escape(message.body)}</p></article></li>`).join('')}</ul>`)
  }
  return document(title, content, { actor: state.actor, path, feedback, beforeTitle: url.pathname === '/app/proposal' ? '<p class="breadcrumb"><a href="/app">All proposals</a></p>' : undefined })
}

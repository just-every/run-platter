import { teamPage } from './team'
import { approvalsPage } from './approvals'
import { vendorSettings } from './attachments'
import { accessPage, importPage } from './admin'
import { clientsPage } from './clients'
import { proposalEyebrow, proposalPage, proposalsPage } from './proposals'
import { escape, inZone, panel, type Feedback } from './shared'
import { document } from './shell'
export { renderClient } from './client'

export function renderMissing(): Response {
  return document('Page not found', '<p>This page is unavailable. Check the link or return to your proposals.</p><a href="/app">Go to proposals</a>', { status: 404 })
}
const eyebrow = (text: string) => `<p class="eyebrow">${escape(text)}</p>`
const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
export function renderApp(state: any, path: string, feedback?: Feedback): Response {
  const url = new URL(path, 'https://platter.invalid')
  const zone = state.timeZone ?? 'UTC'
  // A refused composer save is shown in the composer's own band, not over the page.
  const composerRefusal = feedback?.error && /^package:/.test(feedback.field ?? '') ? feedback : undefined
  return inZone(zone, () => {
    let content: string | null
    let title: string
    let above = ''
    let layout = ''
    switch (url.pathname) {
      case '/app/team': title='Team'; content=teamPage(state); break
      case '/app/approvals': title='Approvals'; content=approvalsPage(state); break
      case '/app/settings': title = 'Vendor documents'; above = eyebrow('Settings · defaults for new proposals'); content = vendorSettings(state); break
      case '/app': title = 'Proposals'; above = eyebrow(`Pipeline · ${count((state.proposals ?? []).length, 'proposal')} · ${count((state.clients ?? []).length, 'client')}`); layout = 'proposals-page'; content = proposalsPage(state, url.searchParams, composerRefusal); break
      case '/app/proposal': {
        const id = url.searchParams.get('id') ?? ''
        title = state.proposals?.find((p: any) => String(p.id) === id)?.title ?? 'Proposal'; above = proposalEyebrow(state, id); layout = 'proposal-page'
        content = proposalPage(state, id, url.searchParams, feedback); break
      }
      case '/app/clients': title = 'Clients'; above = eyebrow(`Clients · ${count((state.clients ?? []).length, 'client')} on file`); layout = 'clients-page'; content = clientsPage(state); break
      case '/app/import': title = 'Client import'; above = eyebrow('Move in · clients, contacts and catalog'); content = importPage(state, feedback); break
      case '/app/access': title = 'Agent access'; above = eyebrow('Agents · keys and send requests'); content = accessPage(state); break
      default: return renderMissing()
    }
    if (content === null) return renderMissing()
    if (state.actor?.role === 'owner' && url.pathname === '/app/proposal' && state.outbox?.length) {
      content += panel('Local development mail', `<p>Messages captured locally for this installation.</p><ul class="records">${state.outbox.map((message: any) => `<li><article><h3>${escape(message.subject)}</h3><p>To: ${escape(message.recipient)} · ${escape(message.status)}</p><p class="preserve">${escape(message.body)}</p></article></li>`).join('')}</ul>`)
    }
    const name = (state.reportPeople ?? []).find((person: any) => person.email === state.actor?.email)?.name
    return document(title, content, { actor: state.actor, path, feedback, zone, name, layout, eyebrow: above, inlineNotices: url.pathname === '/app/proposal' || Boolean(url.pathname === '/app' && composerRefusal), beforeTitle: url.pathname === '/app/proposal' ? '<p class="breadcrumb"><a href="/app">All proposals</a></p>' : undefined })
  })
}

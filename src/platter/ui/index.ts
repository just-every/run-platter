import { draftSourcesPanel, draftProvenancePanel } from './draft-sources'
import { crmSettings, crmCardPage } from './crm-settings'
import { crmStartPanel, crmSourcePanel } from './crm-start'
import { archivePanel } from './archiving'
import { notificationSettings } from './notifications'
import { trackingPanel, trackingNotices } from './tracking'
import { collaborationSettings } from './collaboration'
import { documentBrandCss } from './blocks'
import { catalogPage } from './catalog'
import { foldersPanel } from './folders'
import { connectionsPanel } from './connections'
import { workspacePanel } from './workspace'
import { libraryPage } from './library'
import { teamPage } from './team'
import { approvalsPage } from './approvals'
import { clientLanguageSettings } from './client-language'
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
  if(!feedback&&url.searchParams.get('mediaUploaded')==='1')feedback={message:'Display media uploaded under your consent. Place it in a block or brand kit and save before sending.'}
  const zone = state.personalTimeZone ?? state.timeZone ?? 'UTC'
  // A refused composer save is shown in the composer's own band, not over the page.
  const composerRefusal = feedback?.error && /^package:/.test(feedback.field ?? '') ? feedback : undefined
  return inZone(zone, () => {
    let content: string | null
    let title: string
    let above = ''
    let layout = ''
    switch (url.pathname) {
      case '/app/catalog': title='Catalog'; content=catalogPage(state); break
      case '/app/library': title='Content library'; content=libraryPage(state,url.searchParams); break
      case '/app/team': title='Team'; content=teamPage(state)+foldersPanel(state)+connectionsPanel(state,true); break
      case '/app/approvals': title='Approvals'; content=approvalsPage(state); break
      case '/app/settings': title = 'Vendor documents'; above = eyebrow('Settings · defaults for new proposals'); content = clientLanguageSettings(state)+trackingPanel(state)+vendorSettings(state)+workspacePanel(state)+connectionsPanel(state,false)+notificationSettings(state)+archivePanel(state)+collaborationSettings(state)+crmSettings(state,feedback)+draftSourcesPanel(state); break
      case '/app/crm-card': title='HubSpot deal'; content=crmCardPage(state,url.searchParams,feedback)+crmStartPanel(state,feedback,url.searchParams); break
      case '/app': title = 'Proposals'; above = eyebrow(`Pipeline · ${count((state.proposals ?? []).length, 'proposal')} · ${count((state.clients ?? []).length, 'client')}`); layout = 'proposals-page'; content = proposalsPage(state, url.searchParams, composerRefusal)+crmStartPanel(state,feedback); break
      case '/app/proposal': {
        const id = url.searchParams.get('id') ?? ''
        title = state.proposals?.find((p: any) => String(p.id) === id)?.title ?? 'Proposal'; above = proposalEyebrow(state, id); layout = 'proposal-page'
        content = proposalPage(state, id, url.searchParams, feedback)+crmSourcePanel(state,id)+draftProvenancePanel(state,id); break
      }
      case '/app/clients': title = 'Clients'; above = eyebrow(`Clients · ${count((state.clients ?? []).length, 'client')} on file`); layout = 'clients-page'; content = clientsPage(state); break
      case '/app/import': title = 'Import'; above = eyebrow('Move in · documents, clients and catalog'); content = importPage(state, feedback); break
      case '/app/access': title = 'Agent access'; above = eyebrow('Agents · keys and send requests'); content = accessPage(state); break
      default: return renderMissing()
    }
    if (content === null) return renderMissing()
    if (state.actor?.role === 'owner' && url.pathname === '/app/proposal' && state.outbox?.length) {
      content += panel('Local development mail', `<p>Messages captured locally for this installation.</p><ul class="records">${state.outbox.map((message: any) => `<li><article><h3>${escape(message.subject)}</h3><p>To: ${escape(message.recipient)} · ${escape(message.status)}</p><p class="preserve">${escape(message.body)}</p></article></li>`).join('')}</ul>`)
    }
    const name = (state.reportPeople ?? []).find((person: any) => person.email === state.actor?.email)?.name
    content=trackingNotices(state)+(content??'')
    return document(title, content, { styles:url.pathname==='/app/proposal'?documentBrandCss(state.proposals?.find((p:any)=>p.id===url.searchParams.get('id'))??{}):undefined,status: feedback?.status, actor: state.actor, path, feedback, zone, name, layout, eyebrow: above, inlineNotices: url.pathname === '/app/proposal' || Boolean(url.pathname === '/app' && composerRefusal), beforeTitle: url.pathname === '/app/proposal' ? '<p class="breadcrumb"><a href="/app">All proposals</a></p>' : undefined })
  })
}

import { escape, field, form, hidden, panel, proposalPath } from './shared'

export function personalTemplates(state: any): string {
 if (!['owner','admin','manager','sales','content_editor'].includes(state.actor?.role) || !state.templates?.length) return ''
 const clients = (state.clients ?? []).map((c: any) => `<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('')
 return panel('Personal templates', '<p>Start an independent draft for a client. Later template changes do not change that draft.</p>'
  + state.templates.map((t: any) => `<article><h3>${escape(t.name)}</h3><p>Version ${escape(t.version)} · your personal template</p>`
   + (clients ? form('template.start', '/app', hidden('id', t.id) + hidden('version', t.version)
    + `<label>Client for ${escape(t.name)}<select name="clientId" required>${clients}</select></label>`
    + field('New proposal title (optional)', 'title', '', 'maxlength="200"') + `<button>Start from ${escape(t.name)}</button>`) : '<p>Add a client to use this template.</p>') + '</article>').join(''))
}

export function savePersonalTemplate(state: any, p: any): string {
 if (!['owner','admin','manager','sales','content_editor'].includes(state.actor?.role) || p.currency !== 'USD') return ''
 const source = hidden('id', p.id) + hidden('version', p.version)
 const replace = (state.templates ?? []).map((t: any) => form('template.save', proposalPath(p.id), source
  + hidden('templateId', t.id) + hidden('templateVersion', t.version) + hidden('name', t.name)
  + `<button class="secondary">Replace ${escape(t.name)} with this revision</button>`)).join('')
 return panel('Save a personal template', '<p>Keep this displayed revision’s content, packages, attachments, PDF-download choice and expiry settings for future drafts. Approvals, client details and signing links are not copied.</p>'
  + form('template.save', proposalPath(p.id), source + field('Template name', 'name', p.title, 'required maxlength="200"') + '<button>Save personal template</button>')
  + (replace ? `<details><summary>Replace an existing personal template</summary>${replace}</details>` : ''))
}

export function starterTemplatesPanel(state: any): string {
 if (!['owner','admin','manager','sales','content_editor'].includes(state.actor?.role)) return ''
 const clients = (state.clients ?? []).map((c: any) => `<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('')
 const choices = (state.starterTemplates ?? []).map((t: any) => `<option value="${escape(t.id)}">${escape(t.name)}</option>`).join('')
 return panel('Starter templates', '<p>Five starting points with example USD pricing. Client and sender details are filled when you start an independent draft. Review scope, prices and terms before approval.</p>'
  + (clients ? form('template.start', '/app', hidden('version', 1)
   + `<label for="starter-template">Starter template</label><select id="starter-template" name="id" required>${choices}</select>`
   + `<label for="starter-client">Client for starter proposal</label><select id="starter-client" name="starterClientId" required>${clients}</select>`
   + '<button>Start starter proposal</button>') : '<p>Add a client to start from Agency, Consultancy, IT managed services, Creative studio or Professional services.</p>'))
}

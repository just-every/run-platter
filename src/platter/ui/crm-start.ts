import { area, escape, field, form, hidden, money, panel, type Feedback } from './shared'

export function crmStartPanel(state: any, feedback?: Feedback, card?: URLSearchParams) {
 return startPanel(state, feedback, card, 'hubspot') + (card ? '' : startPanel(state, feedback, undefined, 'salesforce'))
}
function startPanel(state: any, feedback: Feedback | undefined, card: URLSearchParams | undefined, provider: string) {
 if (!['owner', 'admin'].includes(state.actor?.role)) return ''
 const salesforce = provider === 'salesforce', label = salesforce ? 'Salesforce' : 'HubSpot', sourceName = salesforce ? 'opportunity' : 'deal', prefix = salesforce ? 'crm.opportunity.' : 'crm.deal.'
 const review = feedback?.result?.crmReview && (feedback.result.crmProvider ?? 'hubspot') === provider ? feedback.result : null
 const connected = state.connections?.find((row: any) => row.provider === provider && row.status === 'connected')
 const back = card ? '/app/crm-card?' + card.toString() : '/app'
 const cardFields = card ? hidden('accountId', card.get('accountId')) : ''
 const start = connected ? form(prefix + 'review', back, cardFields + field(label + ' ' + sourceName + ' ID', salesforce ? 'opportunityId' : 'dealId', card?.get('dealId') ?? '', 'required maxlength="100"') + area('Draft scope (optional)', 'crmScope', '', 'maxlength="10000"') + '<button>Read ' + label + ' ' + sourceName + '</button>') : '<p>Connect ' + label + ' under Settings before reading a ' + sourceName + '.</p><a href="/app/settings">Open Settings</a>'
 let contents = '<p>Read a ' + sourceName + ', explicitly select its ' + (salesforce ? 'account' : 'company') + ' and contact, then review an independent USD draft. Collection stays off. Approval and sending require fresh human actions.</p>' + start
 if (review) {
  contents += '<h3>Choose source records</h3>' + (review.held ? '<p role="status">' + escape(review.held) + '</p>' : '')
  contents += form(prefix + 'review', back, cardFields + hidden('dealId', review.dealId) + area('Scope for this draft (optional)', 'crmScope', review.content?.scope ?? review.draftScope ?? '', 'maxlength="10000"')
   + '<label>' + (salesforce ? 'Account from opportunity' : 'Company from deal') + '<select name="companyId" required><option value="">Select company</option>' + review.companies.map((row: any) => '<option value="' + escape(row.id) + '"' + (row.id === review.source?.company.id ? ' selected' : '') + '>' + escape(row.name || 'Name unavailable') + ' · ' + escape(row.id) + '</option>').join('') + '</select></label>'
   + '<label>Contact from ' + sourceName + '<select name="contactId" required><option value="">Select contact</option>' + review.contacts.map((row: any) => '<option value="' + escape(row.id) + '"' + (row.id === review.source?.contact.id ? ' selected' : '') + '>' + escape(row.name || 'Name unavailable') + ' · ' + escape(row.email) + ' · ' + escape(row.id) + '</option>').join('') + '</select></label><button>Review selected ' + sourceName + '</button>')
  if (review.source) contents += '<article aria-label="Reviewed ' + label + ' draft"><h3>Review copied draft</h3><p>' + (review.existingClient ? 'Use the existing client with these exact details.' : 'Create a client with these exact details.') + '</p>' + sourceSummary(review.source)
   + '<p class="preserve">' + escape(review.content.scope) + '</p><p>Draft total: ' + money(review.content.options[0].cents, 'USD') + '. Deposit: 25%. Collection off.</p>'
   + form(prefix + 'apply', '/app', hidden('id', review.id) + hidden('digest', review.digest) + '<label><input type="checkbox" name="consent" value="yes" required>I reviewed the selected records, exact quantities and prices. Create this independent draft.</label><button>Create reviewed draft</button>') + '</article>'
 }
 return panel('Start from ' + label, contents)
}
function sourceSummary(source: any) {
 return '<dl><dt>' + (source.provider === 'salesforce' ? 'Opportunity' : 'Deal') + '</dt><dd>' + escape(source.name) + ' · ' + escape(source.dealId) + '</dd><dt>Company</dt><dd>' + escape(source.company.name) + ' · ' + escape(source.company.id) + '</dd><dt>Contact</dt><dd>' + escape(source.contact.name) + ' · ' + escape(source.contact.email) + ' · ' + escape(source.contact.id) + '</dd></dl>'
  + (source.pricebook ? '<p>Price book: ' + escape(source.pricebook.name) + ' · ' + escape(source.pricebook.id) + '</p>' : '') + '<ul>' + source.lines.map((line: any) => '<li><strong>' + escape(line.name) + '</strong><p>' + escape(line.quantity) + ' × ' + money(Number(line.unitPrice) * 100, 'USD') + '</p><p>Source item: ' + escape(line.id) + '</p>' + (line.productId ? '<p>Product: ' + escape(line.productId) + ' · Price-book entry: ' + escape(line.pricebookEntryId) + '</p>' : '') + '</li>').join('') + '</ul>'
}
export function crmSourcePanel(state: any, id: string) {
 const source = state.crmDraftSources?.find((row: any) => row.proposal_id === id)
 return source ? panel('Copied ' + (source.provider === 'salesforce' ? 'Salesforce' : 'HubSpot') + ' source', '<p>This retained source snapshot is independent of later provider edits. It grants no synchronization or sending authority.</p>' + sourceSummary(JSON.parse(source.source_json))) : ''
}

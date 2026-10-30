import { area, escape, field, form, hidden, money, panel, type Feedback } from './shared'

export function crmSettings(state: any, feedback?: Feedback) {
 if (!['owner', 'admin'].includes(state.actor?.role)) return ''
 return hubspotSettings(state, feedback) + providerSettings(state, 'pipedrive', feedback) + providerSettings(state, 'zoho', feedback)
}
function hubspotSettings(state: any, feedback?: Feedback) {
 if (!['owner', 'admin'].includes(state.actor?.role)) return ''
 const connection = state.connections?.find((c: any) => c.provider === 'hubspot' && c.status === 'connected')
 if (!connection) return panel('HubSpot proposal synchronization', '<p>Connect HubSpot before configuring the app card or reviewing writes.</p>')
 const proposals = (state.proposals ?? []).filter((p: any) => state.crmDraftSources?.some((s: any) => s.proposal_id === p.id && s.provider === 'hubspot') && ['sent', 'accepted', 'withdrawn'].includes(p.status))
 const review = feedback?.result?.crmSyncReview ? feedback.result : null
 const result = feedback?.result?.crmSyncResult ? feedback.result : null
 const writeForm = proposals.length ? form('crm.sync.review', '/app/settings', '<label>Proposal to synchronize<select name="proposalChoice" required>' + proposals.map((p: any) => '<option value="' + escape(p.id) + ':' + p.version + '">' + escape(p.title) + ' · revision ' + p.revision + '</option>').join('') + '</select></label>'
  + field('HubSpot status property', 'statusProperty', review?.plan.mapping.statusProperty ?? '', 'required maxlength="100"') + field('HubSpot protected-link property', 'linkProperty', review?.plan.mapping.linkProperty ?? '', 'required maxlength="100"')
  + area('Source line IDs in row order (optional when names match uniquely)', 'lineIds', review?.plan.mapping.lineIds.join('\n') ?? '', 'maxlength="10000"') + field('HubSpot pipeline ID', 'pipelineId', review?.plan.mapping.pipelineId ?? '', 'required maxlength="100"') + field('Closed won stage ID', 'wonStage', review?.plan.mapping.wonStage ?? '', 'required maxlength="100"') + field('Closed lost stage ID', 'lostStage', review?.plan.mapping.lostStage ?? '', 'required maxlength="100"') + '<button>Review CRM writes</button>') : '<p>Send a reviewed HubSpot draft through ordinary human approval before reviewing CRM writes.</p>'
 let body = '<p>Each review authorizes one exact revision and destination. Nothing runs unattended. Only the protected staff link is shared; client invitation links and private reading details stay private. Timeline activity uses HubSpot notes.</p>' + writeForm
 if (review) body += '<article aria-label="Reviewed HubSpot writes"><h3>Review exact outbound values</h3><p>Account: ' + escape(review.plan.accountId) + ' · Deal: ' + escape(review.plan.dealId) + ' · Revision: ' + review.plan.revision + '</p><p>Status: ' + escape(review.plan.status) + ' · Amount: ' + money(review.plan.totalCents, 'USD') + '</p><p>Separate provider requests can partly succeed. An uncertain write is held and never replayed automatically.</p><ul>' + review.plan.operations.map((o: any) => '<li><strong>' + escape(o.label) + '</strong>' + (o.expectedTotalCents === undefined ? '' : '<p>Row total: ' + money(o.expectedTotalCents, 'USD') + '</p>') + '<dl>' + Object.entries(o.body.properties).map(([key, value]) => '<dt>' + escape(key === 'hs_note_body' ? 'Timeline note' : key === 'hs_timestamp' ? 'Event time' : key) + '</dt><dd class="wrap">' + escape(value) + '</dd>').join('') + '</dl></li>').join('') + '</ul>' + form('crm.sync.apply', '/app/settings', hidden('id', review.id) + hidden('digest', review.digest) + '<label><input type="checkbox" name="consent" value="yes" required>I authorize these exact values, destination, field map and timeline notes now.</label><button>Apply reviewed CRM writes</button>') + '</article>'
 if (result) body += '<p role="status">' + escape(result.message) + ' Confirmed: ' + result.confirmed + ' · Held: ' + result.held + '</p>'
 const receipts = state.crmSyncHistory ?? []
 if (receipts.length) body += '<h3>CRM write receipts</h3><ul>' + receipts.map((r: any) => '<li>Deal ' + escape(r.deal_id) + ' · Revision ' + r.revision + ' · ' + escape(r.status) + (r.provider_id ? ' · Provider record ' + escape(r.provider_id) : '') + '</li>').join('') + '</ul>'
 const card = '<p>Install the modern Platter app card in your own HubSpot account. Configure its app ID and client secret here. Signed reads expose linked proposal titles and status only to current Platter owners and admins. Opening or starting a proposal requires a fresh Platter session. Reconnection and restore invalidate this card authorization.</p>' + form('crm.card.configure', '/app/settings', field('HubSpot installed app ID', 'appId', '', 'required maxlength="100"') + field('HubSpot app client secret', 'clientSecret', '', 'type="password" autocomplete="off" required maxlength="8192"') + '<label><input type="checkbox" name="consent" value="yes" required>I authorize this installed app to read linked proposal titles and status for this account.</label><button>Authorize HubSpot app card</button>') + form('crm.card.configure', '/app/settings', hidden('enabled', 'no') + '<button>Revoke HubSpot app card</button>')
 return panel('HubSpot proposal synchronization', body) + panel('HubSpot app card', card)
}
export function crmCardPage(state: any, params: URLSearchParams, feedback?: Feedback) {
 const dealId = params.get('dealId') ?? '', accountId = params.get('accountId') ?? ''
 const linked = state.crmDraftSources?.filter((s: any) => s.provider === 'hubspot' && s.deal_id === dealId && s.account_id === accountId) ?? []
 return panel('HubSpot deal proposals', '<p>Account ' + escape(accountId) + ' · Deal ' + escape(dealId) + '</p><ul>' + linked.map((s: any) => { const p = state.proposals.find((p: any) => p.id === s.proposal_id); return p ? '<li><a href="/app/proposal?id=' + escape(p.id) + '">' + escape(p.title) + '</a><p>' + escape(p.status) + ' · revision ' + p.revision + '</p></li>' : '' }).join('') + '</ul>')
}

function providerSettings(state: any, provider: string, feedback?: Feedback) {
 const label = provider === 'pipedrive' ? 'Pipedrive' : 'Zoho CRM'
 const connection = state.connections?.find((c: any) => c.provider === provider && c.status === 'connected')
 if (!connection) return panel(label + ' proposal synchronization', '<p>Connect ' + label + ' before reviewing writes.</p>')
 const command = 'crm.' + provider + '.sync.'
 const proposals = (state.proposals ?? []).filter((p: any) => state.crmDraftSources?.some((s: any) => s.proposal_id === p.id && s.provider === provider) && ['sent', 'accepted', 'withdrawn'].includes(p.status))
 const review = feedback?.result?.crmProviderSyncReview && feedback.result.plan.provider === provider ? feedback.result : null
 const result = feedback?.result?.crmProviderSyncResult && feedback.result.provider === provider ? feedback.result : null
 let body = '<p>Review one exact revision, account, destination and field map. Nothing runs unattended. Only the protected staff link and generic lifecycle facts leave Platter. An uncertain write is held for reconciliation and never retried automatically.</p>'
 body += proposals.length ? form(command + 'review', '/app/settings', '<label>' + label + ' proposal to synchronize<select name="proposalChoice" required>' + proposals.map((p: any) => '<option value="' + escape(p.id) + ':' + p.version + '">' + escape(p.title) + ' · revision ' + p.revision + '</option>').join('') + '</select></label>'
  + field(label + ' status field', 'statusProperty', review?.plan.mapping.statusProperty ?? '', 'required maxlength="100"') + field(label + ' protected-link field', 'linkProperty', review?.plan.mapping.linkProperty ?? '', 'required maxlength="100"')
  + area('Source line IDs in row order (optional when names match uniquely)', 'lineIds', review?.plan.mapping.lineIds.join('\n') ?? '', 'maxlength="10000"')
  + (provider === 'pipedrive' ? field('Pipedrive pipeline ID', 'pipelineId', review?.plan.mapping.pipelineId ?? '', 'required maxlength="100"') : '') + field(label + ' Closed won stage', 'wonStage', review?.plan.mapping.wonStage ?? '', 'required maxlength="100"') + '<button>Review ' + label + ' writes</button>') : '<p>Send a reviewed ' + label + ' draft through fresh human approval before reviewing writes.</p>'
 if (review) body += '<article aria-label="Reviewed ' + label + ' writes"><h3>Review exact outbound values</h3><p>Account: ' + escape(review.plan.accountId) + ' · Deal: ' + escape(review.plan.dealId) + ' · Revision: ' + review.plan.revision + '</p><p>Status: ' + escape(review.plan.status) + ' · Amount: ' + money(review.plan.totalCents, 'USD') + '</p><ul>' + review.plan.operations.map((operation: any) => '<li><strong>' + escape(operation.label) + '</strong><p class="wrap">' + escape(JSON.stringify(operation.body)) + '</p></li>').join('') + '</ul>'
  + form(command + 'apply', '/app/settings', hidden('id', review.id) + hidden('digest', review.digest) + '<label><input type="checkbox" name="consent" value="yes" required>I authorize these exact values, destination, field map and timeline notes now.</label><button>Apply reviewed ' + label + ' writes</button>') + '</article>'
 if (result) body += '<p role="status">' + escape(result.message) + ' Confirmed: ' + result.confirmed + ' · Held: ' + result.held + '</p>'
 const receipts = (state.crmProviderSyncHistory ?? []).filter((r: any) => r.provider === provider)
 if (receipts.length) body += '<h3>CRM write receipts</h3><ul>' + receipts.map((r: any) => '<li>Deal ' + escape(r.deal_id) + ' · Revision ' + r.revision + ' · ' + escape(r.status) + (r.provider_id ? ' · Provider record ' + escape(r.provider_id) : '') + '</li>').join('') + '</ul>'
 return panel(label + ' proposal synchronization', body)
}

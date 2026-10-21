import { date, escape, form, hidden, panel, proposalPath } from './shared'

export function pdfPanel(state: any, proposal: any) {
 const downloads = (proposal.pdfDownloads ?? []).map((row: any) => `<li>Revision ${escape(row.revision)} · ${escape(row.option_id)}${JSON.parse(row.selection??'[]').map((x:any)=>' · '+escape(x.label)+' × '+escape(x.quantity)).join('')} · ${date(row.downloaded_at)}</li>`).join('')
 const settings = ['owner','admin'].includes(state.actor?.role) && proposal.status !== 'accepted' ? form('pdf.downloads', proposalPath(proposal.id), hidden('id', proposal.id) + hidden('version', proposal.version) + hidden('enabled', proposal.pdfDownloadsEnabled ? 'no' : 'yes') + `<button>${proposal.pdfDownloadsEnabled ? 'Turn off client PDF downloads' : 'Allow client PDF downloads'}</button>`) : ''
 return panel('Client PDF downloads', `<p>Unsigned PDF downloads are ${proposal.pdfDownloadsEnabled ? 'allowed' : 'off'} for this proposal.</p>${settings}${downloads ? `<ul aria-label="PDF download timeline">${downloads}</ul>` : '<p>No client PDF downloads recorded.</p>'}`)
}

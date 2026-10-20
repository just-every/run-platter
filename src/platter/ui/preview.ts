import { escape, hidden, money, panel, proposalPath } from './shared'
import { document } from './shell'

export function previewBanner(view:any) {
 return panel('Preview',`<p><strong>Revision ${escape(view.revision)} · Viewing as ${escape(view.preview.recipient)} (${escape(view.clientEmail)})</strong></p><p>Preview only. Signing and submissions are disabled.</p><a href="${proposalPath(view.id)}" target="_top">Back to editor</a>`)
}

export function previewSelection(view:any) {
 const selected=view.preview.selection
 const identity=[...new URLSearchParams(view.preview.query)].filter(([key])=>key!=='optionId').map(([key,value])=>hidden(key,value)).join('')
 const choices=view.options.map((option:any)=>`<option value="${escape(option.id)}"${option.id===selected.option.id?' selected':''}>${escape(option.label)}</option>`).join('')
 return panel('Preview selection',`<form method="get" action="/app/preview/client">${identity}<label for="preview-option">Choose one option</label><select id="preview-option" name="optionId">${choices}</select><button>Update preview selection</button></form><output aria-label="Selected total">${money(selected.option.cents,view.currency)}</output><p>Deposit due: <output aria-label="Selected deposit">${money(selected.deposit,view.currency)}</output></p>`)
}

export function previewFrame(row:any,width:string,optionId:string,query:URLSearchParams) {
 const identity=hidden('id',row.id)+hidden('revision',row.revision)+hidden('optionId',optionId)
 const body=`<p><strong>Preview · Revision ${escape(row.revision)} · Viewing as ${escape(row.clientName)} (${escape(row.clientEmail)})</strong></p><p><a href="${proposalPath(row.id)}">Back to editor</a></p><form method="get" action="/app/preview">${identity}<label>Preview width<select name="width"><option value="1440"${width==='1440'?' selected':''}>Desktop — 1440 pixels</option><option value="390"${width==='390'?' selected':''}>Phone — 390 pixels</option></select></label><button>Change preview width</button></form><div class="preview-viewport"><iframe title="Client-page preview" width="${width}" height="1100" src="/app/preview/client?${escape(query)}"></iframe></div>`
 return document('Client-page preview',body)
}

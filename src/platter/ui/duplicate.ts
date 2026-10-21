import { escape, form, hidden, panel, proposalPath } from './shared'

export function duplicatePanel(state:any,p:any) {
 if(!['owner','admin','manager','sales','content_editor','viewer','billing'].includes(state.actor?.role))return ''
 const clients=(state.clients??[]).map((c:any)=>`<option value="${escape(c.id)}"${c.id===p.client_id?' selected':''}>${escape(c.name)}</option>`).join('')
 return panel('Duplicate proposal','<p>Start a separate unapproved draft with this content, prices, attachments and delivery settings. The source agreement stays unchanged.</p>'+form('proposal.duplicate',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+`<label>Copy for client<select name="clientId" required>${clients}</select></label><button>Duplicate proposal</button>`))
}

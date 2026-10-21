import { date, escape, field, form, hidden, panel, proposalPath } from './shared'
import { document } from './shell'

export function withdrawalPanel(state:any,p:any) {
 const outcomes=(p.outcomes??[]).map((o:any)=>`<li>Revision ${escape(o.revision)} · ${escape(o.kind)} · ${escape(o.actor_email)} · ${date(o.occurred_at)}<p class="preserve">${escape(o.reason)}</p></li>`).join('')
 const lost=state.actor?.role==='owner'&&['sent','expired'].includes(p.status)?form('proposal.lose',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+field('Lost reason','reason','','required maxlength="1000"')+'<p>Marks this offer lost and withdraws its client links. No recipient notice is sent.</p><button class="secondary">Mark proposal lost</button>'):''
 const outcomePanel=outcomes||lost?panel('Proposal outcome',(outcomes?`<ol class="records">${outcomes}</ol>`:'')+lost):''
 const rows=(p.withdrawals??[]).map((w:any)=>`<li>Revision ${escape(w.revision)} · ${escape(w.actor_email)} · ${date(w.withdrawn_at)}<p class="preserve">${escape(w.reason)}</p><p>Recipient notice ${w.notice?'queued':'turned off'}.</p></li>`).join('')
 const action=state.actor?.role==='owner'&&['sent','expired'].includes(p.status)?form('proposal.withdraw',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+field('Withdrawal reason','reason','','required maxlength="1000"')+'<label>Recipient notice<select name="notice"><option value="yes">Send withdrawal notice</option><option value="no">Do not send a notice</option></select></label><button>Withdraw proposal</button>'):''
 return outcomePanel+(rows||action?panel('Withdrawal', (p.status==='withdrawn'?'<p>This offer is withdrawn and read-only. Prepare a new revision for approval to send again.</p>':'')+(rows?`<ol class="records">${rows}</ol>`:'')+action):'')
}
export function withdrawnPage(contact:string) {
 return document('Proposal withdrawn',panel('Contact the firm',`<p>This proposal has been withdrawn. Contact <a href="mailto:${escape(contact)}">${escape(contact)}</a>.</p>`),{client:true,status:410})
}

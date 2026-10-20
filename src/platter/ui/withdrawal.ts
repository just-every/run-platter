import { date, document, escape, field, form, hidden, panel, proposalPath } from './shared'

export function withdrawalPanel(state:any,p:any) {
 const rows=(p.withdrawals??[]).map((w:any)=>`<li>Revision ${escape(w.revision)} · ${escape(w.actor_email)} · ${date(w.withdrawn_at)}<p class="preserve">${escape(w.reason)}</p><p>Recipient notice ${w.notice?'queued':'turned off'}.</p></li>`).join('')
 const action=state.actor?.role==='owner'&&['sent','expired'].includes(p.status)?form('proposal.withdraw',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+field('Withdrawal reason','reason','','required maxlength="1000"')+'<label>Recipient notice<select name="notice"><option value="yes">Send withdrawal notice</option><option value="no">Do not send a notice</option></select></label><button>Withdraw proposal</button>'):''
 return rows||action?panel('Withdrawal', (p.status==='withdrawn'?'<p>This offer is withdrawn and read-only. Prepare a new revision for approval to send again.</p>':'')+(rows?`<ol class="records">${rows}</ol>`:'')+action):''
}
export function withdrawnPage(contact:string) {
 return document('Proposal withdrawn',panel('Contact the firm',`<p>This proposal has been withdrawn. Contact <a href="mailto:${escape(contact)}">${escape(contact)}</a>.</p>`),{client:true,status:410})
}

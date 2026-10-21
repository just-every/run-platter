import { followupReasons } from '../followup/queue'
import { area, escape, field, form, hidden, money, panel, proposalPath, empty } from './shared'

export function followupQueuePanel(state:any,owner?:string|null) {
 const queue=state.followups?{...state.followups,rows:state.followups.rows.filter((r:any)=>!owner||(r.ownerId||'unrecorded')===owner)}:null
 if(!queue)return ''
 return panel('Sales follow-ups',`<p>Due dates use each sales owner’s time zone. Oldest due date first, then bounce, question, expiry and engagement; equal reasons use value, sent time and stable proposal id. Sales completion does not resolve delivery corrections.</p>`+(queue.rows.length?`<ol class="records" aria-label="Sales follow-ups">${queue.rows.map((r:any)=>`<li data-followup-id="${escape(r.id)}"><article><h3><a aria-label="Follow up: ${escape(r.title)}" href="${escape(proposalPath(r.id))}">${escape(r.title)}</a></h3><p>${escape(r.action)} · ${escape(r.dueDate)} · ${escape(r.period)}</p><p>${escape(followupReasons[r.reason as keyof typeof followupReasons])} · ${escape(r.owner)} · ${money(r.valueCents,r.currency)}</p></article></li>`).join('')}</ol>`:empty('No open sales follow-ups.')))
}
export function followupPanel(state:any,p:any) {
 if(!p.canSend||p.acceptance||(p.activeWithdrawal&&!p.negotiating))return ''
 const current=state.followups?.rows.find((r:any)=>r.id===p.id)
 return panel('Next sales action',`<p>${current?escape(current.action)+' · Due '+escape(current.dueDate):'Sales follow-up closed.'} Engagement unavailable. Delivery correction authority stays with the sending owner.</p>`
 +form('followup.schedule',proposalPath(p.id),hidden('id',p.id)+field('Next action','action',current?.action,'required maxlength="1000"')+field('Due date','dueDate',current?.dueDate??state.followups.today,'type="date" required')+'<button>Save sales follow-up</button>')
 +(current?form('followup.complete',proposalPath(p.id),hidden('id',p.id)+area('Logged action','action','','required maxlength="1000"')+'<button>Complete sales follow-up</button>')+form('followup.dismiss',proposalPath(p.id),hidden('id',p.id)+field('Dismissal reason','reason','','required maxlength="1000"')+'<button>Dismiss sales follow-up</button>')+form('followup.notify',proposalPath(p.id),hidden('id',p.id)+'<button>Notify sales owner</button>'):'')
 +(state.followupActions?.filter((r:any)=>r.proposal_id===p.id).length?'<ul>'+state.followupActions.filter((r:any)=>r.proposal_id===p.id).map((r:any)=>`<li>${escape(r.kind)}: ${escape(r.action)} · ${escape(r.due_date)}</li>`).join('')+'</ul>':''))
}

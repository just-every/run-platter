import { noticeChannels } from './expiry-notices'
import { date, escape, field, form, hidden, panel, proposalPath } from './shared'

export function renewalNoticePanel(state:any,p:any){
 if(!p.canSend||!state.renewalNotices)return ''
 const rows=state.renewalNotices,s=rows.settings.find((r:any)=>r.proposal_id===p.id),defaults=state.expiryNoticeDefaults
 const d=s??{enabled:defaults.renewal_enabled,lead_days:defaults.renewal_days},path=proposalPath(p.id),base=hidden('id',p.id)+hidden('version',p.version)+hidden('settingsVersion',s?.version??0)
 const events=rows.events.filter((r:any)=>r.proposal_id===p.id),terms=rows.terms.filter((r:any)=>r.proposal_id===p.id),followups=rows.followups.filter((r:any)=>r.proposal_id===p.id)
 const owner=state.expiryNotices.recipients.find((r:any)=>r.proposal_id===p.id)
 const review=terms.length?'<div id="renewal-review"><h3>Review renewal</h3><p>Review the accepted scope and prepare an independent copy if needed. Update its term dates and prices, then use ordinary approval and sending. Automatic renewal preparation remains unavailable.</p>'+
  form('proposal.duplicate','/app',base+hidden('clientId',p.client_id)+field('Renewal copy title','title',p.title.slice(0,180)+' (renewal)','required maxlength="200"')+'<button>Prepare independent renewal copy</button>')+'</div>':''
 return panel('Sender renewal notice','<p>Recipient: '+escape(owner?.name??'Recorded sales owner')+(owner?.email?' · '+escape(owner.email):'')+'. Notices use the selected accepted recurring terms. An unrelated manual sales follow-up stays unchanged.</p>'+
 '<p data-renewal-consent>'+ (rows.active.includes(p.id)?'Authorized for this revision':'Inactive · explicit authorization required')+'</p>'+
 (terms.length?'<ul>'+terms.map((r:any)=>'<li>Term ends '+escape(r.termEnd)+' · next term starts '+escape(r.renewsOn)+'</li>').join('')+'</ul>':'<p>A fixed recurring term must be accepted before a renewal notice can be due. Historical terms are never inferred.</p>')+
 '<details><summary>Renewal notice Settings</summary><p>Save changes, then authorize this revision. Editing cancels previous authorization.</p>'+
 form('notification.renewal',path,base+hidden('action','save')+'<label>Sender renewal notices<select name="enabled"><option value="yes"'+(d.enabled?' selected':'')+'>On</option><option value="no"'+(!d.enabled?' selected':'')+'>Off</option></select></label>'+
 field('Proposal renewal lead days','leadDays',d.lead_days,'type="number" min="1" max="365" required')+noticeChannels(state,p,s,'Renewal')+'<button>Save renewal settings</button>')+'</details>'+
 (d.enabled?form('notification.renewal',path,base+hidden('action','authorize')+'<label><input type="checkbox" name="consent" value="yes" required>I authorize renewal notices to the recorded active sales owner for this revision, these settings and selected channels.</label><button>Authorize renewal notices</button>'):'')+
 form('notification.renewal',path,base+hidden('action','revoke')+'<button class="secondary">Revoke renewal notices</button>')+
 followups.map((r:any)=>'<article><h3>Renewal follow-up · '+escape(r.term_end)+'</h3><p>'+escape(r.action)+' · due '+escape(r.due_date)+'</p>'+(r.closed_at?'<p>Reviewed: '+escape(r.resolution)+' · '+date(r.closed_at)+'</p>':form('notification.renewal.complete',path,hidden('id',p.id)+hidden('termEnd',r.term_end)+field('Renewal review outcome','resolution','','required maxlength="1000"')+'<button>Complete renewal review</button>'))+'</article>').join('')+review+
 (events.length?'<details><summary>Renewal notice history</summary><ul class="records">'+events.map((r:any)=>'<li>'+escape(r.action)+' · Revision '+escape(r.revision)+' · '+escape(r.lead_days)+' days · '+date(r.occurred_at)+'</li>').join('')+'</ul></details>':''))
}

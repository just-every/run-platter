import { date, escape, field, form, hidden, panel, proposalPath } from './shared'

export function expiryNoticeDefaults(state:any){
 const d=state.expiryNoticeDefaults
 if(!d||!['owner','admin'].includes(state.actor?.role))return ''
 return panel('Sender expiry defaults','<p>Defaults for future proposal settings. Saving does not authorize email. Accepted fixed terms can also receive a separate renewal notice.</p>'+
  form('notification.defaults','/app/settings',hidden('version',d.version)+
  '<label>Sender expiry notices<select name="enabled"><option value="yes"'+(d.enabled?' selected':'')+'>On when explicitly authorized</option><option value="no"'+(!d.enabled?' selected':'')+'>Off</option></select></label>'+
  field('Expiry lead days','leadDays',d.lead_days,'type="number" min="1" max="365" required')+renewalFields(d,'Workspace')+'<button>Save sender defaults</button>'))
}

export function expiryNoticePanel(state:any,p:any){
 if(!p.canSend||!state.expiryNoticeDefaults)return ''
 const rows=state.expiryNotices,s=rows.settings.find((r:any)=>r.proposal_id===p.id),d=s??state.expiryNoticeDefaults
 const active=rows.active.includes(p.id)&&['draft','approved','sent','accepted'].includes(p.status),path=proposalPath(p.id),base=hidden('id',p.id)+hidden('version',p.version)+hidden('settingsVersion',s?.version??0)
 const events=rows.events.filter((r:any)=>r.proposal_id===p.id)
 const owner=rows.recipients.find((r:any)=>r.proposal_id===p.id)
 return panel('Sender expiry notice','<p>Recipient: '+escape(owner?.name??'Recorded sales owner')+(owner?.email?' · '+escape(owner.email):'')+'. Email opens a dated follow-up; your existing manual follow-up stays unchanged.</p>'+
 (rows.terms.find((r:any)=>r.proposal_id===p.id)?.endsOn.length?'<p id="renewal-offer">Accepted term ends: '+rows.terms.find((r:any)=>r.proposal_id===p.id).endsOn.map(escape).join(', ')+'. Review a renewal offer through the ordinary proposal preparation and approval process.</p>':'')+
 '<p role="status">'+(active?'Authorized for this revision':'Inactive · explicit authorization required')+'</p>'+
 '<details><summary>Expiry notice Settings</summary><p>Save changes first, then authorize this revision. Settings changes cancel previous authorization.</p>'+
 form('notification.expiry',path,base+hidden('action','save')+'<label>Sender expiry email<select name="enabled"><option value="yes"'+(d.enabled?' selected':'')+'>On</option><option value="no"'+(!d.enabled?' selected':'')+'>Off</option></select></label>'+
 field('Proposal expiry lead days','leadDays',d.lead_days,'type="number" min="1" max="365" required')+renewalFields(d,'Proposal')+'<button>Save expiry settings</button>')+'</details>'+
 (d.enabled||d.renewal_enabled?form('notification.expiry',path,base+hidden('action','authorize')+'<label><input type="checkbox" name="consent" value="yes" required>I authorize the enabled expiry and renewal email notices to the recorded active sales owner for this revision and these settings.</label><button>Authorize expiry email</button>'):'')+
 form('notification.expiry',path,base+hidden('action','revoke')+'<button class="secondary">Revoke expiry email</button>')+
 (events.length?'<details><summary>Expiry notice history</summary><ul class="records">'+events.map((r:any)=>'<li>'+escape(r.action)+' · Revision '+escape(r.revision)+' · '+escape(r.lead_days)+' days · '+date(r.occurred_at)+'</li>').join('')+'</ul></details>':''))
}

function renewalFields(d:any,label:string){
 return '<label>'+label+' renewal notices<select name="renewalEnabled"><option value="yes"'+(d.renewal_enabled?' selected':'')+'>On when explicitly authorized</option><option value="no"'+(!d.renewal_enabled?' selected':'')+'>Off</option></select></label>'+field(label+' renewal lead days','renewalDays',d.renewal_days??30,'type="number" min="1" max="365" required')
}

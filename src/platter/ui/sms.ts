import { area, date, escape, field, form, hidden, panel, proposalPath } from './shared'
import { recipientPlan } from '../recipients'

/** Reuse the proposal's existing Settings disclosure and labelled form controls. */
export function smsPanel(p:any){
 if(!p.canSend||!p.sms)return ''
 const sms=p.sms,path=proposalPath(p.id),identity=hidden('id',p.id)+hidden('version',p.version)
 const current=sms.assents.find((a:any)=>a.id===sms.activeAssentId)
 let html='<p>'+escape(sms.suppression?'This number is suppressed for every SMS purpose. START and sender edits cannot reactivate it.':sms.authorized?'SMS is authorized for the recorded purposes on this invitation.':'SMS is inactive. Record complete recipient assent and explicitly authorize this invitation before sending.')+'</p>'
 html+='<p>SMS assent does not approve the offer or consent to electronic signatures. A new invitation, a changed revision or a restore needs fresh authorization. Quiet hours use the supplied recipient time zone. Completion texts are sent once after the agreement and any required deposit are complete, only when that purpose was permitted.</p>'
 html+='<h3>Recorded assent</h3>'+(sms.assents.length?sms.assents.map((a:any)=>'<details><summary>'+escape(a.firm)+' · '+escape(a.phone)+' · revision '+escape(a.revision)+(a.id===current?.id?' · active':' · history')+'</summary><dl><dt>Recipient</dt><dd>'+escape(a.recipient)+'</dd><dt>Permitted purposes</dt><dd>'+escape(JSON.parse(a.purposes).join(', '))+'</dd><dt>Disclosure shown</dt><dd class="preserve">'+escape(a.disclosure)+'</dd><dt>Assented at</dt><dd>'+date(a.assented_at)+'</dd><dt>Collection method</dt><dd>'+escape(a.method)+'</dd><dt>Recipient evidence</dt><dd class="preserve">'+escape(a.evidence)+'</dd><dt>Recipient time zone</dt><dd>'+escape(a.time_zone)+'</dd><dt>Recorded at</dt><dd>'+date(a.recorded_at)+'</dd></dl></details>').join(''):'<p>No complete recipient assent has been recorded.</p>')
 html+=sms.revocations.map((r:any)=>'<p>SMS authorization revoked '+date(r.revoked_at)+'.</p>').join('')
 if(sms.assents.length||sms.consent)html+=form('sms.revoke',path,identity+'<button class="secondary">Revoke SMS authorization</button>')
 if(p.status==='sent'&&!p.negotiating&&!recipientPlan(p).length&&!sms.suppression){
  html+='<details><summary>Record recipient assent</summary>'+form('sms.configure',path,identity
   +field('Assenting recipient','recipient',p.clientEmail,'required maxlength="254"')
   +field('US mobile number','phone','','required type="tel" autocomplete="tel" maxlength="40"')
   +field('Sending firm','firm','','required maxlength="200"')
   +'<fieldset><legend>Purposes permitted by the recipient</legend>'+[['invitation','Proposal invitations'],['reminder','Proposal reminders'],['identity','Identity verification codes'],['completion','Agreement completion notices']].map(([value,label])=>'<label><input type="checkbox" name="purpose:'+value+'" value="yes">'+label+'</label>').join('')+'</fieldset>'
   +area('Exact disclosure shown','disclosure',sms.disclosure,'required maxlength="4000"')
   +field('Recipient assent time with UTC offset','assentedAt','','required placeholder="2026-10-29T10:00:00Z"')
   +field('Assent collection method','method','','required maxlength="200"')
   +area('Recipient evidence supporting the entry','evidence','','required maxlength="1000"')
   +field('Recipient IANA time zone','timeZone','','required placeholder="America/Los_Angeles" maxlength="100"')
   +'<label><input type="checkbox" name="consent" value="yes" required>I confirm this recipient assent and authorize only these SMS purposes on this exact invitation and revision.</label><button>Record assent and authorize SMS</button>')+'</details>'
 }
 if(current&&p.status==='sent'){
  const purposes=JSON.parse(current.purposes)
  if(purposes.includes('invitation')||purposes.includes('reminder'))html+='<details><summary>Send a proposal text</summary>'+form('sms.send',path,hidden('id',p.id)+hidden('requestId',crypto.randomUUID())+'<label>Text purpose<select name="kind">'+(purposes.includes('invitation')?'<option value="invitation">Proposal invitation</option>':'')+(purposes.includes('reminder')?'<option value="manual">Manual reminder</option>':'')+'</select></label>'+area('Text message','message','','required maxlength="1000"')+'<p>Platter adds the current invitation link during transport. Texts due during quiet hours wait until quiet hours end.</p><button>Send text</button>')+'</details>'
 }
 html+='<h3>Text timeline</h3>'+(sms.messages.length?'<ul class="records">'+sms.messages.map((m:any)=>'<li><div><strong>'+escape(m.kind)+' · '+escape(m.status)+'</strong><p class="preserve">'+escape(m.message)+'</p><p>'+escape(m.phone)+' · '+date(m.queued_at)+(m.status==='queued'?' · due '+date(m.due_at):'')+'</p></div></li>').join('')+'</ul>':'<p>No proposal texts recorded.</p>')
 if(sms.codes.length)html+='<h3>Identity-code history</h3><ul class="records">'+sms.codes.map((c:any)=>'<li>'+date(c.queued_at)+' · generation '+escape(c.generation)+' · '+escape(c.status)+'</li>').join('')+'</ul>'
 return panel('SMS Settings','<details><summary>Inspect SMS consent and texts</summary>'+html+'</details>')
}

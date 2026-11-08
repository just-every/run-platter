import { recipientPlan } from '../recipients'
import { reminderMessageChoice } from './reminder-messages'
import { area, date, escape, field, form, hidden, panel, proposalPath } from './shared'

export function reminderPanel(state:any,p:any){
 if(recipientPlan(p).length)return panel('Reminders','<p>Scheduled and manual reminders for multiple recipients are not available yet. Expiry warnings still reach every unsigned signer.</p>')
 const old=p.reminderSettings?.revision===p.revision?p.reminderSettings:null,base=p.deliveryDefaults??{remindersEnabled:true,reminderDays:[2,5,9],beforeExpiryDays:[3],reminderCap:3}
 const settings=old?JSON.parse(old.settings):{afterDays:base.reminderDays,beforeDays:base.beforeExpiryDays,cap:base.reminderCap},enabled=old?Boolean(old.enabled):base.remindersEnabled
 const optedOut=p.reminderOptouts?.some((o:any)=>o.revision===p.revision),active=Boolean(old?.authorized&&old.enabled)&&!optedOut&&['draft','approved','sent'].includes(p.status)
 let html='<p>'+escape(active?'Scheduled email reminders authorized.':optedOut?'The recipient has stopped reminders for this revision.':'Scheduled email reminders are inactive until a sender supplies the recipient’s IANA time zone and explicitly authorizes them.')+'</p>'
 html+='<p>Schedule: '+escape(enabled?'On':'Off')+' · after sending: '+escape(settings.afterDays.join(', ')||'none')+' days · before expiry: '+escape(settings.beforeDays.join(', ')||'none')+' days · scheduled cap: '+escape(settings.cap)+'. Manual email reminders are separate from this cap.</p>'
 if(p.deliveryPreview){const preview=p.deliveryPreview;html+='<p>Expiry: '+escape(preview.expiryDate??'No expiry')+' ('+escape(preview.timeZone??p.expiry.timeZone)+').'+(preview.provisional?' Dates assume sending today; sending on another day moves the relative dates.':'')+'</p>';if(preview.reminders.length)html+='<p>Planned reminder dates in '+escape(old.time_zone)+' (after quiet hours; at most '+escape(settings.cap)+' scheduled reminders): '+escape(preview.reminders.map((r:any)=>r.date).join(', '))+'.</p>'}
 if(p.canSend&&!p.negotiating&&['draft','approved','sent'].includes(p.status)){
  const identity=hidden('id',p.id)+hidden('version',p.version),selected=settings.messageTemplate,subject=selected?.subject??old?.subject??base.reminderSubject??'Reminder: '+p.title,message=selected?.message??old?.message??base.reminderMessage??'Please review your proposal and verify your email before accepting.'
  html+='<p>Changes are delivery settings: the offer revision and its approval stay the same. Existing and restored schedules require fresh authorization. Client links are added only when sending.</p>'+form('reminder.configure',proposalPath(p.id),identity
   +'<label>Scheduled reminders<select name="enabled"><option value="yes"'+(enabled?' selected':'')+'>On</option><option value="no"'+(!enabled?' selected':'')+'>Off</option></select></label>'
   +field('Recipient IANA time zone','timeZone',old?.time_zone??'','required placeholder="America/Los_Angeles" maxlength="100"')
   +field('Days after sending','afterDays',settings.afterDays.join(', '),'placeholder="2, 5, 9"')+field('Days before expiry','beforeDays',settings.beforeDays.join(', '),'placeholder="3"')+field('Scheduled reminder cap','cap',settings.cap,'type="number" required min="0" max="365"')
   +reminderMessageChoice(state,selected?.id??(old?'':base.reminderTemplateId??undefined))+field('Recipient first name for reminder variables','clientFirstName',selected?.firstName??'','maxlength="100"')+'<button name="loadTemplate" value="yes" class="secondary">Use selected reminder message</button><p>Loading a message turns the schedule off. Review the text and explicitly authorize it again to enable sending.</p>'
   +field('Scheduled reminder subject','subject',subject,'required maxlength="200"')+area('Scheduled reminder message','message',message,'required maxlength="10000"')
   +'<label><input type="checkbox" name="consent" value="yes">I authorize scheduled reminder email for this proposal and confirm the recipient time zone.</label><button>Save reminder settings</button>')
  if(p.status==='sent'&&old&&!optedOut)html+='<h3>Send a manual email reminder</h3><p>This sends immediately, including during quiet hours and when the schedule is off. One manual reminder per recipient calendar day is allowed.</p>'+form('reminder.send',proposalPath(p.id),hidden('id',p.id)+hidden('requestId',crypto.randomUUID())+(selected?hidden('messageTemplateId',selected.id)+hidden('clientFirstName',selected.firstName):'')+field('Manual reminder subject','subject',subject,'required maxlength="200"')+area('Manual reminder message','message',message,'required maxlength="10000"')+'<button>Send manual email reminder</button>')
 }
 const changes=p.deliveryChanges??[]
 if(changes.length)html+='<h3>Delivery settings timeline</h3><ol class="records">'+changes.map((c:any)=>{const s=JSON.parse(c.settings);return '<li><article><p>'+escape(c.actor_email)+' · '+date(c.occurred_at)+' · revision '+escape(c.revision)+'</p><p>'+escape(c.action==='reminder.configure'?`Reminders ${s.enabled?'on':'off'}; after ${s.afterDays.join(', ')||'none'}; before ${s.beforeDays.join(', ')||'none'}; cap ${s.cap}; recipient zone ${s.timeZone}; scheduled consent ${s.consent?'given':'off'}.`:`Expiry ${s.mode==='days'?s.days+' days':s.mode==='date'?s.date:'removed'}; warning ${s.warningDays??'off'}; zone ${s.timeZone}.`)+'</p>'+(s.subject?'<p>'+escape(s.subject)+'</p><p class="preserve">'+escape(s.message)+'</p>':'')+'</article></li>'}).join('')+'</ol>'
 return panel('Email reminders',html)
}
export function reminderPolicyPanel(state:any){
 if(!['owner','admin'].includes(state.actor?.role))return ''
 const p=state.reminderPolicy??{quiet_start:20,quiet_end:8,version:0}
 return panel('Reminder quiet hours','<p>Scheduled email reminders wait until quiet hours end in the recipient’s supplied time zone. Manual email reminders send immediately.</p>'+form('reminder.policy','/app/settings',hidden('version',p.version)+field('Quiet hours start (0–23)','quietStart',p.quiet_start,'type="number" required min="0" max="23"')+field('Quiet hours end (0–23)','quietEnd',p.quiet_end,'type="number" required min="0" max="23"')+'<button>Save reminder quiet hours</button>'))
}

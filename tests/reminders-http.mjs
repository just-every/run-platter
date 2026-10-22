import assert from 'node:assert/strict'
import { harness } from './harness.mjs'

export async function remindersHttp(){
 const mail=[],h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-7000'},outboundService:async request=>{assert.equal(new URL(request.url).hostname,'api.resend.com');mail.push(await request.json());return Response.json({id:'synthetic-platter-'+(7100+mail.length)})}})
 try{
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  const tick=async at=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'}),current=async id=>(await h.state()).proposals.find(p=>p.id===id)
  await tick('2030-03-01T18:00:00Z')
  const people={}
  for(const role of ['admin','manager','sales','content_editor','viewer']){
   const email=role+'@synthetic-platter.example';assert.equal((await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)).status,202)
   const cookie=await h.signIn(email),actor=(await h.state(cookie)).actor;await h.cmd('member.set',{operatorId:actor.id,version:0,role,teams:[]});people[role]={cookie,...actor}
  }
  const unchanged=async fn=>{const tables=['p_personal_templates','p_template_defaults','p_workspace_defaults','p_proposals','p_reminder_settings','p_reminder_authority','p_delivery_changes','p_audit','p_mail'],read=()=>Promise.all(tables.map(t=>h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().then(r=>r.results))),before=await read();await fn();assert.deepEqual(await read(),before)}
  const defaults={version:0,remindersEnabled:true,reminderDays:[3,7],beforeExpiryDays:[],reminderCap:3,expiryDays:30,warningDays:1,paymentMethods:['card','ach']}
  for(const role of ['sales','manager'])await unchanged(()=>h.cmd('workspace.defaults',defaults,people[role].cookie,403))
  await h.cmd('workspace.defaults',defaults,people.admin.cookie)
  const client=await h.cmd('client.save',{name:'Synthetic recipient',email:'client@synthetic-platter.example'}),start=()=>h.cmd('template.start',{id:'starter:consultancy',version:1,clientId:client.id})
  const source=await start(),template=await h.cmd('template.save',{id:source.id,version:1,name:'Delivery template'})
  const override={id:template.id,version:1,remindersSource:'override',expirySource:'override',warningSource:'override',remindersEnabled:true,reminderDays:[2,5,9],beforeExpiryDays:[],reminderCap:3,expiryDays:14,warningDays:1}
  await h.cmd('template.delivery',override)
  await unchanged(()=>h.cmd('template.delivery',override,h.owner,409))
  const templated=await h.cmd('template.start',{id:template.id,version:2,clientId:client.id}),blank=await h.cmd('proposal.prepare',{clientId:client.id,title:'Blank delivery',scope:'A synthetic scope',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
  const expected={[templated.id]:{days:[2,5,9],expiry:'2030-03-15',dates:['2030-03-03','2030-03-06','2030-03-10']},[blank.id]:{days:[3,7],expiry:'2030-03-31',dates:['2030-03-04','2030-03-08']}}
  for(const id of [templated.id,blank.id]){
   const p=await current(id);assert.deepEqual(p.deliveryDefaults.reminderDays,expected[id].days);assert.equal(p.reminderSettings,null);assert.equal(p.deliveryPreview.expiryDate,expected[id].expiry)
   await unchanged(()=>h.cmd('reminder.configure',{id,version:1,enabled:true,timeZone:'America/Los_Angeles'},h.owner,400))
   await unchanged(()=>h.cmd('reminder.configure',{id,version:1,enabled:true,consent:true,timeZone:'Unknown/Zone'},h.owner,400))
   await h.cmd('reminder.configure',{id,version:1,enabled:true,consent:true,timeZone:'America/Los_Angeles'})
   let ready=await current(id);assert.deepEqual(ready.deliveryPreview.reminders.map(r=>r.date),expected[id].dates);assert.equal(ready.revision,1);assert.equal(ready.approved_by,null)
   await h.cmd('proposal.approve',{id,version:2,revision:1});await h.cmd('proposal.send',{id,version:3})
   ready=await current(id);assert.equal(ready.expiry.date,expected[id].expiry);assert.deepEqual(ready.deliveryPreview.reminders.map(r=>r.date),expected[id].dates);assert.equal(ready.deliveryChanges[0].actor_email,h.auth.OWNER_EMAIL)
  }
  const sentTemplate=await current(templated.id),sentBlank=await current(blank.id)
  await h.cmd('template.delivery',{...override,version:2,reminderDays:[4]})
  const newer=await h.cmd('template.start',{id:template.id,version:3,clientId:client.id});assert.deepEqual((await current(newer.id)).deliveryDefaults.reminderDays,[4]);assert.deepEqual((await current(templated.id)).deliveryDefaults,sentTemplate.deliveryDefaults)
  await h.cmd('workspace.defaults',{version:1,expiryDays:45});assert.equal((await current(blank.id)).expiry.date,sentBlank.expiry.date)
  const reminders=id=>mail.filter(m=>m.subject==='Reminder: '+(id===templated.id?sentTemplate.title:sentBlank.title))
  await tick('2030-03-03T17:59:00Z');assert.equal(reminders(templated.id).length,0)
  await tick('2030-03-03T18:00:00Z');assert.equal(reminders(templated.id).length,1);assert.equal(reminders(blank.id).length,0)
  await tick('2030-03-04T18:00:00Z');assert.equal(reminders(blank.id).length,1)
  await tick('2030-03-06T18:00:00Z');assert.equal(reminders(templated.id).length,2)
  await tick('2030-03-08T18:00:00Z');assert.equal(reminders(blank.id).length,2)
  await tick('2030-03-10T17:00:00Z');assert.equal(reminders(templated.id).length,3,'recipient calendar schedule follows DST')
  const before=await current(templated.id),approvedAt=before.approved_at
  await h.cmd('reminder.configure',{id:before.id,version:before.version,enabled:false,timeZone:'America/Los_Angeles',subject:'Edited future reminder',message:'An exact edited reminder.'})
  let changed=await current(before.id);assert.equal(changed.revision,1);assert.equal(changed.approved_at,approvedAt);assert.equal(changed.reminderSettings.authorized,0)
  const manual={id:before.id,requestId:'synthetic-platter-7200',subject:'Manual template follow-up',message:'Please review the agreed start date.'}
  const count=mail.length;await h.cmd('reminder.send',manual);assert.equal(mail.length,count+1);assert.deepEqual(mail.at(-1).to,['client@synthetic-platter.example']);assert.equal(mail.at(-1).subject,manual.subject);assert.ok(mail.at(-1).text.startsWith(manual.message+'\n\n'))
  await h.cmd('reminder.send',{...manual,requestId:'synthetic-platter-7201'},h.owner,429)
  await h.cmd('expiry.set',{id:before.id,version:changed.version,mode:'date',date:'2030-03-22',warningDays:1})
  changed=await current(before.id);assert.equal(changed.expiry.date,'2030-03-22');assert.equal(changed.revision,1);assert.equal(changed.approved_at,approvedAt);assert.equal(changed.deliveryChanges.at(-1).actor_email,h.auth.OWNER_EMAIL);assert.equal(JSON.parse(changed.deliveryChanges.at(-1).settings).date,'2030-03-22')
  // A duplicate takes the edited source snapshot, not the now-different template/workspace.
  const copy=await h.cmd('proposal.duplicate',{id:changed.id,version:changed.version});const copied=await current(copy.id)
  assert.deepEqual(copied.deliveryDefaults,changed.deliveryDefaults);assert.deepEqual(copied.deliveryDefaults.paymentMethods,['card','ach']);assert.equal(copied.expiry.date,'2030-03-22');assert.equal(copied.expiry.sentAt,null);assert.equal(copied.reminderSettings,null);assert.deepEqual(copied.reminderRuns,[]);assert.deepEqual(copied.deliveryChanges,[]);assert.equal(copied.approved_by,null);assert.equal(copied.shareToken,undefined)
  const saved=await h.cmd('template.save',{id:changed.id,version:changed.version,name:'Edited schedule snapshot'}),savedStart=await h.cmd('template.start',{id:saved.id,version:1,clientId:client.id});assert.deepEqual((await current(savedStart.id)).deliveryDefaults,changed.deliveryDefaults)
  // Each template group can follow the current workspace independently.
  await h.cmd('template.delivery',{id:template.id,version:3,remindersSource:'inherit',expirySource:'inherit',warningSource:'inherit'})
  const inherited=await h.cmd('template.start',{id:template.id,version:4,clientId:client.id});assert.deepEqual((await current(inherited.id)).deliveryDefaults.reminderDays,[3,7]);assert.equal((await current(inherited.id)).expiry.days,45);assert.equal((await current(inherited.id)).expiry.warningDays,1)
  await h.cmd('template.delivery',{id:template.id,version:4,remindersSource:'override',expirySource:'inherit',warningSource:'override',reminderDays:[4],beforeExpiryDays:[2],reminderCap:1,warningDays:2})
  const mixed=await h.cmd('template.start',{id:template.id,version:5,clientId:client.id});assert.deepEqual((await current(mixed.id)).deliveryDefaults.reminderDays,[4]);assert.equal((await current(mixed.id)).expiry.days,45);assert.equal((await current(mixed.id)).expiry.warningDays,2)
  // Every current drafting door resolves the same sources; it never copies consent.
  const drafted=await h.cmd('proposal.prepare',{templateId:template.id,templateVersion:5,clientId:client.id});assert.deepEqual((await current(drafted.id)).deliveryDefaults,(await current(mixed.id)).deliveryDefaults);assert.equal((await current(drafted.id)).reminderSettings,null)
  const key=await h.cmd('agent.create',{label:'Synthetic draft agent'}),agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{templateId:template.id,templateVersion:5,clientId:client.id}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200,agent.text);assert.deepEqual((await current(agent.value.id)).deliveryDefaults,(await current(mixed.id)).deliveryDefaults)
  const shared=await h.cmd('template.save',{id:source.id,version:1,name:'Shared delivery',shared:true,shareConsent:true})
  for(const role of ['sales','viewer'])await unchanged(()=>h.cmd('template.delivery',{id:shared.id,version:1,expirySource:'override',expiryDays:1},people[role].cookie,403))
  await h.cmd('template.delivery',{id:shared.id,version:1,expirySource:'override',expiryDays:14},people.admin.cookie)
  await unchanged(()=>h.cmd('template.delivery',{id:template.id,version:5,expiryDays:0},h.owner,400))
  // Editing a later scheduled message preserves the first exact sent copy and claimed slot.
  const editable=await start();await h.cmd('reminder.configure',{id:editable.id,version:1,enabled:true,consent:true,timeZone:'America/Los_Angeles',afterDays:[1,2],beforeDays:[],cap:2,subject:'First scheduled text',message:'Original scheduled body.'});await h.cmd('proposal.approve',{id:editable.id,version:2,revision:1});await h.cmd('proposal.send',{id:editable.id,version:3})
  await tick('2030-03-11T17:00:00Z');assert.equal(mail.filter(m=>m.subject==='First scheduled text').length,1)
  const firstCopy=(await current(editable.id)).reminderRuns[0],edit=await current(editable.id)
  await h.cmd('reminder.configure',{id:editable.id,version:edit.version,enabled:true,consent:true,timeZone:'America/Los_Angeles',subject:'Second scheduled text',message:'Edited second scheduled body.'})
  await tick('2030-03-12T17:00:00Z');assert.equal(mail.filter(m=>m.subject==='First scheduled text').length,1);assert.equal(mail.filter(m=>m.subject==='Second scheduled text').length,1);assert.ok(mail.find(m=>m.subject==='Second scheduled text').text.startsWith('Edited second scheduled body.\n\n'));assert.deepEqual((await current(editable.id)).reminderRuns[0],firstCopy)
  await tick('2030-03-20T23:59:00Z');assert.equal(mail.filter(m=>m.subject==='Expiry warning: '+sentTemplate.title).length,0,'extending inherited expiry moves its warning without a new revision')
  await tick('2030-03-21T00:00:00Z');const warning=mail.filter(m=>m.subject==='Expiry warning: '+sentTemplate.title);assert.equal(warning.length,1);assert.match(warning[0].text,/2030-03-22/)
  await tick('2030-03-21T00:15:00Z');assert.equal(mail.filter(m=>m.subject==='Expiry warning: '+sentTemplate.title).length,1)
  const audit=(await h.send('/api/platter/audit?action=template.delivery',undefined,h.owner)).value.rows;assert.ok(audit.some(r=>r.subject===shared.id&&r.actor_id===people.admin.id))
 }finally{await h.close()}
}

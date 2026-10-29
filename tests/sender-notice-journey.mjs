import { strict as assert } from 'node:assert'

export async function senderNoticeJourney(fixture){
 let race=null
 const h=await fixture(async message=>{if(message.subject==='Agreement renewal approaching'&&race)await race(message)})
 try{
  await h.tick('2033-03-01T12:00:00Z')
  const state=async id=>(await h.state()).proposals.find(p=>p.id===id)
  const defaults=async changes=>{const d=(await h.state()).expiryNoticeDefaults;await h.cmd('notification.defaults',{version:d.version,enabled:Boolean(d.enabled),leadDays:d.lead_days,renewalEnabled:Boolean(d.renewal_enabled),renewalDays:d.renewal_days,...changes})}
  await h.connect('slack');const owner=(await h.state()).actor
  const route=await h.cmd('notification.route',{provider:'slack',event:'followup',kind:'direct',destination:'synthetic-platter-7401',operatorId:owner.id,consent:true})
  const create=async(title,{year=2033,person=h.owner,authorizer=person,enabled,action='authorize',emailEnabled=true,slackRoute='',manual=false}={})=>{
   const p=await h.cmd('proposal.prepare',{clientId:h.client.id,title,scope:'Private renewal scope',depositPercent:'25',packages:[{id:'one',label:'Annual care',price:'1'}],pricingTables:[{optionId:'one',name:'Services',lines:[{name:'Care',quantity:'1',unit:'month',unitPrice:'1200',interval:'monthly',term:12,startsOn:year+'-03-01'}]}]},person)
   await h.cmd('notification.renewal',{id:p.id,version:1,enabled,action,emailEnabled,slackRoute,consent:true},authorizer)
   if(manual)await h.cmd('followup.schedule',{id:p.id,action:'Keep this manual action',dueDate:year+'-03-20'},person)
   await h.cmd('proposal.approve',{id:p.id,version:2,revision:1})
   const sent=await h.cmd('proposal.send',{id:p.id,version:3},person),path=new URL(sent.shareUrl).pathname
   await h.send(path+'/action?name=code.request',{})
   const code=(await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code'").bind(p.id).first()).body.match(/\b\d{6}\b/)[0]
   const verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200)
   assert.equal((await h.send(path+'/action?name=accept',{optionId:'one',name:'Synthetic client',consent:true},verified.cookie)).status,200)
   return p
  }
  const normal=await create('Private renewal normal',{slackRoute:route.id}),manual=await create('Private renewal manual',{manual:true}),revoked=await create('Private renewal revoked'),saved=await create('Private renewal inactive',{action:'save'})
  await h.cmd('notification.renewal',{id:revoked.id,version:(await state(revoked.id)).version,action:'revoke'})
  await defaults({renewalEnabled:false})
  const disabled=await create('Private renewal workspace off',{enabled:undefined})
  assert.equal((await h.state()).renewalNotices.settings.find(r=>r.proposal_id===disabled.id).enabled,0,'Workspace off is copied into the new proposal')
  const retained=(await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(normal.id).first()).snapshot
  const manualBefore=await h.db.prepare('SELECT * FROM p_followups WHERE proposal_id=?').bind(manual.id).first()
  const notices=()=>h.messages.filter(m=>m.subject==='Agreement renewal approaching')
  await h.tick('2034-01-28T23:59:59Z');assert.equal(notices().length,0)
  await Promise.all([h.tick('2034-01-29T00:00:00Z'),h.tick('2034-01-29T00:00:00Z')])
  assert.equal(notices().length,2)
  for(const message of notices()){assert.deepEqual(message.to,[h.auth.OWNER_EMAIL]);assert.match(message.text,/2034-02-28/);assert.match(message.text,/2034-01-29/);assert.doesNotMatch(message.text,/Private renewal|Private renewal scope/)}
  const chat=h.chats.filter(c=>c.value.text?.startsWith('Agreement renewal approaching'))
  assert.equal(chat.length,1);assert.equal(chat[0].value.channel,'synthetic-platter-7004');assert.ok(chat[0].value.text.includes(normal.id));assert.doesNotMatch(chat[0].value.text,/Private renewal/)
  const protectedPage=await h.send('/app/proposal?id='+normal.id)
  assert.equal(protectedPage.status,303);assert.ok(protectedPage.headers.get('location').startsWith('/signin?returnTo='));assert.doesNotMatch(protectedPage.text,/Private renewal/)
  for(const p of [revoked,saved,disabled])assert.ok(!notices().some(m=>m.text.includes(p.id)))
  assert.deepEqual(await h.db.prepare('SELECT * FROM p_followups WHERE proposal_id=?').bind(manual.id).first(),manualBefore)
  let queue=(await h.send('/api/platter/followups',undefined,h.owner)).value
  assert.deepEqual(queue.rows.filter(r=>[normal.id,manual.id].includes(r.id)).map(r=>[r.action,r.dueDate,r.termEnd]),Array(2).fill(['Review renewal proposal','2034-01-29','2034-02-28']))
  await h.cmd('notification.renewal.complete',{id:normal.id,termEnd:'2034-02-28',resolution:'Reviewed the retained scope and opened renewal drafting'})
  queue=(await h.send('/api/platter/followups',undefined,h.owner)).value
  assert.ok(!queue.rows.some(r=>r.id===normal.id));assert.ok(queue.rows.some(r=>r.id===manual.id))
  assert.equal((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(normal.id).first()).snapshot,retained)
  const baseline=await h.state(),version=(await state(normal.id)).version
  await h.cmd('notification.renewal',{id:normal.id,version,action:'authorize'},h.owner,400)
  await h.cmd('notification.renewal',{id:normal.id,version:1,consent:true},h.owner,409)
  assert.deepEqual(await h.state(),baseline,'Refused consent changes no business data')

  await defaults({enabled:true,leadDays:3,renewalEnabled:true,renewalDays:30})
  await h.cmd('notification.expiry',{id:normal.id,version,consent:true})
  const sourceVersion=(await state(normal.id)).version
  const template=await h.cmd('template.save',{id:normal.id,version:sourceVersion,name:'Notice settings template'})
  await h.cmd('template.delivery',{id:template.id,version:1,noticeSource:'override',expiryNoticeDays:4,renewalNoticeDays:40})
  const a=await h.cmd('template.start',{id:template.id,version:2,clientId:h.client.id})
  await h.cmd('template.delivery',{id:template.id,version:2,renewalNoticeDays:20})
  const b=await h.cmd('template.start',{id:template.id,version:3,clientId:h.client.id})
  await defaults({leadDays:5,renewalDays:15})
  await h.cmd('template.delivery',{id:template.id,version:3,noticeSource:'inherit'})
  const c=await h.cmd('template.start',{id:template.id,version:4,clientId:h.client.id})
  await defaults({leadDays:7,renewalDays:25})
  const d=await h.cmd('template.start',{id:template.id,version:4,clientId:h.client.id})
  const copy=await h.cmd('proposal.duplicate',{id:normal.id,version:sourceVersion,clientId:h.client.id,title:'Independent renewal review'})
  const settings=(await h.state()).renewalNotices
  assert.deepEqual([a,b,c,d,copy].map(p=>settings.settings.find(r=>r.proposal_id===p.id).lead_days),[40,20,15,25,30])
  assert.ok([a,b,c,d,copy].every(p=>!settings.active.includes(p.id)))
  const expiryActive=(await h.state()).expiryNotices.active
  assert.ok(expiryActive.includes(normal.id));assert.ok(settings.active.includes(normal.id))
  assert.ok([a,b,c,d,copy].every(p=>!expiryActive.includes(p.id)))
  for(const p of [a,b,c,d,copy]){const draft=await state(p.id);assert.equal(draft.status,'draft');assert.equal(draft.acceptance,undefined);assert.equal(draft.shareToken,undefined)}

  await h.tick('2035-03-01T12:00:00Z');await defaults({renewalEnabled:true,renewalDays:30})
  const email=['notice-sender','synthetic-platter.example'].join(String.fromCharCode(64))
  await h.send('/auth/invite',{email,role:'member',displayName:'Notice sender'},h.owner)
  const person=await h.signIn(email),sender=(await h.state(person)).actor
  const adminEmail=['notice-admin','synthetic-platter.example'].join(String.fromCharCode(64))
  await h.send('/auth/invite',{email:adminEmail,role:'member',displayName:'Notice admin'},h.owner)
  const adminCookie=await h.signIn(adminEmail),admin=(await h.state(adminCookie)).actor
  await h.cmd('member.set',{operatorId:admin.id,version:0,role:'admin',teams:[]})
  const cases=[]
  for(const kind of ['revoke','revoke','edit','edit','demote','demote','authorizer','authorizer'])cases.push({...await create('Private renewal '+kind,{year:2035,person:kind==='demote'?person:h.owner,authorizer:kind==='authorizer'?adminCookie:kind==='demote'?person:h.owner}),kind})
  const slackOnly=await create('Disconnected personal notice',{year:2035,emailEnabled:false,slackRoute:route.id})
  await h.cmd('provider.disconnect',{provider:'slack',version:1})
  const beforeRefusal=await h.state()
  await h.cmd('notification.renewal',{id:normal.id,version,consent:true},person,403)
  assert.deepEqual(await h.state(),beforeRefusal)
  let first,demoted=false,adminDemoted=false
  race=async message=>{
   race=null;first=cases.find(p=>message.text.includes(p.id));assert.ok(first)
   for(const p of cases.filter(p=>p.id!==first.id)){
    if(p.kind==='revoke')await h.cmd('notification.renewal',{id:p.id,version:(await state(p.id)).version,action:'revoke'})
    if(p.kind==='edit')await h.cmd('notification.renewal',{id:p.id,version:(await state(p.id)).version,action:'save',leadDays:29})
    if(p.kind==='demote'&&!demoted){await h.cmd('member.set',{operatorId:sender.id,version:0,role:'content_editor',teams:[]});demoted=true}
    if(p.kind==='authorizer'&&!adminDemoted){await h.cmd('member.set',{operatorId:admin.id,version:1,role:'content_editor',teams:[]});adminDemoted=true}
   }
  }
  const earlier=notices().length
  await h.tick('2036-01-30T00:00:00Z');assert.equal(notices().length,earlier+1)
  const jobs=(await h.db.prepare("SELECT * FROM p_notification_outbox WHERE event_key LIKE 'renewal:%'").all()).results.filter(r=>cases.some(p=>p.id===r.proposal_id))
  assert.equal(jobs.length,8);assert.equal(jobs.filter(r=>r.status==='sent').length,1);assert.equal(jobs.filter(r=>r.status==='withheld').length,7)
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_sender_notice_runs WHERE proposal_id=?').bind(slackOnly.id).first()).n,0)
  await h.tick('2036-01-30T00:00:00Z');assert.equal(notices().length,earlier+1)
  await h.tick('2037-03-01T12:00:00Z')
  const uncertain=await create('Uncertain renewal notice',{year:2037});let attempts=0
  race=async message=>{if(message.text.includes(uncertain.id)){attempts++;throw Error('Synthetic lost notification receipt')}}
  await h.tick('2038-01-29T00:00:00Z');await h.tick('2038-01-29T00:00:00Z')
  assert.equal(attempts,1)
  assert.equal((await h.db.prepare('SELECT status FROM p_notification_outbox WHERE proposal_id=?').bind(uncertain.id).first()).status,'uncertain')
 }finally{await h.close()}
}

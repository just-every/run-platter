import assert from 'node:assert/strict'

/** FOLLOW-002 public-door journey. Called with a fresh harness by platter.test.mjs. */
export async function followupJourney(h, {offer, verified}) {
  const at = Date.parse('2027-03-10T12:00:00Z')
  await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(at).run()
  const owner = (await h.state()).actor
  const queue = async (query = '') => {
    const response = await h.send('/api/platter/followups' + (query ? '?' + query : ''), undefined, h.owner)
    assert.equal(response.status, 200, response.text)
    return response.value
  }
  const current = async id => (await h.state()).proposals.find(p => p.id === id)
  const fixture = {}
  for (const [title, value, dueDate] of [
    ['A', 8000, '2027-03-09'], ['B', 40000, '2027-03-10'],
    ['C', 5000, '2027-03-10'], ['D', 12000, '2027-03-10'],
    ['E', 20000, '2027-03-10'], ['F', 30000, '2027-03-10'],
    ['G', 9000, '2027-03-12'],
  ]) {
    const client = await h.cmd('client.save', {name: 'Follow-up client ' + title, email: title.toLowerCase() + '@followup.example'})
    const p = await h.cmd('proposal.prepare', {...offer, clientId: client.id, title, priceOne: String(value), priceTwo: String(value)})
    const initial = (await queue()).rows.find(row => row.id === p.id)
    assert.ok(initial, 'a new open draft has a follow-up')
    assert.equal(initial.ownerId, owner.id)
    assert.equal(initial.dueDate, '2027-03-10')
    assert.ok(initial.action.trim(), 'a draft has a next action before scheduling')
    await h.cmd('proposal.approve', {id: p.id, version: 1, revision: 1})
    const share = await h.cmd('proposal.send', {id: p.id, version: 2})
    fixture[title] = {id: p.id, path: new URL(share.shareUrl).pathname, valueCents: value * 100, dueDate}
    await h.cmd('followup.schedule', {id: p.id, action: 'Call client ' + title, dueDate})
  }
  // Business fixture metadata stands in for an already authenticated SEND-002 event;
  // signature/correlation behavior is exercised by the existing mail journey.
  const noticeId = 'followup-journey-bounce'
  await h.db.prepare('INSERT INTO p_bounce_notices(id,proposal_id,recipient,sender_id,created_at) VALUES(?,?,?,?,?)')
    .bind(noticeId, fixture.C.id, 'c@followup.example', owner.id, at).run()
  const questionCookie = await verified(h, fixture.D.path)
  const asked = await h.send(fixture.D.path + '/action?name=question.create', {revision: 1, section: 'scope', text: 'Can we move the start date?'}, questionCookie)
  assert.equal(asked.status, 200, asked.text)

  assert.deepEqual((await queue()).rows.map(r=>r.title),['A','C','D','B','F','E','G'],'off means engagement is unavailable, without inferred views')
  await h.cmd('tracking.settings',{enabled:'yes',alerts:'no',retentionDays:90,quietMinutes:30,consent:'yes'})
  for(const title of ['A','E','F'])assert.equal((await h.send(fixture[title].path)).status,200)
  const all = await queue()
  assert.equal(all.today, '2027-03-10')
  assert.equal(all.timeZone, 'UTC')
  assert.deepEqual(all.rows.map(row => row.title), ['A', 'C', 'D', 'F', 'E', 'B', 'G'], 'viewed proposals rank before unopened proposals')
  const measured=await h.send(fixture.F.path),viewId=measured.text.match(/data-engagement-view="([^"]+)"/)[1]
  await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(at+40000).run()
  assert.equal((await h.send(fixture.F.path+'/engagement',{viewId,section:'pricing',milliseconds:40000,optionId:'one'})).status,200)
  const detailed=(await queue()).rows
  assert.deepEqual(detailed.map(r=>r.title),['A','C','D','F','E','B','G'],'section detail preserves the original reason ranks')
  assert.equal(detailed.find(r=>r.title==='F').engagementReason,'Read Pricing for 40.0 seconds')
  await h.send('/auth/invite',{email:['synthetic-platter-queue','example.test'].join('@'),displayName:'Queue admin',role:'member',returnTo:'/app'},h.owner)
  const admin=await h.signIn(['synthetic-platter-queue','example.test'].join('@')),adminId=(await h.state(admin)).actor.id
  await h.cmd('member.set',{operatorId:adminId,version:0,role:'admin',teams:[]})
  const generic=await h.send('/api/platter/followups',undefined,admin);assert.equal(generic.status,200)
  assert.deepEqual(generic.value.rows.map(r=>r.title),['A','C','D','F','E','B','G'])
  assert.equal(generic.value.rows.find(r=>r.title==='F').reason,'viewed')
  assert.ok(generic.value.rows.every(r=>!r.engagementReason),'non-owner queue keeps generic engagement labels')
  await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(at).run()
  assert.equal(all.count, 7)
  for(const [title,period] of [['A','overdue'],['B','today'],['G','upcoming']])assert.equal(all.rows.find(r=>r.title===title).period,period)
  assert.equal(all.totals.find(total => total.currency === 'USD').valueCents, 12400000)
  for (const row of all.rows) {
    assert.equal(row.ownerId, owner.id)
    assert.equal(row.dueDate, fixture[row.title].dueDate)
    assert.equal(row.valueCents, fixture[row.title].valueCents)
    assert.equal(row.engagement, ['A','E','F'].includes(row.title)?'viewed':'unopened')
    assert.ok(row.action.trim())
    assert.ok(row.reason)
    assert.equal(row.revision, 1)
    assert.equal(row.version, (await current(row.id)).version)
  }
  assert.deepEqual((await queue('owner=' + encodeURIComponent(owner.id))).rows.map(row => row.id), all.rows.map(row => row.id))
  assert.equal((await queue('owner=not-an-owner')).count, 0)

  await h.cmd('followup.dismiss', {id: fixture.E.id, reason: ''}, h.owner, 400)
  await h.cmd('followup.complete', {id: fixture.C.id, action: '   '}, h.owner, 400)
  await h.cmd('followup.schedule', {id: fixture.G.id, action: '', dueDate: '2027-03-12'}, h.owner, 400)
  await h.cmd('followup.schedule', {id: fixture.G.id, action: 'Call', dueDate: '2027-02-30'}, h.owner, 400)
  assert.equal((await queue()).count, 7, 'invalid closure and scheduling leave the queue unchanged')

  const invitationsBefore=(await current(fixture.B.id)).deliveries
  const beforeNotice = (await h.state()).outbox.map(mail => mail.id)
  await h.cmd('followup.notify', {id: fixture.B.id})
  assert.deepEqual((await current(fixture.B.id)).deliveries,invitationsBefore,'a sales-owner notice creates no client invitation or sender-correction authority')
  const newMail = (await h.state()).outbox.filter(mail => !beforeNotice.includes(mail.id))
  assert.ok(newMail.some(mail => mail.recipient === owner.email), 'notification reaches the sales owner')
  assert.ok((await queue()).rows.some(row => row.id === fixture.B.id), 'a notification never closes the follow-up')

  const loggedAction = 'Called client C; confirmed address correction is still required'
  await h.cmd('followup.complete', {id: fixture.C.id, action: loggedAction})
  assert.ok(!(await queue()).rows.some(row => row.id === fixture.C.id))
  const bounce = (await h.state()).bounceNotices.find(notice => notice.id === noticeId)
  assert.ok(bounce && !bounce.closed_at, 'completing a sales action preserves the separate correction workflow')
  const audit = await h.send('/api/platter/audit?subject=' + fixture.C.id, undefined, h.owner)
  assert.equal(audit.status, 200, audit.text)
  assert.ok(audit.value.rows.some(row => row.action === 'followup.complete' && row.actor_id === owner.id && row.occurred_at > 0), 'completion records its actor and time')

  await h.cmd('followup.dismiss', {id: fixture.E.id, reason: 'Client requested that we pause calls'})
  assert.ok(!(await queue()).rows.some(row => row.id === fixture.E.id))
  await h.cmd('followup.schedule', {id: fixture.E.id, action: 'Resume the client call', dueDate: '2027-03-11'})
  const reopened = (await queue()).rows.find(row => row.id === fixture.E.id)
  assert.equal(reopened.action, 'Resume the client call')
  assert.equal(reopened.dueDate, '2027-03-11')

  await h.cmd('expiry.set',{id:fixture.G.id,version:(await current(fixture.G.id)).version,mode:'date',date:'2027-03-12'})
  await h.cmd('followup.schedule',{id:fixture.G.id,action:'Review expiry',dueDate:'2027-03-10'})
  assert.equal((await queue()).rows.find(r=>r.id===fixture.G.id).reason,'expiring')
  for(const [date,reason] of [['2027-03-13','expiring'],['2027-03-14','unopened'],['2027-03-10','unopened'],['2027-03-12','expiring']]){await h.cmd('expiry.set',{id:fixture.G.id,version:(await current(fixture.G.id)).version,mode:'date',date});assert.equal((await queue()).rows.find(r=>r.id===fixture.G.id).reason,reason)}
  const matching=(await queue()).rows.filter(r=>r.dueDate==='2027-03-10')
  assert.deepEqual(matching.map(r=>r.title),['D','G','F','B'],'expiry ranks after questions and before unknown engagement')
  await h.cmd('report.time-zone',{timeZone:'Pacific/Honolulu'})
  assert.equal((await queue()).timeZone,'Pacific/Honolulu')
  await h.cmd('report.time-zone',{timeZone:'UTC'})
  const log=(await h.state()).followupActions.find(r=>r.proposal_id===fixture.C.id&&r.kind==='completed')
  assert.equal(log.action,loggedAction);assert.equal(log.actor_id,owner.id);assert.equal(log.occurred_at,at)

  const bCookie = await verified(h, fixture.B.path)
  const accepted = await h.send(fixture.B.path + '/action?name=accept', {name: 'Client B', optionId: 'one', consent: true}, bCookie)
  assert.equal(accepted.status, 200, accepted.text)
  assert.ok(!(await queue()).rows.some(row => row.id === fixture.B.id), 'client acceptance closes its follow-up')
  const d = await current(fixture.D.id)
  await h.cmd('proposal.withdraw', {id: d.id, version: d.version, reason: 'Client cancelled the project', notice: false})
  assert.ok(!(await queue()).rows.some(row => row.id === d.id), 'withdrawal closes question and sales follow-ups')
  assert.ok(!(await h.send('/api/platter/questions', undefined, h.owner)).value.questions.some(question => question.proposal_id === d.id))
  await h.cmd('followup.schedule', {id: d.id, action: 'Reopen withdrawn follow-up', dueDate: '2027-03-11'}, h.owner, 409)

  await h.send('/auth/invite', {email: 'followup-member@studio.example', displayName: 'Sales member', role: 'member', returnTo: '/app'}, h.owner)
  const member = await h.signIn('followup-member@studio.example')
  const scoped=await h.send('/api/platter/followups', undefined, member);assert.equal(scoped.status,200);assert.equal(scoped.value.count,0)
  assert.equal((await h.send('/api/platter/followups')).status, 401)
  for (const [name, input] of [
    ['followup.schedule', {id: fixture.A.id, action: 'Unauthorized call', dueDate: '2027-03-10'}],
    ['followup.complete', {id: fixture.A.id, action: 'Unauthorized completion'}],
    ['followup.dismiss', {id: fixture.A.id, reason: 'Unauthorized dismissal'}],
    ['followup.notify', {id: fixture.A.id}],
  ]) await h.cmd(name, input, member, 403)
  assert.ok((await queue()).rows.some(row => row.id === fixture.A.id), 'denied commands do not alter the owner queue')
  const key=await h.cmd('agent.create',{label:'Sales drafting assistant'})
  assert.equal((await h.send('/api/platter/agent/command',{name:'followup.complete',input:{id:fixture.A.id,action:'Agent attempt'}},'',{authorization:'Bearer '+key.token})).status,403)
  const tied=[]
  for(let i=0;i<3;i++){
    await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(at+(i?2000:1000)).run()
    const client=await h.cmd('client.save',{name:'Juniper Studio '+i,email:`juniper${i}@studio.example`})
    const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Juniper campaign '+i,priceOne:'6000',priceTwo:'6000'})
    await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});await h.cmd('proposal.send',{id:p.id,version:2})
    await h.cmd('followup.schedule',{id:p.id,action:'Call Juniper',dueDate:'2027-04-01'})
    tied.push(p.id)
  }
  assert.deepEqual((await queue()).rows.filter(r=>tied.includes(r.id)).map(r=>r.id),[tied[0],...tied.slice(1).sort()],'earliest first send wins, then stable id')
  await h.db.prepare('UPDATE p_expiry SET sent_at=NULL WHERE proposal_id=?').bind(tied[0]).run()
  assert.deepEqual((await queue()).rows.filter(r=>tied.includes(r.id)).map(r=>r.id),[...tied.slice(1).sort(),tied[0]],'legacy missing sent time sorts last without invented history')
  await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(Date.parse('2027-03-11T01:00:00Z')).run()
  await h.cmd('report.time-zone',{timeZone:'Pacific/Honolulu'});assert.equal((await queue()).today,'2027-03-10')
  await h.cmd('report.time-zone',{timeZone:'UTC'});assert.equal((await queue()).today,'2027-03-11')
}


// One native lifecycle fixture is shared by the HTTP and public CLI journeys.
// Expected history is declared from the performed actions, independently of storage.
export async function followupLifecycle(h, events, messages) {
  const at = Date.parse('2030-06-01T12:00:00Z')
  const tick = async seconds => (await h.mf.getWorker()).scheduled({scheduledTime:new Date(at + seconds * 1000),cron:'*/15 * * * *'})
  await tick(0)
  const owner = (await h.state()).actor
  const recipient=['synthetic-platter-9900','example.test'].join('@')
  const client = await h.cmd('client.save',{name:'Synthetic lifecycle client',email:recipient})
  const fields = {clientId:client.id,title:'Synthetic lifecycle proposal',scope:'Reviewed native scope',optionOne:'One',priceOne:'5000',optionTwo:'Two',priceTwo:'8000',depositPercent:'25'}
  const current = async id => (await h.state()).proposals.find(p=>p.id===id)
  const queue = async () => {
    const r = await h.send('/api/platter/followups',undefined,h.owner)
    assert.equal(r.status,200,r.text)
    return r.value.rows
  }
  const expectedActions = []
  const logged = async (seconds,p,revision,name,input) => {
    await tick(seconds)
    await h.cmd('followup.'+name,{id:p.id,...input})
    expectedActions.push({proposal_id:p.id,revision,kind:{schedule:'scheduled',complete:'completed',dismiss:'dismissed'}[name],action:input.action??input.reason,due_date:name==='schedule'?input.dueDate:'2030-06-02',actor_id:owner.id,occurred_at:at+seconds*1000})
  }
  const start = async title => {
    const p = await h.cmd('proposal.prepare',{...fields,title})
    const row = (await queue()).find(r=>r.id===p.id)
    assert.deepEqual({owner:row.ownerId,action:row.action,due:row.dueDate,revision:row.revision},{owner:owner.id,action:'Approve revision',due:'2030-06-01',revision:1})
    return p
  }
  const invite = async p => {
    const row = await current(p.id)
    await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:row.revision})
    const sent = await h.cmd('proposal.send',{id:p.id,version:row.version+1})
    const path = new URL(sent.shareUrl).pathname
    const requested = await h.send(path+'/action?name=code.request',{})
    assert.equal(requested.status,200,requested.text)
    const mail = messages.findLast(m=>m.subject.includes('verification code'))
    assert.ok(mail,'the verification code reaches the provider edge')
    const verified = await h.send(path+'/action?name=code.verify',{code:mail.text.match(/\b\d{6}\b/)[0]})
    assert.equal(verified.status,200,verified.text)
    return {path,cookie:verified.cookie}
  }
  const c = await start('Lifecycle C')
  await logged(1,c,1,'schedule',{action:'Review initial scope',dueDate:'2030-06-02'})
  await logged(2,c,1,'complete',{action:'Reviewed initial scope with the client'})
  assert.ok(!(await queue()).some(r=>r.id===c.id))
  await tick(3)
  await h.cmd('proposal.revise',{...fields,id:c.id,version:1,title:'Lifecycle C revised',scope:'Revised native scope'})
  const revised = (await queue()).find(r=>r.id===c.id)
  assert.deepEqual({owner:revised.ownerId,action:revised.action,due:revised.dueDate,revision:revised.revision},{owner:owner.id,action:'Approve revision',due:'2030-06-01',revision:2},'a revision starts a fresh action without changing the sales owner')
  const cInvitation = await invite(c)
  await logged(4,c,2,'schedule',{action:'Call about delivery and scope',dueDate:'2030-06-02'})
  const asked = await h.send(cInvitation.path+'/action?name=question.create',{revision:2,section:'scope',text:'Can delivery start next week?'},cInvitation.cookie)
  assert.equal(asked.status,200,asked.text)
  const question = (await current(c.id)).questions.find(q=>q.text==='Can delivery start next week?')
  assert.ok(question,'the client question is retained on the sent revision')
  assert.deepEqual({revision:question.revision,client:question.client_id,section:question.section,time:question.created_at,status:question.status},{revision:2,client:client.id,section:'scope',time:at+4000,status:'open'})
  const invitationMail = messages.find(m=>m.subject==='Your proposal: Lifecycle C revised')
  const bounced = await events.emit(h,invitationMail.id,'email.bounced',{to:recipient,at:Date.now()-1000})
  assert.equal(bounced.status,200,bounced.text)
  const bounce = (await h.state()).bounceNotices.find(n=>n.proposal_id===c.id)
  assert.ok(bounce&&!bounce.closed_at,'the actual signed delivery event opens a correction')
  const beforeRefusal = (await h.state()).followupActions
  await h.cmd('followup.dismiss',{id:c.id,reason:''},h.owner,400)
  assert.deepEqual((await h.state()).followupActions,beforeRefusal,'a missing reason cannot write history')
  await logged(5,c,2,'complete',{action:'Called client; delivery correction and question remain'})
  let state = await h.state()
  assert.ok(!state.followups.rows.some(r=>r.id===c.id))
  assert.ok(state.openQuestions.some(q=>q.id===question.id),'sales completion leaves the unanswered thread open')
  assert.equal(state.bounceNotices.find(n=>n.id===bounce.id).closed_at,null,'sales completion cannot resolve bounce correction')

  const e = await start('Lifecycle E')
  await logged(6,e,1,'schedule',{action:'Review paused work',dueDate:'2030-06-02'})
  await logged(7,e,1,'dismiss',{reason:'Client requested a pause'})
  assert.ok(!(await queue()).some(r=>r.id===e.id))
  await logged(8,e,1,'schedule',{action:'Resume work after client confirmation',dueDate:'2030-06-03'})
  const reopened = (await queue()).find(r=>r.id===e.id)
  assert.equal(reopened.action,'Resume work after client confirmation')
  assert.equal(reopened.dueDate,'2030-06-03')

  const terminal = []
  let acceptanceQuestionId
  for (const [index,kind] of ['acceptance','decline','withdrawal'].entries()) {
    const seconds=9+index
    await tick(seconds)
    const p = await start('Lifecycle '+kind),invitation = await invite(p)
    await logged(seconds,p,1,'schedule',{action:'Discuss '+kind,dueDate:'2030-06-02'})
    if(kind==='acceptance') {
      const before = await current(p.id)
      await h.cmd('followup.notify',{id:p.id})
      assert.ok((await queue()).some(r=>r.id===p.id),'Notify alone leaves the action open')
      assert.deepEqual((await current(p.id)).deliveries,before.deliveries,'Notify creates no client invitation')
      assert.ok(messages.some(m=>m.to.includes(owner.email)&&m.subject==='Sales follow-up: Lifecycle acceptance'))
      const unverified = await h.send(invitation.path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true})
      assert.equal(unverified.status,401,unverified.text)
      assert.ok((await queue()).some(r=>r.id===p.id),'unverified acceptance cannot close work')
      const questionResponse=await h.send(invitation.path+'/action?name=question.create',{revision:1,section:'terms',text:'Will the delivery schedule be confirmed?'},invitation.cookie)
      assert.equal(questionResponse.status,200,questionResponse.text)
      acceptanceQuestionId=(await current(p.id)).questions.find(q=>q.text==='Will the delivery schedule be confirmed?').id
      const accepted = await h.send(invitation.path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},invitation.cookie)
      assert.equal(accepted.status,200,accepted.text)
      assert.equal((await current(p.id)).acceptance.acceptedAt,at+seconds*1000)
      assert.ok((await h.state()).openQuestions.some(q=>q.id===acceptanceQuestionId),'acceptance leaves the unanswered question in its own inbox')
    } else if(kind==='decline') {
      const declined = await h.send(invitation.path+'/action?name=decline',{revision:1,reason:'Budget not approved'},invitation.cookie)
      assert.equal(declined.status,410,declined.text)
      const outcome = (await current(p.id)).outcomes[0]
      assert.deepEqual({kind:outcome.kind,reason:outcome.reason,actor:outcome.actor_id,at:outcome.occurred_at},{kind:'declined',reason:'Budget not approved',actor:client.id,at:at+seconds*1000})
    } else {
      await h.cmd('proposal.withdraw',{id:p.id,version:(await current(p.id)).version,reason:'Project cancelled by the firm',notice:false})
      const withdrawal = (await current(p.id)).withdrawals[0]
      assert.deepEqual({reason:withdrawal.reason,actor:withdrawal.actor_id,at:withdrawal.withdrawn_at},{reason:'Project cancelled by the firm',actor:owner.id,at:at+seconds*1000})
    }
    assert.ok(!(await queue()).some(r=>r.id===p.id),kind+' closes the sales action')
    const beforeDenied = (await h.state()).followupActions
    for(const [name,input] of [['schedule',{action:'Reopen terminal work',dueDate:'2030-06-04'}],['complete',{action:'Repeat closure'}],['dismiss',{reason:'Repeat dismissal'}],['notify',{}]])await h.cmd('followup.'+name,{id:p.id,...input},h.owner,409)
    assert.deepEqual((await h.state()).followupActions,beforeDenied,'closed proposals retain history without further actions')
    terminal.push({id:p.id,...invitation})
  }
  const ids=[c.id,e.id,...terminal.map(p=>p.id)]
  state=await h.state()
  const project = rows => rows.filter(r=>ids.includes(r.proposal_id)).map(({id,...row})=>row).sort((a,b)=>a.occurred_at-b.occurred_at)
  assert.deepEqual(project(state.followupActions),expectedActions,'every action, reason, actor, revision and server time matches the independent history')
  const histories=state.proposals.filter(p=>ids.includes(p.id)).map(p=>({id:p.id,acceptance:p.acceptance,outcomes:p.outcomes,withdrawals:p.withdrawals,questions:p.questions}))
  return {ids,expectedActions,histories,acceptanceQuestionId,acceptedId:terminal[0].id,questionId:question.id,bounceId:bounce.id,cId:c.id,eId:e.id,invitations:[cInvitation,...terminal],project}
}

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

  for(const title of ['A','E','F','B','G'])await h.cmd('tracking.settings',{id:fixture[title].id,enabled:true,alerts:false,quietMinutes:30,retentionDays:90})
  for(const title of ['A','E','F'])assert.equal((await h.send(fixture[title].path)).status,200)
  const all = await queue()
  assert.equal(all.today, '2027-03-10')
  assert.equal(all.timeZone, 'UTC')
  assert.deepEqual(all.rows.map(row => row.title), ['A', 'C', 'D', 'F', 'E', 'B', 'G'], 'real measured views rank above unopened offers')
  assert.equal(all.count, 7)
  for(const [title,period] of [['A','overdue'],['B','today'],['G','upcoming']])assert.equal(all.rows.find(r=>r.title===title).period,period)
  assert.equal(all.totals.find(total => total.currency === 'USD').valueCents, 12400000)
  for (const row of all.rows) {
    assert.equal(row.ownerId, owner.id)
    assert.equal(row.dueDate, fixture[row.title].dueDate)
    assert.equal(row.valueCents, fixture[row.title].valueCents)
    assert.equal(row.engagement, ['A','E','F'].includes(row.title)?'viewed':['B','G'].includes(row.title)?'unopened':'unavailable')
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
  assert.deepEqual(matching.map(r=>r.title),['D','G','F','B'],'expiry ranks after questions and before viewed and unopened engagement')
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

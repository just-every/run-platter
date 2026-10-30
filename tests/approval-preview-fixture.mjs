import assert from 'node:assert/strict'

// Compare populated business history, including every installed lifecycle table.
export async function previewBusiness(h) {
 const tables=(await h.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'p_*' AND name!='p_audit' ORDER BY name").all()).results
 return Object.fromEntries(await Promise.all(tables.map(async({name})=>[name,(await h.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()).results])))
}

export async function managerApprovalPreview(h,input) {
 const email=['synthetic-platter-7220','example.test'].join('@')
 assert.equal((await h.send('/auth/invite',{email,displayName:'Preview manager',role:'member',returnTo:'/app'},h.owner)).status,202)
 const cookie=await h.signIn(email),person=(await h.state(cookie)).actor
 const team=await h.cmd('team.create',{name:'Preview approval team'})
 await h.cmd('member.set',{operatorId:person.id,version:0,role:'manager',teams:[team.id]})
 await h.cmd('team.member',{operatorId:(await h.state()).actor.id,teamId:team.id})
 const policy=(await h.state()).approvalSettings.policy
 await h.cmd('approval.policy',{version:policy.version,required:true,defaultRole:'manager'})
 const proposal=await h.cmd('proposal.prepare',input)
 await h.cmd('proposal.share',{id:proposal.id,operatorId:person.id})
 const requested=await h.cmd('notification.request',{id:proposal.id,version:1,consent:true})
 assert.equal(requested.requests.length,1)
 const request=(await h.cmd('notification.requests',{id:proposal.id})).requests[0]
 assert.equal(request.id,requested.requests[0]);assert.equal(request.approver_id,person.id);assert.equal(request.revision,1)
 const mail=await h.db.prepare('SELECT * FROM p_notification_outbox WHERE request_id=? AND recipient=?').bind(request.id,email).first()
 assert.ok(mail,'the eligible scoped manager receives the explicit request')
 const preview=mail.body.match(/Preview: (https?:\/\/[^\s]+)/)[1]
 assert.equal(preview,h.origin+'/app/preview?id='+proposal.id+'&revision=1','the actual emitted URL identifies revision one')
 const path=new URL(preview).pathname+new URL(preview).search,inner=path.replace('/app/preview?','/app/preview/client?')
 const before=await previewBusiness(h),start=Date.now()
 for(const url of [path,inner]){
  const response=await h.send(url,undefined,cookie)
  assert.equal(response.status,200,response.text);assert.ok(response.text.includes('Revision 1'))
 }
 const end=Date.now()
 assert.deepEqual(await previewBusiness(h),before,'the requested preview changes no business or delivery history')
 const audit=(await h.send('/api/platter/audit?action=proposal.preview&subject='+proposal.id,undefined,h.owner)).value.rows
 assert.equal(audit.length,2)
 for(const row of audit){
  assert.deepEqual({actor:row.actor_id,role:row.actor_role,action:row.action,subject:row.subject},{actor:person.id,role:'manager',action:'proposal.preview',subject:proposal.id})
  assert.ok(row.occurred_at>=start&&row.occurred_at<=end,'preview time comes from the server during this request')
 }
 return {proposal,manager:{...person,email,cookie},request,preview,path,inner,audit}
}

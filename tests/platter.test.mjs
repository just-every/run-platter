import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { run } from './harness.mjs'
const offer={title:'Northstar brand photography',scope:'One studio shoot, edited photographs, and usage licence.',optionOne:'Studio essentials',priceOne:'2400.00',optionTwo:'Full campaign',priceTwo:'4200.00',depositPercent:'25'}
async function draft(h){const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'});const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id});return{client,p}}
async function sent(h){const{client,p}=await draft(h);await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:p.id,version:2});return{client,p,path:new URL(share.shareUrl).pathname}}
async function verified(h,path){let r=await h.send(path+'/action?name=code.request',{});assert.equal(r.status,200,r.text);const mail=(await h.state()).outbox.find(x=>x.subject.includes('verification code'));const code=mail.body.match(/\b\d{6}\b/)[0];r=await h.send(path+'/action?name=code.verify',{code});assert.equal(r.status,200,r.text);assert.ok(r.cookie);return r.cookie}
test('native auth, CSRF, roles and revocable agent boundary',()=>run(async h=>{
 await h.state('',401);await h.cmd('client.save',{name:'Unsafe',email:'a@b.example'},h.owner,403,{origin:'https://elsewhere.example'})
 const key=await h.cmd('agent.create',{label:'Draft assistant'});let r=await h.send('/api/platter/agent/command',{name:'client.save',input:{}},'',{authorization:'Bearer '+key.token});assert.equal(r.status,403)
 const c=await h.cmd('client.save',{name:'Northstar',email:'northstar@studio.example'});r=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:c.id}},'',{authorization:'Bearer '+key.token});assert.equal(r.status,200,r.text)
 r=await h.send('/api/platter/agent/command',{name:'proposal.approve',input:{id:r.value.id,version:1,revision:1}},'',{authorization:'Bearer '+key.token});assert.equal(r.status,403)
 await h.cmd('agent.revoke',{id:key.id});r=await h.send('/api/platter/agent/context',undefined,'',{authorization:'Bearer '+key.token});assert.equal(r.status,401)
 await h.send('/auth/invite',{email:'member@studio.example',displayName:'Studio colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('member@studio.example');await h.cmd('proposal.approve',{id:'anything',version:1,revision:1},member,403);await h.cmd('invoice.export',{id:'anything'},member,403);await h.cmd('import.preview',{csv:'client_id,name,email\na,A,a@b.example'},member,403)
}))
test('PROP-001 / PROP-002 exact approvals, frozen offers and fresh invitations invalidate old authority',()=>run(async h=>{
 const{client,p}=await draft(h);await h.cmd('proposal.approve',{id:p.id,version:1,revision:2},h.owner,409);await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:2,priceOne:'2600'});await h.cmd('proposal.send',{id:p.id,version:3},h.owner,409);await h.cmd('proposal.approve',{id:p.id,version:2,revision:1},h.owner,409);await h.cmd('proposal.approve',{id:p.id,version:3,revision:2});await h.cmd('proposal.send',{id:p.id,version:4});await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:5},h.owner,409)
 const state=await h.state();assert.equal(state.proposals[0].prepared_by,h.auth.OWNER_EMAIL);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_approvals').first()).n,2)
 const before=state.proposals.find(x=>x.id===p.id),oldPath='/p/'+before.shareToken,cookie=await verified(h,oldPath)
 const terms=({title,scope,options,deposit_bps,revision,approved_by,approved_at})=>({title,scope,options,deposit_bps,revision,approved_by,approved_at})
 const invitation=await h.cmd('proposal.send',{id:p.id,version:before.version}),newPath=new URL(invitation.shareUrl).pathname
 assert.notEqual(newPath,oldPath)
 assert.equal((await h.send(oldPath,undefined,cookie)).status,404)
 assert.equal((await h.send(oldPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,404)
 let response=await h.send(newPath,undefined,cookie);assert.equal(response.status,200);assert.match(response.text,/Verify your email/)
 response=await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie);assert.equal(response.status,401)
 const after=(await h.state()).proposals.find(x=>x.id===p.id)
 assert.deepEqual(terms(after),terms(before));assert.equal(after.status,'sent')
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_approvals WHERE proposal_id=?').bind(p.id).first()).n,2,'fresh invitation requires no new approval')
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:after.version,scope:'Changed scope',priceOne:'1'},h.owner,409)
 const newCookie=await verified(h,newPath)
 response=await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},newCookie);assert.equal(response.status,200)
 assert.deepEqual(terms((await h.state()).proposals.find(x=>x.id===p.id)),terms(before))
}))
test('email verification precedes acceptance, code is single-use, immutable option and deposit exported once',()=>run(async h=>{
 const{p,path}=await sent(h);let r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true});assert.equal(r.status,401)
 const cookie=await verified(h,path);r=await h.send(path+'/action?name=code.verify',{code:'000000'});assert.equal(r.status,401)
 r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'other',consent:true},cookie);assert.equal(r.status,400)
 r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:'yes'},cookie);assert.equal(r.status,200,r.text);assert.match(r.text,/Proposal accepted/)
 r=await h.send(path+'/action?name=accept',{name:'Changed',optionId:'one',consent:true},cookie);assert.equal(r.status,200)
 const state=await h.state();assert.equal(state.proposals[0].acceptance.name,'Avery Chen');assert.equal(state.proposals[0].acceptance.totalCents,420000);assert.equal(state.proposals[0].acceptance.depositCents,105000)
 const exports=await Promise.all([h.cmd('invoice.export',{id:p.id}),h.cmd('invoice.export',{id:p.id})]);assert.equal(exports[0].id,exports[1].id);assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_invoices').first()).n,1)
 r=await h.send('/api/platter/invoices/'+exports[0].id+'.csv',undefined,h.owner);assert.equal(r.status,200);assert.match(r.text,/1050\.00/);assert.match(r.text,/No Tax,USD/);assert.match(r.text,/Northstar Coffee/)
}))
test('code attempt limits, resend throttling and revision-bound sessions',()=>run(async h=>{
 const{path}=await sent(h);await h.send(path+'/action?name=code.request',{});assert.equal((await h.send(path+'/action?name=code.request',{})).status,429)
 const code=(await h.state()).outbox.find(x=>x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0];const wrong=code==='000000'?'111111':'000000';for(let n=0;n<5;n++)assert.equal((await h.send(path+'/action?name=code.verify',{code:wrong})).status,401);assert.equal((await h.send(path+'/action?name=code.verify',{code})).status,401)
 const token=path.split('/').at(-1);await h.db.prepare('UPDATE p_shares SET code_expires=? WHERE token=?').bind(Date.now()-1,token).run();assert.equal((await h.send(path+'/action?name=code.verify',{code:'123456'})).status,401)
}))
test('money rejects malformed or unsafe prices and cannot export an unaccepted proposal',()=>run(async h=>{
 const{client,p}=await draft(h);for(const price of ['0','1.234','-4','NaN','10000001'])await h.cmd('proposal.prepare',{...offer,clientId:client.id,priceOne:price},h.owner,400);await h.cmd('invoice.export',{id:p.id},h.owner,409)
}))
test('Client CSV dry run, fingerprint custody, journal, replay and undo through HTTP',()=>run(async h=>{
 const csv=await readFile('fixtures/clients.csv','utf8'),preview=await h.cmd('import.preview',{csv});assert.equal(preview.canApply,true);assert.equal((await h.state()).clients.length,0)
 await h.cmd('import.apply',{csv:csv.replace('@','2@'),fingerprint:preview.fingerprint},h.owner,409)
 let result=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint});for(let n=0;n<20&&result.job.state!=='completed';n++)result=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint});assert.equal(result.job.state,'completed');const journal=await h.cmd('import.journal',{id:result.job.id});assert.ok(journal.originals.length>0);assert.equal((await h.state()).clients.length,3)
 const again=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint});assert.equal(again.job.id,result.job.id)
 let undone=await h.cmd('import.undo',{id:result.job.id});for(let n=0;n<20&&undone.job.state==='undoing';n++)undone=await h.cmd('import.undo',{id:result.job.id});assert.equal(undone.job.state,'undone');assert.equal((await h.state()).clients.length,0)
}))
test('import undo preserves clients with dependent proposals; owner erasure fences unused client',()=>run(async h=>{
 const{client}=await draft(h);await h.cmd('client.erase',{id:client.id,confirmName:'Northstar Coffee'},h.owner,409)
 const other=await h.cmd('client.save',{name:'Temporary enquiry',email:'temporary@studio.example'});await h.cmd('client.erase',{id:other.id,confirmName:'Wrong'},h.owner,400);await h.cmd('client.erase',{id:other.id,confirmName:'Temporary enquiry'});assert.ok(!(await h.state()).clients.some(c=>c.id===other.id));const csv='client_id,name,email\nimported,Longhouse Studio,hello@longhouse.example';const preview=await h.cmd('import.preview',{csv});const applied=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint});await h.cmd('proposal.prepare',{...offer,clientId:'imported'});await h.cmd('import.undo',{id:applied.job.id},h.owner,409);assert.ok((await h.state()).clients.some(c=>c.id==='imported'))
}))
test('COLLAB-003 every saved revision has an author/time, comparisons highlight changes, restore creates unapproved revision four',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {client,p}=await draft(h)
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,scope:'Second draft: two studio shoots.',priceOne:'2800'})
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:2,scope:'Third draft: three shoots and social assets.',priceOne:'3600',optionOne:'Expanded studio'})
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:3})
 const before=await h.state(), revisions=before.revisions.filter(r=>r.proposal_id===p.id)
 assert.deepEqual(revisions.map(r=>r.revision),[3,2,1])
 for(const revision of revisions){assert.equal(revision.prepared_by,h.auth.OWNER_EMAIL);assert.ok(revision.prepared_at>0)}
 const compared=await h.send(`/app/proposal?id=${p.id}&from=1&to=3`,undefined,h.owner)
 assert.equal(compared.status,200);assert.match(compared.text,/<del>One studio shoot, edited photographs, and usage licence\.<\/del>/);assert.match(compared.text,/<ins>Third draft: three shoots and social assets\.<\/ins>/);assert.match(compared.text,/<del>\$2,400\.00 USD<\/del>/);assert.match(compared.text,/<ins>\$3,600\.00 USD<\/ins>/);assert.match(compared.text,/<ins>Expanded studio<\/ins>/)
 await h.cmd('proposal.restore',{id:p.id,version:3,revision:1},h.owner,409)
 await h.send('/auth/invite',{email:'editor@studio.example',displayName:'Proposal editor',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('editor@studio.example')
 await h.cmd('proposal.restore',{id:p.id,version:4,revision:1},member)
 const after=await h.state(), restored=after.proposals.find(row=>row.id===p.id)
 assert.equal(restored.prepared_by,'editor@studio.example');assert.equal(after.revisions.find(r=>r.proposal_id===p.id&&r.revision===4).prepared_by,'editor@studio.example')
 assert.equal(restored.revision,4);assert.equal(restored.version,5);assert.equal(restored.status,'draft');assert.equal(restored.approved_by,null);assert.equal(restored.approved_at,null)
 const fields=({title,scope,client_id,options,deposit_bps})=>({title,scope,client_id,options,deposit_bps})
 assert.deepEqual(fields(restored),fields(revisions.find(row=>row.revision===1).snapshot))
 assert.deepEqual(after.revisions.filter(r=>r.proposal_id===p.id&&r.revision<4),revisions)
 await h.cmd('proposal.send',{id:p.id,version:5},h.owner,409)
 const backwards=await h.send(`/app/proposal?id=${p.id}&from=3&to=2`,undefined,h.owner);assert.match(backwards.text,/<del>Third draft:/);assert.match(backwards.text,/<ins>Second draft:/)
 await h.cmd('proposal.approve',{id:p.id,version:5,revision:4});await h.cmd('proposal.send',{id:p.id,version:6});await h.cmd('proposal.restore',{id:p.id,version:7,revision:1},h.owner,409)
}))

test('NEG-001 negotiated offer requires exact approval, preserves the live offer until send, compares changes and accepts revision two',()=>run(async h=>{
 const {client,p,path}=await sent(h), cookie=await verified(h,path)
 const original=(await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(p.id).first()).snapshot
 const negotiated=await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:3,scope:'Two studio shoots and a campaign licence.',priceOne:'2800'})
 assert.equal(negotiated.revision,2)
 const pending=(await h.state()).proposals.find(row=>row.id===p.id)
 assert.equal(pending.status,'draft');assert.equal(pending.approved_by,null);assert.equal(pending.sentRevision,1)
 let live=await h.send(path,undefined,cookie);assert.equal(live.status,200);assert.match(live.text,/One studio shoot/);assert.ok(!live.text.includes('Two studio shoots'))
 await h.cmd('proposal.send',{id:p.id,version:4},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:4,revision:1},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:4,revision:2})
 const shared=await h.cmd('proposal.send',{id:p.id,version:5}),replacement=new URL(shared.shareUrl).pathname
 assert.notEqual(replacement,path)
 assert.equal((await h.send(path,undefined,cookie)).status,404)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,404)
 live=await h.send(replacement,undefined,cookie);assert.equal(live.status,200);assert.match(live.text,/<del>\$2,400\.00 USD<\/del>/);assert.match(live.text,/<ins>\$2,800\.00 USD<\/ins>/);assert.match(live.text,/Two studio shoots/)
 assert.equal((await h.send(replacement+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,401)
 const fresh=await verified(h,replacement)
 assert.equal((await h.send(replacement+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},fresh)).status,200)
 const accepted=(await h.state()).proposals.find(row=>row.id===p.id)
 assert.equal(accepted.revision,2);assert.equal(accepted.acceptance.revision,2);assert.equal(accepted.acceptance.totalCents,280000);assert.equal(accepted.acceptance.depositCents,70000)
 const saved=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
 assert.equal(JSON.parse(saved.snapshot).scope,'Two studio shoots and a campaign licence.')
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=1').bind(p.id).first()).snapshot,original)
 assert.deepEqual((await h.db.prepare('SELECT revision FROM p_approvals WHERE proposal_id=? ORDER BY revision').bind(p.id).all()).results.map(r=>r.revision),[1,2])
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:accepted.version},h.owner,409)
 // A live offer accepted while its replacement is drafted wins atomically.
 const secondDraft=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Second campaign'})
 await h.cmd('proposal.approve',{id:secondDraft.id,version:1,revision:1})
 const secondShare=await h.cmd('proposal.send',{id:secondDraft.id,version:2})
 const second={p:secondDraft,client,path:new URL(secondShare.shareUrl).pathname}, priorCookie=await verified(h,second.path)
 await h.cmd('proposal.negotiate',{...offer,clientId:second.client.id,id:second.p.id,version:3,priceTwo:'5000'})
 await h.cmd('proposal.approve',{id:second.p.id,version:4,revision:2})
 await h.cmd('proposal.revise',{...offer,clientId:second.client.id,id:second.p.id,version:5,priceTwo:'5100'})
 const edited=(await h.state()).proposals.find(row=>row.id===second.p.id);assert.equal(edited.revision,3);assert.equal(edited.approved_by,null)
 await h.cmd('proposal.send',{id:second.p.id,version:6},h.owner,409)
 assert.equal((await h.send(second.path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},priorCookie)).status,200)
 const firstAccepted=(await h.state()).proposals.find(row=>row.id===second.p.id);assert.equal(firstAccepted.acceptance.revision,1);assert.equal(firstAccepted.acceptance.totalCents,420000)
 await h.cmd('proposal.send',{id:second.p.id,version:firstAccepted.version},h.owner,409)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_negotiations WHERE proposal_id=?').bind(second.p.id).first()).n,0)
}))

test('REPORT-001 thirty proposals filter by recorded owner/status and every field, sort and total exact values without changing ownership',()=>run(async h=>{
 const clients=[]
 for(const [name,email] of [['Northstar Coffee','avery@northstar.example'],['Juniper Design','sam@juniper.example']])clients.push(await h.cmd('client.save',{name,email}))
 const people=[{email:h.auth.OWNER_EMAIL,cookie:h.owner,id:(await h.state()).actor.id}]
 for(const email of ['morgan@studio.example','casey@studio.example']){
  await h.send('/auth/invite',{email,displayName:email.split('@')[0],role:'member',returnTo:'/app'},h.owner)
  const cookie=await h.signIn(email);people.push({email,cookie,id:(await h.state(cookie)).actor.id})
 }
 const fixture=[]
 for(let i=0;i<30;i++){
  const person=people[i%3],client=clients[i%2],input={...offer,clientId:client.id,title:`Campaign ${String(i+1).padStart(2,'0')}`,priceOne:String(1000+i*10),priceTwo:String(2000+i*20)}
  const made=await h.cmd('proposal.prepare',input,person.cookie),status=['draft','approved','sent','accepted'][i%4]
  let version=1
  if(status!=='draft'){await h.cmd('proposal.approve',{id:made.id,version:version++,revision:1})}
  if(['sent','accepted'].includes(status)){
   const shared=await h.cmd('proposal.send',{id:made.id,version:version++})
   if(status==='accepted'){
    const path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path)
    assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
   }
  }
  fixture.push({id:made.id,title:input.title,status,owner:person.id,client:client.id,valueCents:(status==='accepted'?1000+i*10:2000+i*20)*100,nextAction:status==='draft'?'approve':status==='approved'?'send':status==='sent'?'await-client':'export-deposit'})
 }
 const aged=fixture.find(p=>p.status==='draft')
 await h.db.prepare('UPDATE p_proposals SET created_at=? WHERE id=?').bind(Date.now()-3*86400000-3600000,aged.id).run()
 const report=async query=>{const r=await h.send('/api/platter/pipeline'+(query?'?'+query:''),undefined,h.owner);assert.equal(r.status,200,r.text);return r.value}
 const all=await report('sort=value&direction=desc')
 for(const expected of fixture){const actual=all.rows.find(p=>p.id===expected.id);assert.equal(actual.status,expected.status);assert.equal(actual.ownerId,expected.owner);assert.equal(actual.clientId,expected.client);assert.equal(actual.valueCents,expected.valueCents);assert.equal(actual.nextAction,expected.nextAction);assert.equal(actual.age,expected.id===aged.id?3:0)}
 assert.equal(all.count,30);assert.equal(all.totals[0].valueCents,fixture.reduce((n,p)=>n+p.valueCents,0));assert.equal(all.totals[0].count,30)
 assert.deepEqual(all.rows.map(p=>p.id),fixture.toSorted((a,b)=>b.valueCents-a.valueCents||a.title.localeCompare(b.title)).map(p=>p.id))
 const selected=fixture.filter(p=>p.owner===people[1].id&&p.status==='sent'),filtered=await report('owner='+people[1].id+'&status=sent&sort=value')
 assert.deepEqual(filtered.rows.map(p=>p.id),selected.toSorted((a,b)=>a.valueCents-b.valueCents).map(p=>p.id));assert.equal(filtered.totals[0].valueCents,selected.reduce((n,p)=>n+p.valueCents,0))
 for(const [query,expected] of [
  ['client='+clients[0].id,fixture.filter(p=>p.client===clients[0].id)],
  ['minValue=2100&maxValue=2400',fixture.filter(p=>p.valueCents>=210000&&p.valueCents<=240000)],
  ['minAge=0&maxAge=0',fixture.filter(p=>p.id!==aged.id)],['minAge=3&maxAge=3',[aged]],['minAge=4',[]],['nextAction=approve',fixture.filter(p=>p.status==='draft')],
 ])assert.deepEqual(new Set((await report(query)).rows.map(p=>p.id)),new Set(expected.map(p=>p.id)))
 for(const sort of ['status','owner','client','age','nextAction']){
  const rows=(await report('sort='+sort)).rows
  const field=sort==='age'?'age':sort
  for(let i=1;i<rows.length;i++)assert.ok(sort==='age'?rows[i-1][field]<=rows[i][field]:rows[i-1][field].localeCompare(rows[i][field])<=0)
 }
 for(const query of ['sort=invalid','status=paid','minValue=1.234','minAge=-1','minValue=20&maxValue=10'])assert.equal((await h.send('/api/platter/pipeline?'+query,undefined,h.owner)).status,400)
 assert.equal((await h.send('/api/platter/pipeline',undefined,people[1].cookie)).status,403)
 assert.equal((await h.send('/api/platter/pipeline')).status,401)
 const owned=fixture.find(p=>p.status==='draft'&&p.owner===people[1].id)
 await h.cmd('proposal.revise',{...offer,clientId:owned.client,id:owned.id,version:1},h.owner)
 assert.equal((await report()).rows.find(p=>p.id===owned.id).ownerId,people[1].id,'later editor never becomes the sales owner')
 const key=await h.cmd('agent.create',{label:'Campaign assistant'})
 const agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:clients[0].id}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200)
 assert.equal((await report()).rows.find(p=>p.id===agent.value.id).ownerId,people[0].id,'agent draft belongs to the recorded key owner')
 const accepted=fixture.find(p=>p.status==='accepted');await h.cmd('invoice.export',{id:accepted.id})
 assert.equal((await report()).rows.find(p=>p.id===accepted.id).nextAction,'complete')
}))

test('TEAM-004 current person, agent, invitation, signature, native, import and invoice actions have searchable/exportable actors and times',()=>run(async h=>{
 const first=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 assert.ok(first.some(r=>r.action==='native.auth.bootstrap'&&r.actor_role==='owner'))
 const{client,p}=await draft(h)
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,scope:'A second draft'})
 await h.cmd('proposal.restore',{id:p.id,version:2,revision:1})
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:3})
 const shared=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(shared.shareUrl).pathname
 await h.send(path)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:5,scope:'A negotiated draft'})
 const cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
 const invoice=await h.cmd('invoice.export',{id:p.id})
 await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,h.owner)
 const key=await h.cmd('agent.create',{label:'Private credential label'})
 const agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:client.id}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200)
 await h.cmd('agent.revoke',{id:key.id})
 const spare=await h.cmd('client.save',{name:'Unused person',email:'unused@studio.example'})
 await h.cmd('client.erase',{id:spare.id,confirmName:'Unused person'})
 const csv='client_id,name,email\naudit-import,Imported person,imported@studio.example'
 const preview=await h.cmd('import.preview',{csv}),applied=await h.cmd('import.apply',{csv,fingerprint:preview.fingerprint})
 await h.cmd('import.journal',{id:applied.job.id});await h.cmd('import.undo',{id:applied.job.id})
 await h.send('/auth/invite',{email:'member@studio.example',displayName:'Studio colleague',role:'member',returnTo:'/app'},h.owner)
 await h.signIn('member@studio.example')
 const operators=(await h.send('/auth/operators',undefined,h.owner)).value
 const memberId=(Array.isArray(operators)?operators:operators.operators).find(o=>o.email==='member@studio.example').id
 const roleChange=await h.send('/auth/operator/role',{operatorId:memberId,role:'admin'},h.owner);assert.equal(roleChange.status,200,roleChange.text)
 assert.equal((await h.send('/auth/operator/role',{operatorId:memberId,role:'member'},h.owner)).status,200)
 const settings=await h.send('/auth/settings/identity',{idpSignIn:false},h.owner);assert.equal(settings.status,200,settings.text)
 const member=await h.signIn('member@studio.example')
 const before=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const route of ['/api/platter/audit','/api/platter/audit.csv','/app/audit'])assert.equal((await h.send(route,undefined,member)).status,403)
 await h.cmd('proposal.approve',{id:agent.value.id,version:1,revision:1},member,403)
 const rows=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 assert.deepEqual(rows,before,'refusals have no write')
 const actions=['client.save','client.erase','proposal.prepare','proposal.revise','proposal.restore','proposal.approve','proposal.send','proposal.negotiate','proposal.view','code.request','code.verify','proposal.accept','invoice.export','invoice.download','agent.create','agent.revoke','import.preview','import.apply','import.journal','import.undo','native.auth.bootstrap','native.auth.invite','native.auth.magic-link','native.auth.confirm','native.auth.operator.role','native.auth.settings.identity']
 for(const action of actions){const found=rows.filter(r=>r.action===action);assert.ok(found.length,action);assert.ok(found.every(r=>r.actor_id&&r.actor_role&&r.subject&&Number.isSafeInteger(r.occurred_at)&&r.occurred_at>0),action)}
 assert.ok(rows.some(r=>r.action==='proposal.prepare'&&r.subject===agent.value.id&&r.actor_id==='agent:'+key.id&&r.actor_role==='agent'))
 assert.ok(rows.some(r=>r.action==='proposal.accept'&&r.subject===p.id&&r.actor_id===client.id&&r.actor_role==='client'))
 assert.ok(rows.some(r=>r.action==='proposal.view'&&r.subject===p.id&&r.actor_id==='unidentified'&&r.actor_role==='invitation'))
 const who=(await h.state()).actor.id
 assert.ok(rows.some(r=>r.action==='proposal.approve'&&r.actor_id===who&&r.actor_role==='owner'))
 for(const [query,expected] of [
  ['action=proposal.prepare',rows.filter(r=>r.action==='proposal.prepare')],
  ['actor='+encodeURIComponent('agent:'+key.id),rows.filter(r=>r.actor_id==='agent:'+key.id)],
  ['subject='+p.id,rows.filter(r=>r.subject===p.id)],
  ['q='+p.id,rows.filter(r=>[r.actor_id,r.action,r.subject].some(v=>v.toLowerCase().includes(p.id.toLowerCase())))],
  ['from='+rows[0].occurred_at+'&to='+rows[0].occurred_at,rows.filter(r=>r.occurred_at===rows[0].occurred_at)],
 ]){
  assert.deepEqual((await h.send('/api/platter/audit?'+query,undefined,h.owner)).value.rows,expected)
  const exported=await h.send('/api/platter/audit.csv?'+query,undefined,h.owner);assert.equal(exported.status,200)
  const fields=['id','actor_id','actor_role','action','subject','occurred_at']
  const decoded=exported.text.trim().split('\r\n').slice(1).map(line=>line.slice(1,-1).split('","'))
  assert.deepEqual(decoded,expected.map(r=>fields.map(f=>String(r[f]))))
 }
 assert.ok(rows.some(r=>r.action==='native.auth.operator.role'&&r.subject===memberId&&r.actor_id===who))
 const serialized=JSON.stringify(rows)
 for(const sensitive of [key.token,cookie.split('=')[1],path.slice(3),'Private credential label','Unused person','imported@studio.example','A negotiated draft'])assert.ok(!serialized.includes(sensitive),'audit excludes credentials and input payloads')
 assert.equal((await h.send('/api/platter/audit?from=invalid',undefined,h.owner)).status,400)
 assert.equal((await h.send('/api/platter/audit',undefined,'')).status,401)
}))

test('AI-003 MCP client searches, drafts, reads engagement and queues exact revisions without authority to approve/send/sign/refund',()=>run(async h=>{
 const endpoint='/api/platter/agent/mcp',key=await h.cmd('agent.create',{label:'MCP assistant'})
 let sequence=0
 const transport=async(method,params={},token=key.token,extra={})=>h.send(endpoint,{jsonrpc:'2.0',id:++sequence,method,params},'',{authorization:'Bearer '+token,accept:'application/json, text/event-stream','mcp-protocol-version':'2025-06-18',...extra})
 const rpc=async(method,params={})=>{const r=await transport(method,params);assert.equal(r.status,200,r.text);assert.ok(!r.value.error,r.text);return r.value.result}
 const call=async(name,args={})=>{const result=await rpc('tools/call',{name,arguments:args});assert.ok(!result.isError,JSON.stringify(result));return JSON.parse(result.content[0].text)}
 assert.equal((await h.send(endpoint,{jsonrpc:'2.0',id:1,method:'ping'})).status,401)
 const initialized=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'Platter acceptance MCP client',version:'1'}})
 assert.equal(initialized.protocolVersion,'2025-06-18');assert.ok(initialized.capabilities.tools)
 const notified=await h.send(endpoint,{jsonrpc:'2.0',method:'notifications/initialized'},'',{authorization:'Bearer '+key.token});assert.equal(notified.status,202);assert.equal(notified.text,'')
 const listed=await rpc('tools/list');assert.ok(listed.tools.every(t=>t.inputSchema.type==='object'));assert.deepEqual(listed.tools.map(t=>t.name).sort(),['prepare_proposal','read_engagement','read_proposal','request_send','revise_proposal','search_proposals'])
 const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
 const found=await call('search_proposals',{query:'Northstar'});assert.ok(found.clients.some(c=>c.id===client.id));assert.equal(found.proposalCount,0)
 const p=await call('prepare_proposal',{...offer,depositPercent:25,clientId:client.id})
 let current=await call('read_proposal',{id:p.id});assert.equal(current.status,'draft');assert.equal(current.prepared_by,'agent:'+key.id);assert.ok(!current.shareToken)
 assert.ok((await call('search_proposals',{query:'photography',status:'draft',limit:1})).proposals.some(x=>x.id===p.id))
 const engagement=await call('read_engagement',{id:p.id});assert.equal(engagement.viewTracking.available,false);assert.equal(engagement.sectionReading.available,false);assert.equal(engagement.acceptance,null);assert.equal(engagement.delivery,null)
 const before=await h.state(),requested=await call('request_send',{id:p.id,revision:1}),again=await call('request_send',{id:p.id,revision:1})
 assert.equal(again.request.id,requested.request.id)
 const queued=await h.send('/api/platter/send-requests',undefined,h.owner);assert.equal(queued.status,200);assert.equal(queued.value.requests.length,1);assert.equal(queued.value.requests[0].actionable,1)
 const after=await h.state();assert.deepEqual(after.proposals,before.proposals);assert.deepEqual(after.outbox,before.outbox)
 for(const name of ['approve','proposal.approve','send','proposal.send','sign','refund']){
  const refused=await rpc('tools/call',{name,arguments:{id:p.id}});assert.equal(refused.isError,true);assert.match(refused.content[0].text,/Forbidden/)
 }
 await h.cmd('proposal.send',{id:p.id,version:1},h.owner,409)
 await h.cmd('send-request.resolve',{id:requested.request.id,status:'fulfilled'},h.owner,409)
 const changed=await call('revise_proposal',{...offer,depositPercent:25,clientId:client.id,id:p.id,version:1,scope:'A revised campaign plan'})
 assert.equal(changed.revision,2);assert.equal((await h.send('/api/platter/send-requests',undefined,h.owner)).value.requests[0].actionable,0)
 const stale=await rpc('tools/call',{name:'request_send',arguments:{id:p.id,revision:1}});assert.equal(stale.isError,true)
 await h.cmd('send-request.resolve',{id:requested.request.id,status:'dismissed'})
 const next=await call('request_send',{id:p.id,revision:2})
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:2});const sent=await h.cmd('proposal.send',{id:p.id,version:3})
 await h.cmd('send-request.resolve',{id:next.request.id,status:'fulfilled'})
 current=await call('read_proposal',{id:p.id});assert.equal(current.status,'sent');assert.ok(!JSON.stringify(current).includes(new URL(sent.shareUrl).pathname.slice(3)))
 const finalQueue=(await h.send('/api/platter/send-requests',undefined,h.owner)).value.requests
 assert.deepEqual(finalQueue.map(r=>r.status).sort(),['dismissed','fulfilled'])
 const malformed=await transport('tools/call',{name:'prepare_proposal',arguments:{...offer,depositPercent:25,clientId:client.id,extra:'refused'}});assert.equal(malformed.value.error.code,-32602)
 assert.equal((await transport('ping',{},key.token,{origin:'https://foreign.example'})).status,403)
 assert.equal((await transport('ping',{},key.token,{'mcp-protocol-version':'unsupported'})).status,400)
 assert.equal((await h.send(endpoint,undefined,'',{authorization:'Bearer '+key.token})).status,405)
 await h.send('/auth/invite',{email:'mcp-member@studio.example',displayName:'MCP member',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('mcp-member@studio.example')
 assert.equal((await h.send('/api/platter/send-requests',undefined,member)).status,403)
 await h.cmd('send-request.resolve',{id:next.request.id,status:'dismissed'},member,403)
 const audit=(await h.send('/api/platter/audit?actor='+encodeURIComponent('agent:'+key.id),undefined,h.owner)).value.rows
 for(const action of ['mcp.search_proposals','mcp.prepare_proposal','mcp.read_proposal','mcp.read_engagement','mcp.request_send','mcp.revise_proposal'])assert.ok(audit.some(row=>row.action===action&&row.actor_role==='agent'),action)
 await h.cmd('agent.revoke',{id:key.id});assert.equal((await transport('ping')).status,401)
}))

test('NEG-002 / TEAM-004 opt-in tracked terms edits accept one/reject one into revision two, preserve offer and require fresh approval',()=>run(async h=>{
 const {client,p}=await draft(h)
 await h.cmd('proposal.revise',{...offer,terms:'Delivery in 14 days. Usage for one year.',clientId:client.id,id:p.id,version:1})
 await h.cmd('proposal.approve',{id:p.id,version:2,revision:2})
 const shared=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path)
 const input={section:'terms',revision:2,original:'14 days',replacement:'21 days'}
 assert.equal((await h.send(path+'/action?name=suggestion.create',input,cookie)).status,409)
 await h.cmd('suggestions.allow',{id:p.id,version:4,section:'terms',enabled:true})
 assert.equal((await h.send(path+'/action?name=suggestion.create',input)).status,401)
 assert.equal((await h.send(path+'/action?name=suggestion.create',{...input,section:'priceOne'},cookie)).status,400)
 assert.equal((await h.send(path+'/action?name=suggestion.create',{...input,revision:1},cookie)).status,409)
 assert.equal((await h.send(path+'/action?name=suggestion.create',input,cookie)).status,200)
 assert.equal((await h.send(path+'/action?name=suggestion.create',{...input,original:'one year',replacement:'forever'},cookie)).status,200)
 let row=(await h.state()).proposals.find(x=>x.id===p.id)
 assert.equal(row.suggestions.length,2);assert.ok(row.suggestions.every(s=>s.client_id===client.id&&s.revision===2&&s.created_at))
 const good=row.suggestions.find(s=>s.replacement==='21 days'),bad=row.suggestions.find(s=>s.replacement==='forever')
 const frozen=(await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()).snapshot
 await h.cmd('suggestion.resolve',{id:p.id,version:row.version,suggestionId:good.id,decision:'accepted'})
 row=(await h.state()).proposals.find(x=>x.id===p.id)
 await h.cmd('suggestion.resolve',{id:p.id,version:row.version,suggestionId:bad.id,decision:'rejected'})
 row=(await h.state()).proposals.find(x=>x.id===p.id)
 assert.equal(row.revision,3);assert.equal(row.terms,'Delivery in 21 days. Usage for one year.');assert.equal(row.approved_by,null);assert.deepEqual(row.options,JSON.parse(frozen).options)
 const live=await h.send(path,undefined,cookie);assert.match(live.text,/Delivery in 14 days/)
 await h.cmd('proposal.send',{id:p.id,version:row.version},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:3})
 row=(await h.state()).proposals.find(x=>x.id===p.id)
 const next=await h.cmd('proposal.send',{id:p.id,version:row.version}),nextPath=new URL(next.shareUrl).pathname
 assert.equal((await h.send(path,undefined,cookie)).status,404)
 assert.match((await h.send(nextPath)).text,/Delivery in 21 days\. Usage for one year\./)
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()).snapshot,frozen)
 // The stated acceptance journey starts from a terms-bearing first revision.
 const q=await h.cmd('proposal.prepare',{...offer,clientId:client.id,terms:'Delivery in 14 days. Usage for one year.'})
 await h.cmd('proposal.approve',{id:q.id,version:1,revision:1});const s=await h.cmd('proposal.send',{id:q.id,version:2}),qpath=new URL(s.shareUrl).pathname,qcookie=await verified(h,qpath)
 await h.cmd('suggestions.allow',{id:q.id,version:3,section:'terms',enabled:true})
 for(const edit of [input,{...input,original:'one year',replacement:'forever'}])assert.equal((await h.send(qpath+'/action?name=suggestion.create',{...edit,revision:1},qcookie)).status,200)
 let r=(await h.state()).proposals.find(x=>x.id===q.id)
 for(const replacement of ['21 days','forever']){await h.cmd('suggestion.resolve',{id:q.id,version:r.version,suggestionId:r.suggestions.find(x=>x.replacement===replacement).id,decision:replacement==='21 days'?'accepted':'rejected'});r=(await h.state()).proposals.find(x=>x.id===q.id)}
 assert.equal(r.revision,2);assert.equal(r.terms,'Delivery in 21 days. Usage for one year.');assert.equal(r.suggestions.find(x=>x.replacement==='forever').decision,'rejected')
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const action of ['suggestions.allow','suggestion.create','suggestion.resolve']){const rows=audit.filter(x=>x.action===action);assert.ok(rows.length);assert.ok(rows.every(x=>x.subject&&x.occurred_at&&x.actor_id));if(action==='suggestion.create')assert.ok(rows.every(x=>x.actor_role==='client'&&x.actor_id===client.id))}
 assert.ok(!JSON.stringify(audit).includes('21 days'))
}))

test('EDIT-010 / TEAM-004 defaults and arbitrary files freeze with approval, download exact bytes and remain in the signed package after replacement',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const upload=async(fields,filename,bytes,cookie=h.owner)=>{
  const form=new FormData();for(const [key,value] of Object.entries(fields))form.set(key,String(value));form.set('file',new File([bytes],filename,{type:'application/pdf'}))
  const request=new Request(h.origin+'/app/attachment',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie},body:form});const r=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});const body=await r.text();if(fields.kind&&cookie===h.owner)assert.ok(body.includes('Document saved.'),body);return {status:r.status,text:body}
 }
 const w9=new Uint8Array([37,80,68,70,0,255,13,10]),insurance=new Uint8Array(120000).map((_,i)=>i%256),msa=new TextEncoder().encode('%PDF Northstar MSA\n')
 assert.equal((await upload({kind:'w9'},'studio-w9.pdf',w9)).status,200)
 assert.equal((await upload({kind:'insurance'},'insurance.pdf',insurance)).status,200)
 const {client,p}=await draft(h)
 let row=(await h.state()).proposals.find(x=>x.id===p.id);assert.deepEqual(row.attachments.map(f=>f.kind).sort(),['insurance','w9'])
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 assert.equal((await upload({id:p.id,version:2},'client-msa.pdf',msa)).status,200)
 row=(await h.state()).proposals.find(x=>x.id===p.id);assert.equal(row.revision,2);assert.equal(row.approved_by,null);assert.equal(row.attachments.length,3)
 await h.cmd('proposal.send',{id:p.id,version:row.version},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:2});row=(await h.state()).proposals.find(x=>x.id===p.id)
 const shared=await h.cmd('proposal.send',{id:p.id,version:row.version}),path=new URL(shared.shareUrl).pathname
 const before=await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()
 const late=await upload({id:p.id,version:row.version+1},'late.pdf',msa);assert.equal(late.status,409);assert.match(late.text,/Upload attachments before sending/)
 assert.equal((await h.state()).proposals.find(x=>x.id===p.id).attachments.length,3)
 assert.equal((await upload({kind:'w9'},'studio-w9-new.pdf','%PDF replacement')).status,200)
 assert.equal((await upload({kind:'insurance'},'insurance-new.pdf','%PDF replacement insurance')).status,200)
 for(const file of row.attachments){
  const r=await h.mf.dispatchFetch(h.origin+path+'/attachments/'+file.id)
  assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment;/);assert.match(r.headers.get('content-security-policy'),/sandbox/)
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()),file.kind==='w9'?w9:file.kind==='insurance'?insurance:msa)
 }
 const defaults=(await h.state()).vendorDocuments
 assert.equal((await h.send(path+'/attachments/'+defaults[0].id)).status,404)
 const cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
 const accepted=await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
 assert.deepEqual(JSON.parse(accepted.snapshot).attachments,row.attachments)
 const page=await h.send(path,undefined,cookie);assert.match(page.text,/Signed agreement package attachments/);for(const file of row.attachments)assert.ok(page.text.includes(file.filename))
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(p.id).first()).snapshot,before.snapshot)
 await h.send('/auth/invite',{email:'colleague@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('colleague@studio.example')
 const forbidden=await upload({kind:'w9'},'forbidden.pdf',msa,member);assert.equal(forbidden.status,403);assert.match(forbidden.text,/Only the owner/)
 const q=await h.cmd('proposal.prepare',{...offer,clientId:client.id});let next=(await h.state()).proposals.find(x=>x.id===q.id)
 assert.deepEqual(next.attachments.map(x=>x.id),defaults.map(x=>x.id))
 await upload({kind:'w9'},'studio-w9-latest.pdf','%PDF latest default')
 await h.cmd('attachments.refresh',{id:q.id,version:1});next=(await h.state()).proposals.find(x=>x.id===q.id);assert.equal(next.revision,2);assert.notDeepEqual(next.attachments,defaults);const refreshed=next.attachments
 await h.cmd('proposal.restore',{id:q.id,version:2,revision:1});assert.deepEqual((await h.state()).proposals.find(x=>x.id===q.id).attachments,defaults)
 next=(await h.state()).proposals.find(x=>x.id===q.id)
 await h.cmd('proposal.approve',{id:q.id,version:next.version,revision:3});await h.cmd('proposal.send',{id:q.id,version:next.version+1})
 next=(await h.state()).proposals.find(x=>x.id===q.id)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:q.id,version:next.version,scope:'A negotiated campaign.'})
 next=(await h.state()).proposals.find(x=>x.id===q.id)
 await h.cmd('proposal.restore',{id:q.id,version:next.version,revision:2})
 assert.deepEqual((await h.state()).proposals.find(x=>x.id===q.id).attachments,refreshed,'COLLAB-003 restores file versions into an unapproved negotiated revision')
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const action of ['vendor-document.save','attachment.upload','attachment.download','attachments.refresh'])assert.ok(audit.some(x=>x.action===action&&x.subject&&x.actor_id&&x.occurred_at),'TEAM-004 '+action)
 assert.ok(!JSON.stringify(audit).includes('studio-w9.pdf'))
}))

test('MIG-006 imports 200 contacts across 60 companies with reviewed custody, resumable apply and complete undo', {timeout:120000}, async()=>run(async h=>{
 const {businessCsv,applyBusiness,undoBusiness}=await import('./business-import-fixture.mjs')
 const csv=await businessCsv('platter-contacts.csv'),input={kind:'contacts',format:'platter',csv}
 const preview=await h.cmd('business-import.preview',input)
 assert.equal(preview.report.contacts,200);assert.equal(preview.report.companies,60);assert.equal(preview.canApply,true)
 assert.equal((await h.state()).businessRecords.contacts.length,0,'preview writes no native records')
 await h.cmd('business-import.apply',{...input,csv:csv.replace('Dana','Dani'),fingerprint:preview.fingerprint},h.owner,409)
 await h.cmd('business-import.apply',{...input,mapping:{companyIds:{Acme:'other-company'}},fingerprint:preview.fingerprint},h.owner,409)
 const {job}=await applyBusiness(h,input)
 const data=(await h.send('/api/platter/business-records',undefined,h.owner)).value
 assert.equal(data.companies.length,60);assert.equal(data.contacts.length,200)
 const dana=data.contacts.find(c=>c.id==='contact-1')
 assert.equal(dana.company_id,'company-1');assert.equal(dana.first_name,'Dana');assert.equal(dana.last_name,'Chen');assert.equal(dana.title,'Finance Manager');assert.equal(dana.phone,'+1 212 555 0100');assert.equal(dana.tax_exempt,true)
 assert.match(dana.billing_address,/Market Street/);assert.match(dana.service_address,/Studio Road/)
 const company=data.companies.find(c=>c.id==='company-1');assert.equal(company.tax_exempt,true);assert.equal(company.name,'Northstar Studio 1');assert.equal(company.billing_address,dana.billing_address);assert.equal(company.service_address,dana.service_address);assert.equal(dana.email,'dana.chen.1@studio1.example')
 const replay=await h.cmd('business-import.apply',{...input,fingerprint:preview.fingerprint});assert.equal(replay.job.id,job.id);assert.equal((await h.state()).businessRecords.contacts.length,200)
 const journal=await h.cmd('business-import.journal',{id:job.id})
 assert.equal(journal.provenance.length,260);assert.ok(journal.batches.length>1)
 const original=journal.originals.find(o=>o.name==='contacts.csv');assert.equal(Buffer.from(original.original.base64,'base64').toString('utf8'),csv)
 const download=await h.mf.dispatchFetch(h.origin+'/api/platter/business-original?job='+job.id+'&name=contacts.csv',{headers:{cookie:h.owner,host:new URL(h.origin).host}})
 assert.equal(download.status,200);assert.equal(await download.text(),csv)
 await undoBusiness(h,job.id)
 assert.deepEqual((await h.state()).businessRecords,{companies:[],contacts:[],catalog:[]})
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const action of ['business-import.preview','business-import.apply','business-import.journal','business-import.undo'])assert.ok(audit.some(r=>r.action===action))
}))

test('MIG-006 / CAT-001 unchanged PandaDoc catalog and contact layouts preserve exact prices, packages, image bytes and explicit company associations', {timeout:120000}, async()=>{
 const {harness}=await import('./harness.mjs'),{businessCsv,applyBusiness,undoBusiness,fileHost}=await import('./business-import-fixture.mjs'),{readFile}=await import('node:fs/promises')
 const calls=[],h=await harness({alias:{'cloudflare:sockets':'./tests/catalog-socket-edge.ts'},outboundService:r=>fileHost(r,calls)})
 try{
  const input={kind:'catalog',format:'pandadoc',csv:await businessCsv('pandadoc-catalog.csv')}
  const {preview,job}=await applyBusiness(h,input)
  assert.equal(preview.report.catalog,50);assert.equal(preview.report.retainedImages,1)
  assert.ok(preview.diagnostics.some(d=>d.code==='non_usd_currency'));assert.ok(preview.diagnostics.some(d=>d.code==='unmapped_source_column'))
  const catalog=(await h.state()).businessRecords.catalog
  assert.equal(catalog.length,50)
  const first=catalog.find(c=>c.sku==='SKU001'),bundle=catalog.find(c=>c.sku==='SKU050')
  assert.equal(first.price,'100.12345');assert.equal(first.cost,'50.00001');assert.equal(first.currency,'AUD');assert.equal(first.billing_frequency,'monthly');assert.deepEqual(first.category_path,['Services','Creative']);assert.equal(first.source_fields['Internal code'],'creative-1')
  assert.equal(bundle.package,true);assert.equal(bundle.bundle_components[0].catalog_id,first.id);assert.equal(bundle.bundle_components[0].quantity,'2')
  assert.ok(calls.length>0);assert.ok(calls.every(c=>c.address.hostname==='93.184.216.34'&&c.address.port===443&&c.tls.expectedServerHostname==='files.vendor.example'))
  const originals=(await h.cmd('business-import.journal',{id:job.id})).originals,image=originals.find(o=>o.name===first.images[0].artifact)
  assert.deepEqual(Buffer.from(image.original.base64,'base64'),await readFile('fixtures/business/brand.png'))
  assert.equal(Buffer.from(originals.find(o=>o.name==='catalog.csv').original.base64,'base64').toString(),input.csv)
  const privatePreview=await h.cmd('business-import.preview',{...input,csv:input.csv.replace('files.vendor.example','private.vendor.example')})
  assert.equal(privatePreview.canApply,false);assert.ok(privatePreview.diagnostics.some(d=>d.code==='image_acquisition_failed'))
  const omit={kind:'catalog',format:'platter',csv:'id,name,images\nexplicit-omission,Imported artwork,https://private.vendor.example/brand.png'}
  const blocked=await h.cmd('business-import.preview',omit);assert.equal(blocked.canApply,false)
  const confirmed=await applyBusiness(h,{...omit,omitUnfetchedImages:true})
  const omitted=(await h.state()).businessRecords.catalog.find(c=>c.id==='explicit-omission')
  assert.equal(omitted.images[0].status,'not-fetched');assert.equal(omitted.images[0].url,'https://private.vendor.example/brand.png')
  await h.cmd('business-import.apply',{...omit,fingerprint:confirmed.preview.fingerprint},h.owner,409)
  await undoBusiness(h,confirmed.job.id)
  const contactInput={kind:'contacts',format:'pandadoc',csv:await businessCsv('pandadoc-contacts.csv')}
  const missing=await h.cmd('business-import.preview',contactInput);assert.equal(missing.canApply,false);assert.ok(missing.diagnostics.some(d=>d.code==='company_id_required'))
  const contacts=await applyBusiness(h,{...contactInput,mapping:{companyIds:{Acme:'acme-source-id'}}})
  const dana=(await h.state()).businessRecords.contacts[0]
  assert.equal(dana.company_id,'acme-source-id');assert.equal(dana.title,'Finance Director');assert.equal(dana.phone,'+1 212 555 0101');assert.deepEqual(dana.billing_address,{street_address:'12 Market St',city:'New York',postal_code:'10001',country:'US',state:'NY'})
  await undoBusiness(h,contacts.job.id);await undoBusiness(h,job.id)
 }finally{await h.close()}
})

test('MIG-006 reviewed mapper supports original incumbent CSVs and holds identity conflicts without merging', {timeout:90000},async()=>run(async h=>{
 const {applyBusiness,undoBusiness}=await import('./business-import-fixture.mjs')
 const layouts=[
  ['betterproposals','"ProductID (Do not edit existing ID\'s, leave blank for new products)",Product Name,Product Code,Product Type (Optional/Choice/Normal),Price,Price Type (Amount/Percentage),Description,Recurring Type (One-off/Monthly/Quarterly/Annual),Tax Exempt (Yes/No)\nbp-1,Creative retainer,RET,Choice,12.50000,Percentage,Creative direction,Monthly,Yes',r=>{assert.equal(r.price_type,'Percentage');assert.equal(r.price,'12.50000');assert.equal(r.type,'Choice');assert.equal(r.tax_exempt,true)}],
  ['qwilr','Description,Quantity,Cost Per Item,Unit Name,RecurringFrequency\nCreative support,2,125.00001,hour,fortnightly',r=>{assert.equal(r.quantity,'2');assert.equal(r.price,'125.00001');assert.equal(r.billing_frequency,'fortnightly')}],
  ['ignition','#ID,Service Name,Service Description,Price Type,Billing Mode,Price,Unit Name,Min Price,Max Price,Service Terms,Service Category\nign-1,Studio,Creative direction,Range,Recurring,,hour,100.10001,200.20002,Monthly terms,Creative',r=>{assert.equal(r.min_price,'100.10001');assert.equal(r.max_price,'200.20002');assert.equal(r.terms,'Monthly terms')}],
  ['proposify','Name,Price,Quantity,Description,Type,Optional for clients,Adjustable,Tags\nStudio hours,150.50000,3,Creative direction,Recurring,Yes,Yes,Brand',r=>{assert.equal(r.optional,'Yes');assert.equal(r.adjustable,'Yes');assert.equal(r.price,'150.50000')}],
 ]
 for(const [format,csv,check]of layouts){const {job}=await applyBusiness(h,{kind:'catalog',format,csv});check((await h.state()).businessRecords.catalog[0]);await undoBusiness(h,job.id)}
 const mapped={kind:'contacts',format:'mapping',csv:'Customer Key|First|Last|Mail|Business|Business Key|Role|Telephone|Exempt\ncontact-1|Dana|Chen|dana@acme.example|Acme|acme|CFO|+1 212 555 0101|yes'.replaceAll('|','\t'),mapping:{delimiter:'\t',columns:{contact_id:'Customer Key',first_name:'First',last_name:'Last',email:'Mail',company_name:'Business',company_id:'Business Key',title:'Role',phone:'Telephone',tax_exempt:'Exempt'}}}
 const first=await applyBusiness(h,mapped)
 const d=(await h.state()).businessRecords.contacts[0];assert.equal(d.company_id,'acme');assert.equal(d.title,'CFO');assert.equal(d.tax_exempt,true)
 const conflict=await h.cmd('business-import.preview',{...mapped,csv:mapped.csv.replace('contact-1','contact-2')})
 assert.equal(conflict.canApply,false);assert.ok(conflict.diagnostics.some(d=>d.code==='existing_contact_email'))
 // A second import explicitly links a new person to the existing company.
 const dependent={...mapped,csv:'Customer Key\tFirst\tLast\tMail\tBusiness Key\tRole\tTelephone\tExempt\ncontact-2\tAvery\tChen\tavery@acme.example\tacme\tManager\t+1 212 555 0102\tno',mapping:{...mapped.mapping,columns:{...mapped.mapping.columns}}}
 delete dependent.mapping.columns.company_name
 const second=await applyBusiness(h,dependent)
 await h.cmd('business-import.undo',{id:first.job.id},h.owner,409)
 assert.equal((await h.state()).businessRecords.contacts.length,2,'dependent contact prevents partial company erasure')
 await undoBusiness(h,second.job.id);await undoBusiness(h,first.job.id)
 await h.send('/auth/invite',{email:'member@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('member@studio.example')
 await h.cmd('business-import.preview',mapped,member,403)
 assert.equal((await h.send('/api/platter/business-records',undefined,member)).status,403)
}))

import { templatesHttp } from './templates-http.mjs'
import { followupJourney } from './followup-journey.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { run, harness } from './harness.mjs'
import { pdfPages } from './pdf-document.mjs'
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
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id})
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

test('FOLLOW-005 / REPORT-001 / FOLLOW-002 / SEND-004 / SEND-010 thirty proposals filter by recorded owner/status and every field, sort and total exact values without changing ownership',()=>run(async h=>{
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
  const made=await h.cmd('proposal.prepare',input,person.cookie),status=i===2?'expired':i===6?'withdrawn':i===10?'declined':i===14?'lost':['draft','approved','sent','accepted'][i%4]
  let version=1
  if(status!=='draft'){await h.cmd('proposal.approve',{id:made.id,version:version++,revision:1})}
  if(['sent','accepted','expired','withdrawn','declined','lost'].includes(status)){
   const shared=await h.cmd('proposal.send',{id:made.id,version:version++})
   if(status==='lost')await h.cmd('proposal.lose',{id:made.id,version:version++,reason:'Project cancelled'})
   if(status==='declined'){const path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path);assert.equal((await h.send(path+'/action?name=decline',{revision:1,reason:'Budget'},cookie)).status,410)}
   if(status==='withdrawn')await h.cmd('proposal.withdraw',{id:made.id,version:version++,reason:'Client project cancelled',notice:false})
   if(status==='expired')await h.cmd('expiry.set',{id:made.id,version:version++,mode:'date',date:'2020-03-01'})
   if(status==='accepted'){
    const path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path)
    assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
   }
  }
  fixture.push({id:made.id,title:input.title,status:status==='draft'?'awaiting-approval':status,owner:person.id,client:client.id,valueCents:(status==='accepted'?1000+i*10:2000+i*20)*100,nextAction:status==='draft'?'approve':status==='approved'?'send':status==='sent'?'await-client':status==='expired'?'reopen':['withdrawn','declined','lost'].includes(status)?'withdrawn':'export-deposit'})
 }
 const scheduled=fixture.filter(p=>p.status==='sent').slice(0,2)
 for(const [i,row] of scheduled.entries()){await h.cmd('followup.schedule',{id:row.id,action:'Call the client',dueDate:i?'2000-03-02':'2000-03-01'});row.nextAction='followup'}
 const aged=fixture.find(p=>p.status==='awaiting-approval')
 await h.db.prepare('UPDATE p_proposals SET created_at=? WHERE id=?').bind(Date.now()-3*86400000-3600000,aged.id).run()
 const report=async query=>{const r=await h.send('/api/platter/pipeline'+(query?'?'+query:''),undefined,h.owner);assert.equal(r.status,200,r.text);return r.value}
 const all=await report('sort=value&direction=desc')
 for(const expected of fixture){const actual=all.rows.find(p=>p.id===expected.id);assert.equal(actual.status,expected.status);assert.equal(actual.ownerId,expected.owner);assert.equal(actual.clientId,expected.client);assert.equal(actual.valueCents,expected.valueCents);assert.equal(actual.nextAction,expected.nextAction);assert.equal(actual.age,expected.id===aged.id?3:0)}
 assert.equal(all.count,30);assert.equal(all.totals[0].valueCents,fixture.reduce((n,p)=>n+p.valueCents,0));assert.equal(all.totals[0].count,30)
 assert.deepEqual(all.rows.map(p=>p.id),fixture.toSorted((a,b)=>b.valueCents-a.valueCents||a.title.localeCompare(b.title)).map(p=>p.id))
 const dueRows=(await report('dueFollowup=yes&sort=dueDate')).rows
 assert.ok(dueRows.every(r=>r.dueFollowup));assert.deepEqual(dueRows.slice(0,2).map(r=>r.id),scheduled.map(r=>r.id));assert.equal((await report('dueFollowup=no')).count,30-dueRows.length)
 assert.equal((await report('dueFollowup=yes')).totals[0].valueCents,fixture.filter(p=>dueRows.some(r=>r.id===p.id)).reduce((n,p)=>n+p.valueCents,0))
 assert.deepEqual((await report('nextAction=followup')).rows.map(r=>r.id).sort(),scheduled.map(r=>r.id).sort())
 const expired=await report('status=expired&sort=value');assert.equal(expired.count,1);assert.equal(expired.totals[0].count,1);assert.equal(expired.totals[0].valueCents,fixture.find(p=>p.status==='expired').valueCents)
 for(const status of ['declined','lost']){const reportRow=await report('status='+status+'&sort=value');const expected=fixture.filter(p=>p.status===status);assert.equal(reportRow.count,expected.length);assert.equal(reportRow.totals[0].count,expected.length);assert.equal(reportRow.totals[0].valueCents,expected.reduce((n,p)=>n+p.valueCents,0))}
 const selected=fixture.filter(p=>p.owner===people[1].id&&p.status==='sent'),filtered=await report('owner='+people[1].id+'&status=sent&sort=value')
 assert.deepEqual(filtered.rows.map(p=>p.id),selected.toSorted((a,b)=>a.valueCents-b.valueCents).map(p=>p.id));assert.equal(filtered.totals[0].valueCents,selected.reduce((n,p)=>n+p.valueCents,0))
 for(const [query,expected] of [
  ['status=withdrawn',fixture.filter(p=>p.status==='withdrawn')],['nextAction=withdrawn',fixture.filter(p=>['withdrawn','declined','lost'].includes(p.status))],
  ['status=declined',fixture.filter(p=>p.status==='declined')],['status=lost',fixture.filter(p=>p.status==='lost')],
  ['status=expired',fixture.filter(p=>p.status==='expired')],['nextAction=reopen',fixture.filter(p=>p.status==='expired')],
  ['client='+clients[0].id,fixture.filter(p=>p.client===clients[0].id)],
  ['minValue=2100&maxValue=2400',fixture.filter(p=>p.valueCents>=210000&&p.valueCents<=240000)],
  ['minAge=0&maxAge=0',fixture.filter(p=>p.id!==aged.id)],['minAge=3&maxAge=3',[aged]],['minAge=4',[]],['nextAction=approve',fixture.filter(p=>p.status==='awaiting-approval')],
 ])assert.deepEqual(new Set((await report(query)).rows.map(p=>p.id)),new Set(expected.map(p=>p.id)))
 for(const sort of ['status','owner','client','age','nextAction']){
  const rows=(await report('sort='+sort)).rows
  const field=sort==='age'?'age':sort
  for(let i=1;i<rows.length;i++)assert.ok(sort==='age'?rows[i-1][field]<=rows[i][field]:rows[i-1][field].localeCompare(rows[i][field])<=0)
 }
 for(const query of ['sort=invalid','status=paid','minValue=1.234','minAge=-1','minValue=20&maxValue=10'])assert.equal((await h.send('/api/platter/pipeline?'+query,undefined,h.owner)).status,400)
 assert.equal((await h.send('/api/platter/pipeline',undefined,people[1].cookie)).value.count,fixture.filter(p=>p.owner===people[1].id).length)
 assert.equal((await h.send('/api/platter/pipeline')).status,401)
 const owned=fixture.find(p=>p.status==='awaiting-approval'&&p.owner===people[1].id)
 await h.cmd('proposal.revise',{...offer,clientId:owned.client,id:owned.id,version:1},h.owner)
 assert.equal((await report()).rows.find(p=>p.id===owned.id).ownerId,people[1].id,'later editor never becomes the sales owner')
 owned.valueCents=420000;owned.title=offer.title
 const key=await h.cmd('agent.create',{label:'Campaign assistant'})
 const agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:clients[0].id}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200)
 assert.equal((await report()).rows.find(p=>p.id===agent.value.id).ownerId,people[0].id,'agent draft belongs to the recorded key owner')
 const accepted=fixture.find(p=>p.status==='accepted');await h.cmd('invoice.export',{id:accepted.id})
 assert.equal((await report()).rows.find(p=>p.id===accepted.id).nextAction,'complete')
 const team=await h.cmd('team.create',{name:'Report team'})
 await h.cmd('member.set',{operatorId:people[1].id,version:0,role:'sales',teams:[team.id]})
 for(const role of ['manager','viewer','admin']){
  const email=role+'@report.synthetic-platter.example';await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)
  const cookie=await h.signIn(email),person=(await h.state(cookie)).actor
  await h.cmd('member.set',{operatorId:person.id,version:0,role,teams:[team.id]})
  const response=await h.send('/api/platter/pipeline?status=awaiting-approval&sort=value&direction=desc',undefined,cookie);assert.equal(response.status,200)
  const expected=fixture.filter(p=>p.status==='awaiting-approval'&&(role==='admin'||p.owner===people[1].id))
  const actual=response.value.rows.filter(p=>fixture.some(f=>f.id===p.id))
  assert.deepEqual(actual.map(p=>p.id),expected.toSorted((a,b)=>b.valueCents-a.valueCents||a.title.localeCompare(b.title)).map(p=>p.id))
  assert.equal(actual.length,expected.length);assert.equal(actual.reduce((n,r)=>n+r.valueCents,0),expected.reduce((n,r)=>n+r.valueCents,0))
  assert.equal(response.value.count,response.value.rows.length);assert.equal(response.value.totals[0].valueCents,response.value.rows.reduce((n,r)=>n+r.valueCents,0))
 }

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
  const fields=['id','actor_id','actor_role','action','subject','occurred_at','reason']
  const decoded=exported.text.trim().split('\r\n').slice(1).map(line=>line.slice(1,-1).split('","'))
  assert.deepEqual(decoded,expected.map(r=>fields.map(f=>String(r[f]??''))))
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
 const listed=await rpc('tools/list');assert.ok(listed.tools.every(t=>t.inputSchema.type==='object'));assert.deepEqual(listed.tools.map(t=>t.name).sort(),['prepare_from_template','prepare_proposal','read_engagement','read_proposal','request_send','revise_proposal','search_proposals','search_templates'])
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
test('SIGN-008 / TEAM-004 owner records a client-signed copy as accepted by upload, distinct from e-signature, then exports the deposit',()=>run(async h=>{
 const record=async(fields,bytes,cookie=h.owner)=>{
  const form=new FormData();for(const [key,value] of Object.entries(fields))form.set(key,String(value));if(bytes)form.set('file',new File([bytes],'Northstar-signed.pdf',{type:'application/pdf'}))
  const request=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie},body:form});const r=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});return {status:r.status,text:await r.text()}
 }
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 const signed=new Uint8Array([...new TextEncoder().encode('%PDF-1.7 Northstar countersigned\n'),0,255,13,10])
 const{p,path}=await sent(h),fields={id:p.id,version:3,optionId:'two',signer:'Morgan Lee',signedOn:'2026-10-15',attest:'yes'}
 await h.send('/auth/invite',{email:'colleague@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('colleague@studio.example')
 let r=await record(fields,signed,member);assert.equal(r.status,403);assert.match(r.text,/Only the owner records acceptance/)
 r=await record({...fields,version:2},signed);assert.equal(r.status,409)
 r=await record({...fields,attest:''},signed);assert.equal(r.status,400);assert.match(r.text,/Confirm that the file is the client/)
 r=await record(fields,undefined);assert.equal(r.status,400);assert.match(r.text,/Choose the client-signed file/)
 r=await record(fields,new Uint8Array(10*1024*1024+1));assert.equal(r.status,413);assert.match(r.text,/10 MB or smaller/)
 r=await record({...fields,signedOn:new Date(Date.now()+3*86400000).toISOString().slice(0,10)},signed);assert.equal(r.status,400);assert.match(r.text,/cannot be in the future/)
 r=await record({...fields,signedOn:'2026-02-30'},signed);assert.equal(r.status,400);assert.match(r.text,/YYYY-MM-DD/)
 r=await record({...fields,optionId:'three'},signed);assert.equal(r.status,400)
 const pending=await h.cmd('proposal.prepare',{...offer,clientId:(await h.state()).clients[0].id})
 r=await record({...fields,id:pending.id,version:1},signed);assert.equal(r.status,409);assert.match(r.text,/only for a sent proposal/)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_acceptances').first()).n,0)
 r=await record(fields,signed);assert.equal(r.status,200,r.text);assert.match(r.text,/Accepted by upload\. The deposit invoice is ready to export\./)
 assert.match(r.text,/Accepted by upload: signed outside Platter\. Platter did not verify this signature\./);assert.match(r.text,/Northstar-signed\.pdf/)
 const accepted=(await h.state()).proposals.find(x=>x.id===p.id),a=accepted.acceptance
 assert.equal(accepted.status,'accepted');assert.equal(a.method,'upload');assert.equal(a.name,'Morgan Lee');assert.equal(a.signedOn,'2026-10-15');assert.equal(a.attestedBy,'owner@studio.example');assert.equal(a.optionId,'two');assert.equal(a.totalCents,420000);assert.equal(a.depositCents,105000);assert.equal(a.revision,1)
 assert.match((await h.db.prepare('SELECT consent FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).consent,/did not verify the signature/)
 const file=await h.mf.dispatchFetch(h.origin+'/api/platter/attachments/'+p.id+'/'+a.signedCopy.id,{headers:{cookie:h.owner}});assert.equal(file.status,200);assert.deepEqual(new Uint8Array(await file.arrayBuffer()),signed);assert.match(file.headers.get('content-disposition'),/^attachment;.*Northstar-signed\.pdf/);assert.equal(file.headers.get('x-content-type-options'),'nosniff')
 assert.equal((await record(fields,signed)).status,409,'a recorded acceptance is never replaced')
 const cookie=await verified(h,path)
 r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie);assert.equal(r.status,200);assert.match(r.text,/Accepted by upload: signed outside Platter/);assert.match(r.text,/Morgan Lee/);assert.ok(!r.text.includes('Morgan Lee · avery@'),'the client mailbox is not shown as the paper signer');assert.ok(!r.text.includes('Northstar-signed.pdf'),'the client page does not serve the uploaded copy')
 assert.equal((await h.send(path+'/attachments/'+a.signedCopy.id)).status,404)
 assert.equal((await h.state()).proposals.find(x=>x.id===p.id).acceptance.name,'Morgan Lee')
 const invoice=await h.cmd('invoice.export',{id:p.id});r=await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,h.owner);assert.equal(r.status,200);assert.match(r.text,/1050\.00/);assert.match(r.text,/Deposit: Northstar brand photography/)
 const other=await h.cmd('proposal.prepare',{...offer,clientId:(await h.state()).clients[0].id,title:'E-signed shoot'});await h.cmd('proposal.approve',{id:other.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:other.id,version:2}),otherPath=new URL(share.shareUrl).pathname
 await h.db.prepare("DELETE FROM p_mail WHERE subject='Your Platter verification code'").run()
 assert.equal((await h.send(otherPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},await verified(h,otherPath))).status,200)
 assert.equal((await h.state()).proposals.find(x=>x.id===other.id).acceptance.method,'platter')
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id})
 assert.equal((await h.state(member)).proposals.find(x=>x.id===p.id).acceptance.signedCopy.id,a.signedCopy.id)
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows;assert.ok(audit.some(x=>x.action==='acceptance.upload'&&x.subject===p.id&&x.actor_id&&x.occurred_at),'TEAM-004 acceptance.upload')
}))
test('FOLLOW-005 / EDIT-016 / REPORT-005 / FOLLOW-002 / TEAM-004 pipeline exports to CSV as filtered and emails weekly to two named people with the screen figures',{timeout:60000},()=>run(async h=>{
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 await h.send('/auth/invite',{email:'colleague@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('colleague@studio.example')
 const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
 await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Draft only',scope:'No seasonal engagement.'})
 for(const [title,priceTwo] of [['Spring catalogue','3234.56'],['Autumn campaign','4200.00']]){const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title,priceTwo,scope:'Seasonal [campaign] scope.'});await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});await h.cmd('proposal.send',{id:p.id,version:2})}
 const unrelated=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Unrelated sent proposal',scope:'A separate engagement.'});await h.cmd('proposal.approve',{id:unrelated.id,version:1,revision:1});await h.cmd('proposal.send',{id:unrelated.id,version:2})
 const filters='q=seasonal+%5Bcampaign%5D&status=sent&sort=value&direction=desc',screen=(await h.send('/api/platter/pipeline?'+filters,undefined,h.owner)).value
 let r=await h.send('/api/platter/pipeline.csv?'+filters,undefined,h.owner);assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/platter-pipeline\.csv/)
 const lines=r.text.trim().split('\r\n');assert.equal(lines[0],'Title,Client,Owner,Status,Next action,Currency,Value,Age in days,Follow-up due')
 assert.deepEqual(lines.slice(1,3),screen.rows.map(x=>[x.title,x.client,x.owner,x.status,'Await client decision',x.currency,(x.valueCents/100).toFixed(2),x.age,x.dueDate].join(',')))
 assert.deepEqual(lines.slice(1,3).map(l=>l.split(',')[0]),['Autumn campaign','Spring catalogue']);assert.equal(lines[3],'Total (2 proposals),,,,,USD,7434.56,,');assert.equal(lines.length,4)
 assert.equal((await h.send('/api/platter/pipeline.csv',undefined,member)).status,403)
 assert.equal((await h.state()).timeZone,'UTC','schedules use UTC until the owner sets a time zone')
 await h.cmd('report.time-zone',{timeZone:'America/New_York'},member,403);await h.cmd('report.time-zone',{timeZone:'Mars/Olympus'},h.owner,400)
 await h.cmd('report.time-zone',{timeZone:'America/New_York'});assert.equal((await h.state()).timeZone,'America/New_York')
 assert.equal((await h.send('/api/platter/pipeline?q='+encodeURIComponent('.*'),undefined,h.owner)).value.count,0,'search punctuation is literal')
 assert.equal((await h.send('/api/platter/pipeline?q='+encodeURIComponent('x'.repeat(201)),undefined,h.owner)).status,400)
 assert.equal((await h.send('/api/platter/pipeline?q=seasonal',undefined,member)).value.count,0)
 assert.equal((await h.send('/api/platter/pipeline?q=seasonal')).status,401)
 const newYork=at=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',weekday:'long',hour:'numeric',minute:'numeric'}).formatToParts(at).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]))
 const schedule={cadence:'weekly',weekday:1,hour:8,filters,recipients:['owner@studio.example','colleague@studio.example']}
 await h.cmd('report.schedule',schedule,member,403)
 await h.cmd('report.schedule',{...schedule,recipients:['partner@outside.example']},h.owner,400)
 await h.cmd('report.schedule',{...schedule,recipients:[]},h.owner,400)
 await h.cmd('report.schedule',{...schedule,hour:24},h.owner,400)
 await h.cmd('report.schedule',{...schedule,filters:'status=unsupported-outcome'},h.owner,400)
 const created=await h.cmd('report.schedule',schedule);let s=(await h.state()).reportSchedules.find(x=>x.id===created.id)
 const next=s.nextRunAt;assert.deepEqual(newYork(next),{weekday:'Monday',hour:'08',minute:'00'});assert.ok(next>Date.now()&&next<=Date.now()+7*86400000+3600000)
 assert.deepEqual(s.recipients,schedule.recipients);assert.equal(s.filters,filters)
 const worker=await h.mf.getWorker(),fire=at=>worker.scheduled({scheduledTime:new Date(at),cron:'0 * * * *'})
 await fire(s.nextRunAt-3600000);assert.equal((await h.state()).reportOutbox.length,0,'nothing runs before its time')
 await fire(s.nextRunAt);await fire(s.nextRunAt);const outbox=(await h.state()).reportOutbox
 assert.deepEqual(outbox.map(m=>m.recipient).sort(),['colleague@studio.example','owner@studio.example'],'one email each, never twice for the same run');assert.ok(outbox.every(m=>m.status==='local'))
 const page=(await h.send('/app?'+filters,undefined,h.owner)).text,shown=page.match(/data-pipeline-total="USD">([^<]+)</)[1].replaceAll('&#39;',"'")
 assert.equal(shown,'$7,434.56 USD')
 for(const mail of outbox){
  assert.match(mail.body,/2 proposals match\./);assert.ok(mail.body.includes(`USD total · 2 proposals: ${shown}`),mail.body)
  for(const row of screen.rows){const age=Math.floor((s.nextRunAt-(await h.state()).proposals.find(p=>p.id===row.id).created_at)/86400000);assert.ok(mail.body.includes(`${row.title} · sent · ${page.match(new RegExp(`data-proposal-id="${row.id}"[\\s\\S]*?(\\$[\\d,.]+ USD)`))[1]} · ${row.owner} · ${row.client} · ${age} days`),mail.body)}
  assert.ok(mail.body.includes('Total (2 proposals),,,,,USD,7434.56,'))
 }
 s=(await h.state()).reportSchedules.find(x=>x.id===created.id); assert.ok([7*86400000,7*86400000-3600000,7*86400000+3600000].includes(s.nextRunAt-next));assert.equal(s.runs.length,1);assert.equal(s.runs[0].count,2)
 const gaps=[];for(let i=0;i<30&&!gaps.some(g=>g!==7*86400000);i++){const before=s.nextRunAt;await fire(before);s=(await h.state()).reportSchedules.find(x=>x.id===created.id);gaps.push(s.nextRunAt-before);assert.deepEqual(newYork(s.nextRunAt),{weekday:'Monday',hour:'08',minute:'00'},'every run stays at 8 a.m. New York time')}
 assert.ok(gaps.some(g=>g===7*86400000+3600000||g===7*86400000-3600000),'a daylight saving change moves the UTC instant by one hour')
 await h.db.prepare("UPDATE oa_operators SET status='inactive' WHERE email='colleague@studio.example'").run()
 await fire(s.nextRunAt);s=(await h.state()).reportSchedules.find(x=>x.id===created.id);assert.deepEqual(s.runs[0].skipped,['no longer active']);assert.deepEqual(s.runs[0].mail.map(m=>m.recipient),['owner@studio.example'])
 await h.cmd('report.unschedule',{id:created.id});assert.equal((await h.state()).reportSchedules.length,0)
 // FOLLOW-005: newly valid outcome filters must also work in scheduled delivery.
 await h.cmd('proposal.lose',{id:unrelated.id,version:3,reason:'Project cancelled'})
 const autumn=(await h.state()).proposals.find(p=>p.title==='Autumn campaign'),path='/p/'+autumn.shareToken,cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=decline',{revision:1,reason:'Budget'},cookie)).status,410)
 for(const [kind,title]of [['lost','Unrelated sent proposal'],['declined','Autumn campaign']]){
  const filtered=(await h.send('/api/platter/pipeline?status='+kind,undefined,h.owner)).value
  assert.deepEqual(filtered.rows.map(p=>p.title),[title]);assert.equal(filtered.count,1);assert.equal(filtered.totals[0].valueCents,420000)
  const outcomeSchedule=await h.cmd('report.schedule',{...schedule,filters:'status='+kind,recipients:['owner@studio.example']})
  const saved=(await h.state()).reportSchedules.find(p=>p.id===outcomeSchedule.id);assert.equal(saved.filters,'status='+kind)
  const mailBefore=(await h.state()).reportOutbox.map(m=>m.id)
  await fire(saved.nextRunAt)
  const delivered=(await h.state()).reportOutbox.filter(m=>!mailBefore.includes(m.id))
  assert.equal(delivered.length,1);assert.equal(delivered[0].recipient,'owner@studio.example')
  assert.ok(delivered[0].body.includes(title+' · '+kind+' · $4,200.00 USD'));assert.match(delivered[0].body,/1 proposals match/);assert.match(delivered[0].body,/USD total · 1 proposals: \$4,200\.00 USD/)
  await h.cmd('report.unschedule',{id:outcomeSchedule.id})
 }

 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows;for(const action of ['report.export','report.schedule','report.unschedule'])assert.ok(audit.some(x=>x.action===action&&x.actor_id&&x.occurred_at),'TEAM-004 '+action)
}))


test('EDIT-014 / TEAM-004 exact unsigned revision PDF keeps selected prices and every page marked; disabling refuses download without a write', {timeout:60000}, async()=>{
 const h=await harness({assetsDirectory:'public'})
 try {
  const finish=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(finish.status,303)
  const {client,p}=await draft(h),scope='Café · 東京 · 😀.\n'+Array.from({length:70},(_,i)=>`Deliverable ${i+1}: Studio photographs and campaign usage rights.`).join('\n'),terms='Payment follows the chosen option. Final term marker.'
  await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,scope,terms,depositPercent:'33.33',priceTwo:'111.11'})
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:2})
  const share=await h.cmd('proposal.send',{id:p.id,version:3}),path=new URL(share.shareUrl).pathname
  const before=await h.state(),beforeRow=before.proposals.find(row=>row.id===p.id)
  assert.equal((await h.send(path+'/download.pdf?optionId=two')).status,401)
  const cookie=await verified(h,path)
  const fetchPdf=async(optionId,session=cookie)=>h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId='+optionId,{headers:{host:new URL(h.origin).host,cookie:session}})
  let response=await fetchPdf('unknown');assert.equal(response.status,400)
  assert.equal((await h.state()).proposals.find(row=>row.id===p.id).pdfDownloads.length,0)
  response=await fetchPdf('two');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.match(response.headers.get('content-disposition'),/attachment/);assert.equal(response.headers.get('cache-control'),'no-store')
  const pages=await pdfPages(await response.arrayBuffer()),text=pages.join(' ')
  assert.ok(pages.length>=2);for(const page of pages)assert.ok(page.includes('Not signed, revision 2'))
  for(const value of [offer.title,'Northstar Coffee','avery@northstar.example','Café','東京','😀','Deliverable 1:','Deliverable 70:','Final term marker.','Selected option: Full campaign','Selected option total: USD 111.11','Deposit due: USD 37.03','Studio essentials','USD 2,400.00'])assert.ok(text.includes(value),value+' is preserved')
  response=await fetchPdf('one');assert.equal(response.status,200);assert.ok((await pdfPages(await response.arrayBuffer())).join(' ').includes('Selected option total: USD 2,400.00'))
  const after=(await h.state()).proposals.find(row=>row.id===p.id)
  assert.equal(after.version,beforeRow.version);assert.equal(after.revision,2);assert.equal(after.status,'sent');assert.equal(after.acceptance,undefined);assert.equal(after.approved_at,beforeRow.approved_at);assert.equal(after.pdfDownloads.length,2)
  assert.deepEqual(after.pdfDownloads.map(d=>[d.revision,d.option_id,d.client_id]),[[2,'two',client.id],[2,'one',client.id]])
  const timeline=await h.send('/app/proposal?id='+p.id,undefined,h.owner);assert.match(timeline.text,/PDF download timeline/)
  await h.send('/auth/invite',{email:'pdf-member@studio.example',displayName:'Studio colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('pdf-member@studio.example')
  await h.cmd('pdf.downloads',{id:p.id,version:after.version,enabled:false},member,403)
  await h.cmd('pdf.downloads',{id:p.id,version:after.version-1,enabled:false},h.owner,409)
  await h.cmd('pdf.downloads',{id:p.id,version:after.version,enabled:false},h.owner,403,{origin:'https://foreign.example'})
  await h.cmd('pdf.downloads',{id:p.id,version:after.version,enabled:false})
  const auditBefore=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
  assert.equal((await fetchPdf('two')).status,403)
  assert.deepEqual((await h.send('/api/platter/audit',undefined,h.owner)).value.rows,auditBefore)
  assert.ok(!(await h.send(path,undefined,cookie)).text.includes('Download unsigned proposal PDF'))
  assert.equal((await h.state()).proposals.find(row=>row.id===p.id).pdfDownloads.length,2)
  const current=(await h.state()).proposals.find(row=>row.id===p.id)
  await h.cmd('pdf.downloads',{id:p.id,version:current.version,enabled:true})
  const fresh=await h.cmd('proposal.send',{id:p.id,version:current.version+1})
  assert.equal((await fetchPdf('two')).status,404,'rotated invitation never downloads old bytes')
  const newPath=new URL(fresh.shareUrl).pathname,newCookie=await verified(h,newPath)
  await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},newCookie)
  assert.equal((await h.send(newPath+'/download.pdf?optionId=two',undefined,newCookie)).status,409,'unsigned download is not a signed agreement PDF')
  const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
  assert.equal(audit.filter(r=>r.action==='proposal.pdf.download').length,2)
  for(const row of audit.filter(r=>r.action==='proposal.pdf.download')){assert.equal(row.actor_id,client.id);assert.equal(row.actor_role,'client');assert.equal(row.subject,p.id);assert.ok(row.occurred_at)}
  assert.ok(audit.some(r=>r.action==='pdf.downloads'&&r.actor_role==='owner'))
 } finally { await h.close() }
})


test('SEND-004 / TEAM-004 calendar expiry warns unsigned only, supports same-link reopening and reissue, and never expires accepted agreements', {timeout:60000}, ()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303);await setup.text()
 const worker=await h.mf.getWorker(),fire=async at=>worker.scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'}),at=value=>Date.parse(value)
 await fire(at('2027-03-01T15:00:00Z'))
 await h.cmd('report.time-zone',{timeZone:'America/New_York'})
 const {client}=await draft(h)
 const make=async(title,days,warningDays='')=>{const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title});await h.cmd('expiry.set',{id:p.id,version:1,mode:'days',days,warningDays});await h.cmd('proposal.approve',{id:p.id,version:2,revision:1});const shared=await h.cmd('proposal.send',{id:p.id,version:3});return {...p,path:new URL(shared.shareUrl).pathname}}
 const seven=await make('Seven day campaign',7),fourteen=await make('Fourteen day campaign',14,1),signed=await make('Already agreed campaign',14,1),moved=await make('Extended before warning',14,1)
 let row=(await h.state()).proposals.find(p=>p.id===seven.id);assert.equal(row.expiry.date,'2027-03-08');assert.equal(row.expiry.deadlineAt,at('2027-03-08T05:00:00Z'))
 assert.match((await h.send(seven.path)).text,/2027-03-08.*America\/New_York/)
 const signedCookie=await verified(h,signed.path);assert.equal((await h.send(signed.path+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},signedCookie)).status,200)
 const accepted=await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(signed.id).first()
 row=(await h.state()).proposals.find(p=>p.id===moved.id);await h.cmd('expiry.set',{id:moved.id,version:row.version,mode:'date',date:'2027-03-22',warningDays:1})
 assert.equal((await h.state()).proposals.find(p=>p.id===fourteen.id).expiry.deadlineAt,at('2027-03-15T04:00:00Z'),'DST changes the UTC midnight')
 await fire(at('2027-03-08T04:59:59Z'));assert.equal((await h.state()).proposals.find(p=>p.id===seven.id).status,'sent')
 await fire(at('2027-03-08T05:00:00Z'));assert.equal((await h.state()).proposals.find(p=>p.id===seven.id).status,'expired')
 let page=await h.send(seven.path);assert.match(page.text,/This proposal has expired/);assert.ok(!page.text.includes('<button>Accept proposal</button>'))
 assert.equal((await h.send(seven.path+'/action?name=expiry.reopen',{})).status,401)
 const cookie=await verified(h,seven.path)
 assert.equal((await h.send(seven.path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,409)
 assert.equal((await h.send(seven.path+'/action?name=expiry.reopen',{},cookie)).status,200);assert.equal((await h.send(seven.path+'/action?name=expiry.reopen',{},cookie)).status,200)
 row=(await h.state()).proposals.find(p=>p.id===seven.id);assert.equal(row.expiry.reopenRequests.length,1)
 await h.cmd('expiry.set',{id:seven.id,version:row.version,mode:'date',date:'2027-03-12'})
 assert.equal((await h.send(seven.path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200,'same invitation/session reopens')
 assert.equal((await h.state()).proposals.find(p=>p.id===seven.id).expiry.reopenRequests[0].resolution,'extended')
 await fire(at('2027-03-14T04:59:59Z'));assert.equal((await h.state()).outbox.filter(m=>m.subject.startsWith('Expiry warning:')).length,0)
 await fire(at('2027-03-14T05:00:00Z'));await fire(at('2027-03-14T05:00:00Z'))
 let mail=(await h.state()).outbox.filter(m=>m.subject.startsWith('Expiry warning:'));assert.equal(mail.length,1);assert.equal(mail[0].proposal_id,fourteen.id);assert.equal(mail[0].recipient,'avery@northstar.example');assert.match(mail[0].body,/2027-03-15.*America\/New_York/);assert.equal(mail[0].status,'local')
 await fire(at('2027-03-15T04:00:00Z'));row=(await h.state()).proposals.find(p=>p.id===fourteen.id);assert.equal(row.status,'expired')
 const lateCookie=await verified(h,fourteen.path);assert.equal((await h.send(fourteen.path+'/action?name=expiry.reopen',{},lateCookie)).status,200)
 await h.cmd('expiry.set',{id:fourteen.id,version:row.version,mode:'date',date:'2027-03-22',warningDays:1})
 assert.equal((await h.send(fourteen.path,undefined,lateCookie)).status,200);assert.equal((await h.state()).proposals.find(p=>p.id===fourteen.id).status,'sent')
 row=(await h.state()).proposals.find(p=>p.id===fourteen.id)
 const fresh=await h.cmd('proposal.send',{id:fourteen.id,version:row.version});assert.equal((await h.state()).proposals.find(p=>p.id===fourteen.id).expiry.date,'2027-03-22','fresh invitation preserves expiry')
 assert.equal((await h.send(fourteen.path)).status,404)
 await fire(at('2027-03-21T04:00:00Z'));mail=(await h.state()).outbox.filter(m=>m.subject.startsWith('Expiry warning:'));assert.equal(mail.length,2);assert.ok(mail.some(m=>m.proposal_id===moved.id));assert.equal(mail.filter(m=>m.proposal_id===fourteen.id).length,1,'extension does not repeat warning for same revision')
 await fire(at('2027-03-22T04:00:00Z'))
 row=(await h.state()).proposals.find(p=>p.id===fourteen.id);assert.equal(row.status,'expired')
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:fourteen.id,version:row.version,scope:'Reissued campaign with revised scope.'})
 row=(await h.state()).proposals.find(p=>p.id===fourteen.id);await h.cmd('expiry.set',{id:fourteen.id,version:row.version,mode:'days',days:7});row=(await h.state()).proposals.find(p=>p.id===fourteen.id)
 await h.cmd('proposal.approve',{id:fourteen.id,version:row.version,revision:row.revision});row=(await h.state()).proposals.find(p=>p.id===fourteen.id)
 const reissued=await h.cmd('proposal.send',{id:fourteen.id,version:row.version}),newPath=new URL(reissued.shareUrl).pathname
 row=(await h.state()).proposals.find(p=>p.id===fourteen.id);assert.equal(row.revision,2);assert.equal(row.expiry.date,'2027-03-29');assert.equal(row.status,'sent');assert.equal(row.expiry.reopenRequests[0].resolution,'extended');assert.equal((await h.send(new URL(fresh.shareUrl).pathname)).status,404)
 const reissuedCookie=await verified(h,newPath);assert.equal((await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},reissuedCookie)).status,200)
 const noExpiry=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'No deadline'});await h.cmd('expiry.set',{id:noExpiry.id,version:1,mode:'days',days:7});await h.cmd('expiry.remove',{id:noExpiry.id,version:2});assert.equal((await h.state()).proposals.find(p=>p.id===noExpiry.id).expiry.mode,'never')
 await h.cmd('expiry.set',{id:noExpiry.id,version:3,mode:'date',date:'2027-02-30'},h.owner,400)
 await h.cmd('expiry.set',{id:signed.id,version:(await h.state()).proposals.find(p=>p.id===signed.id).version,mode:'days',days:1},h.owner,409)
 await h.send('/auth/invite',{email:'expiry-member@studio.example',displayName:'Colleague',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('expiry-member@studio.example')
 await h.cmd('expiry.set',{id:noExpiry.id,version:3,mode:'days',days:1},member,403)
 await fire(at('2027-04-01T04:00:00Z'));assert.equal((await h.state()).proposals.find(p=>p.id===signed.id).status,'accepted');assert.deepEqual(await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(signed.id).first(),accepted)
 // Historical sent-offer fixture: the old schema had no expiry/send-time record.
 const legacy=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Legacy offer without send-time custody'})
 await h.cmd('proposal.approve',{id:legacy.id,version:1,revision:1});await h.cmd('proposal.send',{id:legacy.id,version:2})
 await h.db.prepare('DELETE FROM p_expiry WHERE proposal_id=?').bind(legacy.id).run()
 await h.cmd('expiry.set',{id:legacy.id,version:3,mode:'days',days:7},h.owner,409)
 assert.equal((await h.state()).proposals.find(p=>p.id===legacy.id).expiry.sentAt,null)
 assert.match((await h.send('/app/proposal?id='+legacy.id,undefined,h.owner)).text,/No original send time is recorded/)
 await h.cmd('expiry.set',{id:legacy.id,version:3,mode:'date',date:'2027-04-08'})
 let historical=(await h.state()).proposals.find(p=>p.id===legacy.id);assert.equal(historical.expiry.date,'2027-04-08');assert.equal(historical.expiry.deadlineAt,at('2027-04-08T04:00:00Z'));assert.equal(historical.expiry.sentAt,null)
 await h.cmd('proposal.send',{id:legacy.id,version:historical.version})
 historical=(await h.state()).proposals.find(p=>p.id===legacy.id);assert.equal(historical.expiry.deadlineAt,at('2027-04-08T04:00:00Z'));assert.equal(historical.expiry.sentAt,null,'fresh invitation does not invent the original send time')
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const action of ['expiry.set','expiry.remove','expiry.reopen','expiry.warning'])assert.ok(audit.some(a=>a.action===action&&a.subject&&a.actor_id&&a.occurred_at),action+' is audited')
}))


test('SEND-010 / FOLLOW-002 withdrawal revokes every current public door, preserves history, notifies optionally and reissues only with approval',()=>run(async h=>{
 const {p,path}=await sent(h),cookie=await verified(h,path)
 await h.send('/auth/invite',{email:'sales@studio.example',displayName:'Sales colleague',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('sales@studio.example')
 await h.cmd('proposal.withdraw',{id:p.id,version:3,reason:'Sent to wrong client'},member,403)
 await h.cmd('proposal.withdraw',{id:p.id,version:3,reason:''},h.owner,400)
 await h.cmd('expiry.set',{id:p.id,version:3,mode:'days',days:14,warningDays:1})
 await h.send(path+'/action?name=question.create',{revision:1,section:'scope',text:'When can you begin?'},cookie)
 await h.cmd('followup.schedule',{id:p.id,action:'Call client about start date',dueDate:'2027-03-10'})
 assert.ok((await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===p.id))
 const before=(await h.state()).proposals.find(x=>x.id===p.id)
 await h.cmd('proposal.withdraw',{id:p.id,version:4,reason:'Sent to the wrong client'})
 for(const suffix of ['', '/action?name=accept','/action?name=code.request','/action?name=code.verify','/action?name=question.create','/action?name=suggestion.create','/action?name=expiry.reopen','/download.pdf?optionId=one','/attachments/any-file']){
  const r=await h.send(path+suffix,suffix.includes('/action')?{name:'Avery',optionId:'one',consent:true,code:'123456'}:undefined,cookie)
  assert.equal(r.status,410,r.text);assert.match(r.text,/Proposal withdrawn/);assert.match(r.text,/owner@studio.example/)
  for(const secret of [offer.title,offer.scope,offer.optionOne,'2400','When can you begin?'])assert.ok(!r.text.includes(secret),'withdrawn response reveals none of the proposal')
 }
 const after=(await h.state()).proposals.find(x=>x.id===p.id)
 assert.ok(!(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===p.id),'SEND-010 closes every general sales follow-up')
 assert.equal(after.status,'withdrawn');assert.deepEqual(after.options,before.options);assert.equal(after.withdrawals[0].reason,'Sent to the wrong client');assert.equal(after.withdrawals[0].actor_email,h.auth.OWNER_EMAIL);assert.ok(after.withdrawals[0].withdrawn_at>0)
 assert.equal((await h.state()).outbox.filter(m=>m.proposal_id===p.id&&m.subject.startsWith('Proposal withdrawn:')).length,1)
 assert.equal((await h.send('/api/platter/questions',undefined,h.owner)).value.questions.length,0)
 for(const [name,input] of [['proposal.send',{}],['proposal.revise',{...offer,clientId:before.client_id}],['expiry.remove',{}],['pdf.downloads',{enabled:false}],['suggestions.allow',{section:'scope',enabled:true}],['question.answer',{questionId:after.questions[0].id,text:'Tomorrow'}],['question.email',{questionId:after.questions[0].id}]])await h.cmd(name,{...input,id:p.id,version:5},h.owner,409)
 const audit=(await h.send('/api/platter/audit?action=proposal.withdraw',undefined,h.owner)).value.rows
 assert.equal(audit.length,1);assert.equal(audit[0].reason,'Sent to the wrong client');assert.equal(audit[0].actor_id,(await h.state()).actor.id);assert.equal(audit[0].occurred_at,after.withdrawals[0].withdrawn_at)
 await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(Date.now()+13*86400000),cron:'*/15 * * * *'})
 assert.equal((await h.state()).outbox.filter(m=>m.proposal_id===p.id&&m.subject.startsWith('Expiry warning:')).length,0,'withdrawal cancels the current scheduled warning')
 const report=(await h.send('/api/platter/pipeline?status=withdrawn&sort=value',undefined,h.owner)).value
 assert.equal(report.count,1);assert.equal(report.rows[0].id,p.id);assert.equal(report.rows[0].nextAction,'withdrawn');assert.equal(report.totals[0].valueCents,420000)
 const n=await h.cmd('proposal.negotiate',{...offer,clientId:before.client_id,id:p.id,version:5,scope:'Corrected client offer'})
 assert.ok((await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===p.id&&r.revision===2),'new negotiated revision has a new sales action')
 await h.cmd('followup.schedule',{id:p.id,action:'Review corrected offer with client',dueDate:'2027-03-11'})
 assert.equal((await h.send('/api/platter/followups',undefined,h.owner)).value.rows.find(r=>r.id===p.id).action,'Review corrected offer with client','a negotiated draft keeps an actionable sales follow-up before resend')
 assert.equal(n.revision,2);await h.cmd('proposal.send',{id:p.id,version:6},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:6,revision:2});const replacement=await h.cmd('proposal.send',{id:p.id,version:7})
 const newPath=new URL(replacement.shareUrl).pathname
 for(const name of ['question.answer','question.email'])await h.cmd(name,{id:p.id,questionId:after.questions[0].id,text:'Old thread'},h.owner,409)
 assert.equal((await h.send(path,undefined,cookie)).status,410);assert.equal((await h.send(newPath,undefined,cookie)).status,200)
 const session=await verified(h,newPath);assert.equal((await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},session)).status,200)
 await h.cmd('proposal.withdraw',{id:p.id,version:9,reason:'Too late'},h.owner,409)
 const secondProposal=await h.cmd('proposal.prepare',{...offer,clientId:before.client_id,title:'Cancelled campaign'});await h.cmd('proposal.approve',{id:secondProposal.id,version:1,revision:1});const secondShare=await h.cmd('proposal.send',{id:secondProposal.id,version:2});const second={p:secondProposal,path:new URL(secondShare.shareUrl).pathname},mailBefore=(await h.state()).outbox.length
 await h.cmd('proposal.withdraw',{id:second.p.id,version:3,reason:'Deal cancelled',notice:false})
 assert.equal((await h.state()).outbox.length,mailBefore);assert.equal((await h.send(second.path)).status,410)
}))


test('EDIT-012 duplicate accepted content into an independent member-owned draft for another client without changing the source',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {client,p}=await draft(h),beta=await h.cmd('client.save',{name:'Beta Co',email:'contact@beta.example'})
 const form=new FormData();form.set('id',p.id);form.set('version','1');form.set('file',new File(['%PDF exact retained source bytes'],'statement.pdf',{type:'application/pdf'}))
 const uploadRequest=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:form});const uploaded=await h.mf.dispatchFetch(uploadRequest.url,{method:'POST',headers:uploadRequest.headers,body:await uploadRequest.arrayBuffer()});assert.equal(uploaded.status,200);assert.match(await uploaded.text(),/Document saved/)
 const get=async id=>(await h.state()).proposals.find(p=>p.id===id)
 await h.cmd('pdf.downloads',{id:p.id,version:2,enabled:false});await h.cmd('expiry.set',{id:p.id,version:3,mode:'days',days:14,warningDays:1})
 await h.cmd('proposal.approve',{id:p.id,version:4,revision:2});const share=await h.cmd('proposal.send',{id:p.id,version:5}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
 await h.cmd('invoice.export',{id:p.id})
 await h.send('/auth/invite',{email:'sales@studio.example',displayName:'Morgan Sales',role:'member',returnTo:'/app'},h.owner);const member=await h.signIn('sales@studio.example'),actor=(await h.state(member)).actor
 const before=await get(p.id),accepted=(await h.send(path,undefined,cookie)).text
 await h.cmd('proposal.share',{id:p.id,operatorId:actor.id})
 await h.cmd('proposal.duplicate',{id:p.id,version:1,clientId:beta.id},member,409)
 const copy=await h.cmd('proposal.duplicate',{id:p.id,version:before.version,clientId:beta.id},member),after=await get(copy.id)
 assert.notEqual(copy.id,p.id);assert.equal(after.status,'draft');assert.equal(after.revision,1);assert.equal(after.version,1);assert.equal(after.client_id,beta.id);assert.equal(after.clientName,'Beta Co');assert.equal(after.clientEmail,'contact@beta.example');assert.equal(after.sales_owner_id,actor.id);assert.equal(after.prepared_by,actor.email)
 for(const field of ['scope','terms','options','currency','deposit_bps','attachments','pdfDownloadsEnabled'])assert.deepEqual(after[field],before[field],field+' copied exactly')
 assert.equal(after.expiry.mode,'days');assert.equal(after.expiry.days,14);assert.equal(after.expiry.warningDays,1);assert.equal(after.expiry.sentAt,null);assert.equal(after.expiry.deadlineAt,null);assert.equal(after.expiry.date,null);assert.equal(after.expiry.warningSentAt,null)
 assert.equal(after.approved_by,null);assert.equal(after.approved_at,null);assert.equal(after.acceptance,undefined);assert.equal(after.invoice,undefined);assert.equal(after.shareToken,undefined);assert.deepEqual(after.questions,[]);assert.deepEqual(after.suggestions,[]);assert.deepEqual(after.deliveries,[]);assert.deepEqual(after.pdfDownloads,[]);assert.deepEqual(after.withdrawals,[])
 assert.ok(!(await h.state()).outbox.some(m=>m.proposal_id===copy.id));assert.equal((await h.send('/api/platter/audit?subject='+copy.id,undefined,h.owner)).value.rows.filter(r=>r.action==='proposal.view').length,0)
 const file=await h.send('/api/platter/attachments/'+copy.id+'/'+after.attachments[0].id,undefined,member);assert.equal(file.text,'%PDF exact retained source bytes')
 await h.cmd('proposal.send',{id:copy.id,version:1},h.owner,409);await h.cmd('proposal.approve',{id:copy.id,version:1,revision:1},member,403);await h.cmd('proposal.approve',{id:copy.id,version:1,revision:1});await h.cmd('proposal.send',{id:copy.id,version:2})
 assert.deepEqual(await get(p.id),before);assert.equal((await h.send(path,undefined,cookie)).text,accepted,'source accepted agreement remains byte-identical')
 const same=await h.cmd('proposal.duplicate',{id:p.id,version:before.version});assert.equal((await get(same.id)).client_id,client.id)
 const states=['draft','approved','sent','expired','withdrawn']
 for(const status of states){
  const source=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Source '+status})
  if(status!=='draft')await h.cmd('proposal.approve',{id:source.id,version:1,revision:1})
  if(['sent','expired','withdrawn'].includes(status))await h.cmd('proposal.send',{id:source.id,version:2})
  if(status==='expired')await h.cmd('expiry.set',{id:source.id,version:3,mode:'date',date:'2020-01-01'})
  if(status==='withdrawn')await h.cmd('proposal.withdraw',{id:source.id,version:3,reason:'Cancelled',notice:false})
  const old=await get(source.id);assert.equal(old.status,status)
  const next=await h.cmd('proposal.duplicate',{id:source.id,version:old.version});const copied=await get(next.id);assert.equal(copied.status,'draft');for(const field of ['mode','days','date','warningDays'])assert.deepEqual(copied.expiry[field],old.expiry[field],'expiry '+field+' copied from '+status);assert.deepEqual(await get(source.id),old)
 }
 const draftSource=await get(same.id);await h.cmd('proposal.approve',{id:same.id,version:draftSource.version,revision:1});await h.cmd('proposal.send',{id:same.id,version:2});await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:same.id,version:3,scope:'Unsent negotiated scope'})
 const negotiated=await h.cmd('proposal.duplicate',{id:same.id,version:4});assert.equal((await get(negotiated.id)).scope,'Unsent negotiated scope')
 const key=await h.cmd('agent.create',{label:'Draft only'});assert.equal((await h.send('/api/platter/agent/command',{name:'proposal.duplicate',input:{id:p.id,version:before.version}},'',{authorization:'Bearer '+key.token})).status,403)
}))

test('EDIT-018 member-only exact-revision previews share selection math and never change business state',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {p,client}=await draft(h)
 const upload=new FormData();upload.set('id',p.id);upload.set('version','1');upload.set('file',new File(['%PDF preview attachment'],'campaign.pdf',{type:'application/pdf'}))
 const uploadRequest=new Request(h.origin+'/app/attachment',{method:'POST',headers:{origin:h.origin,cookie:h.owner},body:upload});const uploaded=await h.mf.dispatchFetch(uploadRequest.url,{method:'POST',headers:uploadRequest.headers,body:await uploadRequest.arrayBuffer()});assert.equal(uploaded.status,200);assert.match(await uploaded.text(),/Document saved/)
 await h.cmd('expiry.set',{id:p.id,version:2,mode:'days',days:14,warningDays:1})
 await h.send('/auth/invite',{email:'previewer@studio.example',displayName:'Previewer',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('previewer@studio.example')
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id})
 const key=await h.cmd('agent.create',{label:'Preview boundary'})
 const url=`/app/preview?id=${p.id}&revision=2`,inner=url.replace('/app/preview?','/app/preview/client?')
 const unchanged=()=>h.state(),audit=async()=>(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 const initialAudit=await audit(),before=await unchanged()
 for(const cookie of [h.owner,member]){
  for(const width of [1440,390]){
   const wrapper=await h.send(url+`&width=${width}`,undefined,cookie);assert.equal(wrapper.status,200);assert.match(wrapper.text,new RegExp(`width="${width}"`));assert.match(wrapper.text,/Viewing as Northstar Coffee/)
   for(const [optionId,total,deposit] of [['one','2,400.00','600.00'],['two','4,200.00','1,050.00']]){
    const r=await h.send(inner+`&width=${width}&optionId=${optionId}`,undefined,cookie)
    assert.equal(r.status,200,r.text);assert.match(r.text,/One studio shoot, edited photographs, and usage licence/);assert.match(r.text,/campaign.pdf/);assert.match(r.text,/Expires 14 calendar days after sending/)
    assert.ok(r.text.includes(`aria-label="Selected total">$${total} USD`));assert.ok(r.text.includes(`aria-label="Selected deposit">$${deposit} USD`))
    assert.match(r.text,/<fieldset disabled>/);assert.ok(!r.text.includes('/p/'));assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'self'/)
   }
  }
 }
 const viewedAudit=await audit(),previewRows=viewedAudit.filter(row=>row.action==='proposal.preview')
 assert.equal(previewRows.length,12);for(const row of previewRows){assert.equal(row.subject,p.id);assert.ok(row.actor_id);assert.ok(['owner','sales'].includes(row.actor_role));assert.ok(Number.isFinite(row.occurred_at))}
 assert.deepEqual(viewedAudit.filter(row=>row.action!=='proposal.preview'),initialAudit)
 for(const path of [url,inner]){
  assert.equal((await h.send(path)).status,401)
  assert.equal((await h.send(path,undefined,'',{authorization:'Bearer '+key.token})).status,401)
  for(const name of ['accept','pay','decline','question.create','suggestion.create','code.request','code.verify'])assert.equal((await h.send(path.split('?')[0]+'/action?'+path.split('?')[1]+'&name='+name,{name,optionId:'two',consent:true},h.owner)).status,403)
 }
 assert.equal((await h.send(inner+'&optionId=unknown',undefined,h.owner)).status,400)
 assert.equal((await h.send(inner+'&width=500',undefined,h.owner)).status,400)
 assert.equal((await h.send(inner.replace('revision=2','revision=3'),undefined,h.owner)).status,409)
 assert.deepEqual(await unchanged(),before);assert.deepEqual(await audit(),viewedAudit)
 const attachment=before.proposals.find(row=>row.id===p.id).attachments[0]
 const download=await h.send(`/app/preview/client/attachments/${attachment.id}?id=${p.id}&revision=2`,undefined,member);assert.equal(download.status,200);assert.equal(download.text,'%PDF preview attachment');assert.deepEqual(await unchanged(),before)
 assert.equal((await h.send(`/app/preview/client/attachments/${attachment.id}?id=${p.id}&revision=1`,undefined,member)).status,409)
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:2})
 const approved=await unchanged();assert.equal((await h.send(inner,undefined,member)).status,200);assert.deepEqual(await unchanged(),approved)
 const sentOffer=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(sentOffer.shareUrl).pathname
 const cookie=await verified(h,path)
 assert.equal((await h.send(inner,undefined,cookie)).status,401)
 assert.equal((await h.send(inner,undefined,h.owner)).status,409)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:5,scope:'New negotiated scope for preview.',priceTwo:'4300.03',depositPercent:'33.33'})
 const negotiationUrl=inner.replace('revision=2','revision=3')+'&optionId=two',pendingBefore=await unchanged()
 const pending=await h.send(negotiationUrl,undefined,member);assert.equal(pending.status,200);assert.match(pending.text,/New negotiated scope for preview/);assert.match(pending.text,/Changes since your previous offer/);assert.match(pending.text,/Selected total">\$4,300.03 USD/);assert.match(pending.text,/Selected deposit">\$1,433.20 USD/)
 assert.deepEqual(await unchanged(),pendingBefore)
 const old=await h.send(path,undefined,cookie);assert.match(old.text,/One studio shoot/);assert.ok(!old.text.includes('New negotiated scope'))
 await h.cmd('proposal.approve',{id:p.id,version:6,revision:3});const next=await h.cmd('proposal.send',{id:p.id,version:7}),nextPath=new URL(next.shareUrl).pathname,nextCookie=await verified(h,nextPath)
 await h.send(nextPath+'/action?name=accept',{name:'Avery Chen',optionId:'two',consent:true},nextCookie)
 const final=(await h.state()).proposals.find(row=>row.id===p.id);assert.equal(final.acceptance.totalCents,430003);assert.equal(final.acceptance.depositCents,143320);assert.equal(final.scope,'New negotiated scope for preview.')
}))

test('FOLLOW-002 sales queue orders current reasons and separates notification, logged completion, correction and withdrawal',()=>run(h=>followupJourney(h,{offer,verified})))

test('EDIT-009 conditional sections match selected preview, client, PDF and immutable agreement; revisions, copies and negotiations retain rules',async()=>{
 const h=await harness({assetsDirectory:'public'});try{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const client=await h.cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
 const fields={...offer,clientId:client.id,optionOne:'Standard',optionTwo:'Premium',terms:'Premium timeline: strategy in week one, delivery in week four.',sectionConditions:{terms:'two'}}
 for(const invalid of [{terms:'missing'},{price:'two'},{scope:'one',terms:1}])await h.cmd('proposal.prepare',{...fields,sectionConditions:invalid},h.owner,400)
 const original=await h.cmd('proposal.prepare',fields)
 const copy=await h.cmd('proposal.duplicate',{id:original.id,version:1})
 await h.cmd('proposal.revise',{...fields,id:copy.id,version:1,sectionConditions:{scope:'one'}})
 await h.cmd('proposal.restore',{id:copy.id,version:2,revision:1})
 assert.deepEqual((await h.state()).revisions.find(r=>r.proposal_id===copy.id&&r.revision===3).snapshot.section_conditions,{terms:'two'})
 for(const [p,optionId] of [[original,'one'],[copy,'two']]){
  const current=(await h.state()).proposals.find(r=>r.id===p.id)
  for(const id of ['one','two']){
   const preview=await h.send(`/app/preview/client?id=${p.id}&revision=${current.revision}&optionId=${id}`,undefined,h.owner)
   assert.equal(preview.status,200);assert.equal(preview.text.includes(fields.terms),id==='two')
  }
  await h.cmd('proposal.approve',{id:p.id,version:current.version,revision:current.revision})
  const share=await h.cmd('proposal.send',{id:p.id,version:current.version+1}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
  for(const id of ['one','two']){
   const page=await h.send(path+'?optionId='+id,undefined,cookie);assert.equal(page.status,200);assert.equal(page.text.includes(fields.terms),id==='two')
   const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId='+id,{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200)
   const text=(await pdfPages(await pdf.arrayBuffer())).join(' ');assert.equal(text.includes(fields.terms),id==='two');assert.ok(text.includes(offer.scope))
  }
  const accepted=await h.send(path+'/action?name=accept',{optionId,name:'Avery Chen',consent:true},cookie);assert.equal(accepted.status,200);assert.equal(accepted.text.includes(fields.terms),optionId==='two')
  const row=await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),frozen=JSON.parse(row.snapshot)
  assert.equal(frozen.terms??'',optionId==='two'?fields.terms:'');assert.equal(frozen.scope,offer.scope)
  assert.ok(!row.snapshot.includes('section_conditions'));assert.equal(row.snapshot.includes(fields.terms),optionId==='two')
  assert.equal((await h.send(path+'?optionId='+(optionId==='one'?'two':'one'),undefined,cookie)).text.includes(fields.terms),optionId==='two','accepted selection cannot change through a query')
  await h.cmd('proposal.revise',{...fields,id:p.id,version:current.version+3},h.owner,409)
 }
 const next=await h.cmd('proposal.prepare',fields);await h.cmd('proposal.approve',{id:next.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:next.id,version:2})
 await h.cmd('proposal.negotiate',{...fields,id:next.id,version:3,sectionConditions:{scope:'two',terms:'one'}})
 await h.cmd('proposal.approve',{id:next.id,version:4,revision:2});const replacement=await h.cmd('proposal.send',{id:next.id,version:5})
 assert.equal((await h.send(new URL(share.shareUrl).pathname)).status,404)
 const premium=await h.send(new URL(replacement.shareUrl).pathname+'?optionId=two');assert.ok(premium.text.includes(offer.scope));assert.ok(!premium.text.includes(fields.terms))
 const standard=await h.send(new URL(replacement.shareUrl).pathname+'?optionId=one');assert.ok(!standard.text.includes(offer.scope));assert.ok(standard.text.includes(fields.terms))
 const changes=await h.send(`/app/proposal?id=${next.id}&from=1&to=2`,undefined,h.owner);assert.match(changes.text,/scope visibility/);assert.match(changes.text,/terms visibility/)
 }finally{await h.close()}
})

test('PRICE-001 / COLLAB-003 / EDIT-009 / EDIT-012 / EDIT-014 / EDIT-018 / PROP-001 / TEAM-004 tables recompute twelve grouped lines, preserve every carrier and refuse malformed prices and quantities',async()=>{const h=await harness({assetsDirectory:'public'});try{
 const {pricingFixture,pricingExpected:expected}=await import('./pricing-fixture.mjs')
 const tables=pricingFixture(),client=await h.cmd('client.save',{name:'Northstar tables',email:'tables@studio.example'})
 const input={...offer,clientId:client.id,pricingTables:tables,priceOne:'9999999',terms:'Premium only',sectionConditions:{terms:'two'}}
 const p=await h.cmd('proposal.prepare',input)
 const current=async()=> (await h.state()).proposals.find(x=>x.id===p.id)
 let row=await current();assert.equal(row.currency,'USD');assert.equal(row.options[0].cents,expected.grandCents)
 assert.deepEqual(row.options[0].tables.map(t=>t.subtotalCents),expected.tableCents)
 assert.deepEqual(row.options[0].tables.map(t=>t.groups.map(g=>g.subtotalCents)),expected.groupCents)
 for(let t=0;t<2;t++)for(let i=0;i<6;i++){
  const line=row.options[0].tables[t].lines[i],source=tables[t].lines[i]
  for(const field of ['name','description','quantity','unit','unitPrice','group'])assert.equal(line[field],source[field])
  assert.equal(line.lineTotalCents,source.expected)
 }
 const key=await h.cmd('agent.create',{label:'PRICE-001 table assistant'})
 const rpc=await h.send('/api/platter/agent/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'prepare_proposal',arguments:{clientId:client.id,title:'Agent table draft',scope:'Source-defined services',depositPercent:25,optionOne:'Project',priceOne:'1',optionTwo:'Campaign',priceTwo:'4200',pricingTables:tables}}},'',{authorization:'Bearer '+key.token})
 assert.equal(rpc.status,200);assert.ok(!rpc.value.result.isError,JSON.stringify(rpc.value));const agentDraft=JSON.parse(rpc.value.result.content[0].text);assert.equal((await h.state()).proposals.find(x=>x.id===agentDraft.id).options[0].cents,expected.grandCents)
 const before=await h.state()
 for(const [field,values] of [['quantity',['0','-1','1.0001','NaN','Infinity','1e2','1000001',{},null]],['unitPrice',['0','-1','1.001','NaN','1e2','10000001',{},null]]])for(const value of values){
  const bad=pricingFixture();bad[0].lines[0][field]=value
  await h.cmd('proposal.prepare',{...input,pricingTables:bad},h.owner,400)
 }
 for(const bad of ['invalid',{},[{optionId:'missing',name:'Bad',lines:tables[0].lines}],[{optionId:'one',name:'Empty',lines:[]} ]])await h.cmd('proposal.prepare',{...input,pricingTables:bad},h.owner,400)
 const overflow=pricingFixture();overflow[0].lines[0].quantity='1000000';overflow[0].lines[0].unitPrice='10000000';await h.cmd('proposal.prepare',{...input,pricingTables:overflow},h.owner,400)
 assert.deepEqual((await h.state()).proposals,before.proposals,'bad inputs write no proposals')
 const changed=pricingFixture();changed[0].lines[0].description='Revised description at the same price'
 await h.cmd('proposal.revise',{...input,id:p.id,version:1,pricingTables:changed})
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 let response=await h.send(`/app/proposal?id=${p.id}&from=1&to=2`,undefined,h.owner);assert.match(response.text,/Revised description at the same price/);assert.match(response.text,/<del>[^]*Agreed discovery service/)
 await h.cmd('proposal.restore',{id:p.id,version:2,revision:1})
 row=await current();assert.deepEqual(row.options[0].tables,before.proposals.find(x=>x.id===p.id).options[0].tables)
 const copied=await h.cmd('proposal.duplicate',{id:p.id,version:3});assert.deepEqual((await h.state()).proposals.find(x=>x.id===copied.id).options,row.options)
 response=await h.send(`/app/preview/client?id=${p.id}&revision=3&optionId=one`,undefined,h.owner);assert.equal(response.status,200);assert.match(response.text,/403\.89/);assert.match(response.text,/Project services/);assert.doesNotMatch(response.text,/Premium only/)
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:3});const share=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
 for(let reload=0;reload<2;reload++){response=await h.send(path+'?optionId=one',undefined,cookie);assert.match(response.text,/403\.89/);for(const table of tables)for(const line of table.lines)assert.ok(response.text.includes(line.description))}
 const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=one',{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200)
 const pages=await pdfPages(await pdf.arrayBuffer()),content=pages.join(' ')
 for(const table of tables)for(const line of table.lines){assert.ok(content.includes(line.description));assert.ok(content.includes(line.quantity+' '+line.unit))}
 for(const value of ['403.89','330.03','73.86','100.97'])assert.ok(content.includes(value))
 for(const page of pages)assert.match(page,/Not signed, revision 3/)
 await h.cmd('proposal.negotiate',{...input,id:p.id,version:5,pricingTables:changed})
 assert.deepEqual((await current()).options[0].tables[0].lines[0].description,changed[0].lines[0].description)
 response=await h.send(path,undefined,cookie);assert.match(response.text,/Agreed discovery service/);assert.doesNotMatch(response.text,/Revised description at the same price/)
 response=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie);assert.equal(response.status,200)
 const accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()
 assert.equal(accepted.total_cents,expected.grandCents);assert.equal(accepted.deposit_cents,expected.depositCents);assert.deepEqual(JSON.parse(accepted.snapshot).options[0].tables,before.proposals.find(x=>x.id===p.id).options[0].tables)
 await h.cmd('proposal.revise',{...input,id:p.id,version:7},h.owner,409)
 const audit=(await h.send('/api/platter/audit?subject='+p.id,undefined,h.owner)).value.rows
 assert.ok(audit.some(r=>r.kind==='proposal.prepare'||r.action==='proposal.prepare'))
}finally{await h.close()}})

test('PRICE-002 / EDIT-009 / EDIT-012 / EDIT-014 / EDIT-018 / COLLAB-003 / PORT-002 arbitrary packages and bounded optional quantities share server totals and immutable selection',async()=>{
 const h=await harness({assetsDirectory:'public'});try{
  const {packageFixture,packageSelection:items,packageExpected:expected}=await import('./packages-fixture.mjs')
  const client=await h.cmd('client.save',{name:'Package client',email:'packages@studio.example'})
  const input={...offer,clientId:client.id,packages:packageFixture(),terms:'Complete package only',sectionConditions:{terms:'three'}}
  const p=await h.cmd('proposal.prepare',input),current=async()=> (await h.state()).proposals.find(x=>x.id===p.id)
  const key=await h.cmd('agent.create',{label:'PRICE-002 package drafter'}),rpc=await h.send('/api/platter/agent/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'prepare_proposal',arguments:{clientId:client.id,title:'Agent package draft',scope:'Defined services',depositPercent:25,packages:packageFixture()}}},'',{authorization:'Bearer '+key.token})
  assert.equal(rpc.status,200);assert.ok(!rpc.value.result.isError,JSON.stringify(rpc.value));const agentDraft=JSON.parse(rpc.value.result.content[0].text);assert.equal((await h.state()).proposals.find(x=>x.id===agentDraft.id).options.length,3)
  let row=await current();assert.equal(row.options.length,3);assert.equal(row.options[1].optionalItems[0].unitCents,7525)
  const before=await h.state()
  for(const change of [p=>p[1].optionalItems[0].max=0,p=>p[1].optionalItems[0].min=11,p=>p[1].id='one',p=>p[1].optionalItems[0].unitPrice='1.001',p=>p[1].optionalItems.push({...p[1].optionalItems[0]})]){
   const packages=packageFixture();change(packages);await h.cmd('proposal.prepare',{...input,packages},h.owner,400)
  }
  await h.cmd('proposal.prepare',{...input,packages:[]},h.owner,400)
  assert.deepEqual((await h.state()).proposals,before.proposals)
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  const query='&optionId=two&items='+encodeURIComponent(JSON.stringify(items)),preview=`/app/preview/client?id=${p.id}&revision=1${query}`
  let r=await h.send(preview,undefined,h.owner);assert.equal(r.status,200,r.text);assert.match(r.text,/2,301\.00/);assert.match(r.text,/575\.25/);assert.doesNotMatch(r.text,/Complete package only/)
  assert.deepEqual((await current()).options,row.options);assert.equal((await current()).version,1);assert.deepEqual((await h.state()).outbox,before.outbox)
  for(const optionId of ['one','two','three']){r=await h.send(`/app/preview/client?id=${p.id}&revision=1&optionId=${optionId}`,undefined,h.owner);assert.equal(r.status,200);assert.equal(r.text.includes('Complete package only'),optionId==='three')}
  r=await h.send(preview.replace('quantity%22%3A4','quantity%22%3A11'),undefined,h.owner);assert.equal(r.status,400)
  const records=({proposals,revisions,outbox})=>({proposals,revisions,outbox}),unchanged=records(await h.state())
  r=await h.send(`/app/preview/client/action?id=${p.id}&revision=1&name=accept${query}`,{name:'Avery Chen',optionId:'two',items,consent:true},h.owner);assert.equal(r.status,403);assert.deepEqual(records(await h.state()),unchanged,'a preview selection cannot accept or write')
  const changed=packageFixture();changed[1].optionalItems[0].unitPrice='80'
  await h.cmd('proposal.revise',{...input,id:p.id,version:1,packages:changed})
  r=await h.send(`/app/proposal?id=${p.id}&from=1&to=2`,undefined,h.owner);assert.match(r.text,/optional items/);assert.match(r.text,/80\.00/)
  await h.cmd('proposal.restore',{id:p.id,version:2,revision:1});row=await current();assert.deepEqual(row.options,before.proposals.find(x=>x.id===p.id).options)
  const copy=await h.cmd('proposal.duplicate',{id:p.id,version:3});assert.deepEqual((await h.state()).proposals.find(x=>x.id===copy.id).options,row.options)
  const copied=()=>h.state().then(s=>s.proposals.find(x=>x.id===copy.id))
  await h.cmd('proposal.revise',{...offer,clientId:client.id,id:copy.id,version:1,title:'Legacy command updates first package',priceOne:'1200'})
  assert.equal((await copied()).options[0].cents,120000);assert.equal((await copied()).options.length,3);assert.deepEqual((await copied()).options[1].optionalItems,row.options[1].optionalItems)

  // A single package is valid too; no fixed two-package limit remains.
  const single=await h.cmd('proposal.prepare',{...input,packages:[packageFixture()[0]],sectionConditions:{}});assert.equal((await h.state()).proposals.find(x=>x.id===single.id).options.length,1)
  // PRICE-001 inheritance: any package can be priced by tables, and its selected optional items add to the table total.
  const tabled=await h.cmd('proposal.prepare',{...input,sectionConditions:{},pricingTables:[{optionId:'three',name:'Delivery',lines:[{name:'Sprint',quantity:'2',unit:'week',unitPrice:'1500.50'}]}]})
  r=await h.send(`/app/preview/client?id=${tabled.id}&revision=1&optionId=three&items=`+encodeURIComponent(JSON.stringify([{id:'rush',quantity:2}])),undefined,h.owner);assert.equal(r.status,200,r.text);assert.match(r.text,/3,151\.50/);assert.match(r.text,/787\.88/)
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:3});const share=await h.cmd('proposal.send',{id:p.id,version:4}),path=new URL(share.shareUrl).pathname,cookie=await verified(h,path)
  const offerBefore=await current()
  for(const invalid of [[{id:'rush',quantity:11}],[{id:'rush',quantity:0}],[{id:'rush',quantity:'1.5'}],[{id:'unknown',quantity:1}],[{id:'rush',quantity:1},{id:'rush',quantity:1}],[{id:'training',quantity:2}],{},null]){
   const q='?optionId=two&items='+encodeURIComponent(JSON.stringify(invalid))
   assert.equal((await h.send(path+q,undefined,cookie)).status,400)
   const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf'+q,{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,400)
   assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items:invalid,consent:true},cookie)).status,400)
  }
  assert.deepEqual(await current(),offerBefore,'refused selections write nothing')
  r=await h.send(path+'?optionId=two&items='+encodeURIComponent(JSON.stringify(items)),undefined,cookie);assert.equal(r.status,200);assert.match(r.text,/2,301\.00/);assert.match(r.text,/575\.25/)
  const removed=await h.send(path+'?optionId=two',undefined,cookie);assert.match(removed.text,/2,000\.00/)
  // PRICE-002: native review forms discard the previous package's checked items on a switch.
  for(const route of [path+'?optionId=one',`/app/preview/client?id=${copy.id}&revision=2&optionId=one`]){
   const review=await h.send(route+'&itemsOptionId=two&add.rush=yes&qty.rush=4',undefined,route.startsWith('/app/')?h.owner:cookie)
   assert.equal(review.status,200,review.text);assert.match(review.text,route.startsWith('/app/')?/1,200\.00/:/1,000\.00/)
  }
  const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=two&items='+encodeURIComponent(JSON.stringify(items)),{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200)
  const pages=await pdfPages(await pdf.arrayBuffer());for(const page of pages)assert.match(page,/Not signed, revision 3/)
  const pdfText=pages.join(' ');for(const text of ['2,301.00','575.25','Rush delivery: 4 x USD 75.25 = USD 301.00'])assert.ok(pdfText.includes(text),pdfText);assert.ok(!pdfText.includes('Complete package only'))
  const downloads=(await current()).pdfDownloads;assert.deepEqual(JSON.parse(downloads[0].selection).map(x=>({id:x.id,quantity:x.quantity})),items)
  await h.cmd('proposal.negotiate',{...input,id:p.id,version:5,packages:changed})
  r=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items,consent:true,totalCents:1,depositCents:1},cookie);assert.equal(r.status,200,r.text)
  const accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),snapshot=JSON.parse(accepted.snapshot)
  assert.equal(accepted.total_cents,expected.totalCents);assert.equal(accepted.deposit_cents,expected.depositCents);assert.equal(snapshot.selection.optionId,'two');assert.equal(snapshot.selection.items[0].quantity,4);assert.equal(snapshot.selection.items[0].totalCents,30100);assert.ok(!snapshot.terms);assert.deepEqual(snapshot.options,row.options)
  await h.send(path+'/action?name=accept',{name:'Another signer',optionId:'one',items:[],consent:true},cookie);assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),accepted)
  r=await h.send(path,undefined,cookie);assert.match(r.text,/2,301\.00/);assert.match(r.text,/Rush delivery/)
  const invoice=await h.cmd('invoice.export',{id:p.id});assert.match((await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,h.owner)).text,/575\.25/)

  // EDIT-009 inheritance: a section shown only while an optional item is added, in whichever package offers it.
  const rushTerms='Rush delivery terms apply.',rushInput={...input,title:'Rush-dependent terms',terms:rushTerms,sectionConditions:{terms:'item:rush'}},withRush='&items='+encodeURIComponent(JSON.stringify(items)),beforeRush=await h.state()
  for(const terms of ['item:absent','item:','item:rush:extra','rush'])await h.cmd('proposal.prepare',{...rushInput,sectionConditions:{terms}},h.owner,400)
  assert.deepEqual((await h.state()).proposals,beforeRush.proposals,'unknown optional-item conditions write nothing')
  const rush=await h.cmd('proposal.prepare',rushInput),rushCopy=await h.cmd('proposal.duplicate',{id:rush.id,version:1}),conditions=async id=>JSON.parse((await h.state()).proposals.find(x=>x.id===id).section_conditions)
  assert.deepEqual(await conditions(rushCopy.id),{terms:'item:rush'})
  await h.cmd('proposal.revise',{...rushInput,id:rushCopy.id,version:1,sectionConditions:{terms:'item:training'}});await h.cmd('proposal.restore',{id:rushCopy.id,version:2,revision:1});assert.deepEqual(await conditions(rushCopy.id),{terms:'item:rush'})
  for(const [selection,shown] of [['&optionId=two',false],['&optionId=two'+withRush,true],['&optionId=three&items='+encodeURIComponent(JSON.stringify([{id:'rush',quantity:1}])),true],['&optionId=one&items='+encodeURIComponent(JSON.stringify([{id:'training',quantity:1}])),false]]){
   r=await h.send(`/app/preview/client?id=${rush.id}&revision=1${selection}`,undefined,h.owner);assert.equal(r.status,200,r.text);assert.equal(r.text.includes(rushTerms),shown,selection)
  }
  const sendRush=async(id,version,revision)=>{
   await h.cmd('proposal.approve',{id,version,revision});const path=new URL((await h.cmd('proposal.send',{id,version:version+1})).shareUrl).pathname
   assert.equal((await h.send(path+'/action?name=code.request',{})).status,200);const code=(await h.state()).outbox.find(x=>x.proposal_id===id&&x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
   const v=await h.send(path+'/action?name=code.verify',{code});assert.equal(v.status,200,v.text);return {path,cookie:v.cookie}
  }
  const added=await sendRush(rush.id,1,1),omitted=await sendRush(rushCopy.id,3,3)
  for(const [selection,shown] of [['?optionId=two',false],['?optionId=two'+withRush,true]]){
   assert.equal((await h.send(added.path+selection,undefined,added.cookie)).text.includes(rushTerms),shown,selection)
   const pdf=await h.mf.dispatchFetch(h.origin+added.path+'/download.pdf'+selection,{headers:{host:new URL(h.origin).host,cookie:added.cookie}});assert.equal(pdf.status,200)
   assert.equal((await pdfPages(await pdf.arrayBuffer())).join(' ').includes(rushTerms),shown,'PDF '+selection)
  }
  assert.equal((await h.send(added.path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items,consent:true},added.cookie)).status,200)
  assert.equal((await h.send(omitted.path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items:[],consent:true},omitted.cookie)).status,200)
  const agreement=async id=>JSON.parse((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(id).first()).snapshot)
  assert.equal((await agreement(rush.id)).terms,rushTerms);assert.ok(!(await agreement(rushCopy.id)).terms,'the agreement omits a section whose optional item was not added')
  assert.ok((await h.send(added.path,undefined,added.cookie)).text.includes(rushTerms));assert.ok(!(await h.send(omitted.path,undefined,omitted.cookie)).text.includes(rushTerms))
 }finally{await h.close()}
})


test('PRICE-002 / SIGN-008 / TEAM-004 signed-upload selections use sent prices, refuse invalid quantities without writes, and freeze the exact agreement and invoice',()=>run(async h=>{
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 const {packageFixture,packageSelection:items,packageExpected:expected}=await import('./packages-fixture.mjs')
 const client=await h.cmd('client.save',{name:'Paper package client',email:'paper@studio.example'})
 const input={...offer,clientId:client.id,packages:packageFixture(),terms:'Complete package only',sectionConditions:{terms:'three'}}
 const p=await h.cmd('proposal.prepare',input)
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(share.shareUrl).pathname
 const fields={id:p.id,version:3,optionId:'two',signer:'Morgan Lee',signedOn:'2026-10-15',attest:'yes',items:JSON.stringify(items),totalCents:1,depositCents:1}
 const bytes=new TextEncoder().encode('%PDF package Growth with Rush delivery quantity four')
 const record=async(values,cookie=h.owner)=>{
  const form=new FormData();for(const [k,v]of Object.entries(values))form.set(k,String(v));form.set('file',new File([bytes],'packages-signed.pdf',{type:'application/pdf'}))
  const request=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie},body:form})
  const r=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});return {status:r.status,text:await r.text()}
 }
 const current=async()=>(await h.state()).proposals.find(x=>x.id===p.id)
 const before=await current(),filesBefore=(await h.db.prepare('SELECT * FROM p_attachment_files').all()).results,auditBefore=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows
 for(const invalid of [[{id:'rush',quantity:11}],[{id:'rush',quantity:0}],[{id:'rush',quantity:'1.5'}],[{id:'unknown',quantity:1}],[{id:'rush',quantity:1},{id:'rush',quantity:1}],[{id:'training',quantity:2}],{},null])assert.equal((await record({...fields,items:JSON.stringify(invalid)})).status,400)
 assert.equal((await record({...fields,items:'not JSON'})).status,400)
 assert.equal((await record({...fields,optionId:'absent'})).status,400)
 assert.equal((await record({...fields,version:2})).status,409)
 await h.send('/auth/invite',{email:'paper-member@studio.example',displayName:'Member',role:'member',returnTo:'/app'},h.owner)
 assert.equal((await record(fields,await h.signIn('paper-member@studio.example'))).status,403)
 assert.deepEqual(await current(),before)
 assert.deepEqual((await h.db.prepare('SELECT * FROM p_attachment_files').all()).results,filesBefore,'invalid selections retain no uploaded files')
 assert.deepEqual((await h.send('/api/platter/audit',undefined,h.owner)).value.rows.filter(x=>x.action==='acceptance.upload'),auditBefore.filter(x=>x.action==='acceptance.upload'))
 for(const quantity of [1,10]){const r=await h.send(`/app/proposal?id=${p.id}&paperOption=two&add.rush=yes&qty.rush=${quantity}`,undefined,h.owner);assert.equal(r.status,200,r.text)}
 const review=await h.send(`/app/proposal?id=${p.id}&paperOption=two&add.rush=yes&qty.rush=4`,undefined,h.owner)
 assert.equal(review.status,200);assert.match(review.text,/2,301\.00/);assert.match(review.text,/575\.25/);assert.equal((await current()).version,3)
 // A negotiation cannot substitute its higher prices for the already sent paper.
 const changed=packageFixture();changed[1].optionalItems[0].unitPrice='80'
 await h.cmd('proposal.negotiate',{...input,id:p.id,version:3,packages:changed})
 const r=await record({...fields,version:4});assert.equal(r.status,200,r.text)
 const accepted=await current(),a=accepted.acceptance
 assert.equal(a.method,'upload');assert.equal(a.optionId,'two');assert.equal(a.totalCents,expected.totalCents);assert.equal(a.depositCents,expected.depositCents);assert.equal(a.selection.items[0].quantity,4);assert.equal(a.selection.items[0].unitCents,7525)
 const frozen=JSON.parse((await h.db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).snapshot)
 assert.equal(frozen.selection.items[0].totalCents,30100);assert.equal(frozen.terms,'');assert.deepEqual(frozen.options,before.options);assert.equal(accepted.negotiating,undefined)
 assert.equal((await record({...fields,version:5,optionId:'one',items:'[]'})).status,409);assert.deepEqual((await current()).acceptance,a)
 const cookie=await verified(h,path),clientView=await h.send(path,undefined,cookie);assert.match(clientView.text,/2,301\.00/);assert.match(clientView.text,/575\.25/);assert.match(clientView.text,/Rush delivery/);assert.doesNotMatch(clientView.text,/Complete package only|packages-signed.pdf/)
 const file=await h.mf.dispatchFetch(h.origin+'/api/platter/attachments/'+p.id+'/'+a.signedCopy.id,{headers:{cookie:h.owner}});assert.equal(file.status,200);assert.deepEqual(new Uint8Array(await file.arrayBuffer()),bytes)
 const invoice=await h.cmd('invoice.export',{id:p.id});assert.match((await h.send('/api/platter/invoices/'+invoice.id+'.csv',undefined,h.owner)).text,/575\.25/)
 const audit=(await h.send('/api/platter/audit',undefined,h.owner)).value.rows.filter(x=>x.action==='acceptance.upload'&&x.subject===p.id);assert.equal(audit.length,1);assert.equal(audit[0].actor_role,'owner');assert.ok(audit[0].occurred_at)
}))

test('EDIT-002 / MOB-001 five starter and personal templates start independent drafts, guard ownership and versions, and retain agent approval boundaries',async()=>{const h=await harness({assetsDirectory:'public'});try{await templatesHttp(h)}finally{await h.close()}})


test('EDIT-016 body phrase search returns only two of 500 proposals through the owner HTTP pipeline', {timeout:120000}, ()=>run(async h=>{
 const client=await h.cmd('client.save',{name:'Search client',email:'search@studio.example'}),matches=[];let pricedId,oldLink
 for(let n=0;n<500;n++){
  const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:`Proposal ${String(n).padStart(3,'0')}`,scope:n===0?'Delivery includes literal [50%_budget] review.':offer.scope,terms:n===1?'Confirm literal [50%_budget] review before delivery.':'',...(n===2?{pricingTables:[{optionId:'one',name:'Services',lines:[{name:'Painting',description:'Weatherproof copper finish',quantity:'1',unit:'project',unitPrice:'1200'}]}]}:{})})
  if(n<2)matches.push(p.id)
  if(n===2)pricedId=p.id
  if(n===0){await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const share=await h.cmd('proposal.send',{id:p.id,version:2});oldLink=new URL(share.shareUrl).pathname;const cookie=await verified(h,oldLink);assert.equal((await h.send(oldLink+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)}
 }
 const started=performance.now(),r=await h.send('/api/platter/pipeline?q='+encodeURIComponent('LITERAL   [50%_budget] REVIEW'),undefined,h.owner)
 console.log('EDIT-016 500-proposal HTTP search elapsed ms:',Math.round(performance.now()-started))
 assert.equal(r.status,200,r.text);assert.deepEqual(new Set(r.value.rows.map(p=>p.id)),new Set(matches));assert.equal(r.value.count,2)
 assert.deepEqual(r.value.totals,[{currency:'USD',count:2,valueCents:660000}])
 const priced=await h.send('/api/platter/pipeline?q='+encodeURIComponent('weatherproof copper finish'),undefined,h.owner);assert.equal(priced.status,200);assert.deepEqual(priced.value.rows.map(p=>p.id),[pricedId])
 const credential=await h.send('/api/platter/pipeline?q='+oldLink.split('/').at(-1),undefined,h.owner);assert.equal(credential.status,200);assert.equal(credential.value.count,0,'invitation credentials never participate in search')
}))


test('SEND-006 self-test mail uses only the active sign-in address, previews an unsent revision and atomically limits daily rehearsals without sending an offer',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {client,p}=await draft(h)
 const input={id:p.id,version:1,subject:'Proposal for Northstar',message:'Hi Avery,\nPlease review the photography scope.'}
 const lifecycle=async()=>{
  const state=await h.state(),proposal=state.proposals.find(row=>row.id===p.id)
  const {testMail,...content}=proposal
  return {proposal:content,revisions:state.revisions,followups:state.followups,actions:state.followupActions,
   shares:(await h.db.prepare('SELECT * FROM p_shares').all()).results,
   approvals:(await h.db.prepare('SELECT * FROM p_approvals').all()).results,
   expiry:(await h.db.prepare('SELECT * FROM p_expiry').all()).results}
 }
 const before=await lifecycle()
 await h.send('/api/platter/command',{name:'proposal.test-mail',input},'',{}).then(r=>assert.equal(r.status,401))
 await h.cmd('proposal.test-mail',input,h.owner,403,{origin:'https://foreign.example'})
 const key=await h.cmd('agent.create',{label:'No test-mail authority'})
 assert.equal((await h.send('/api/platter/agent/command',{name:'proposal.test-mail',input},'',{authorization:'Bearer '+key.token})).status,403)
 for(const recipient of ['recipient','to','email','cc','bcc'])await h.cmd('proposal.test-mail',{...input,[recipient]:'someone@else.example'},h.owner,400)
 await h.cmd('proposal.test-mail',{...input,subject:'Bad\nHeader'},h.owner,400)
 await h.cmd('proposal.test-mail',{...input,message:'Hi {client.first_name}'},h.owner,400)
 await h.cmd('proposal.test-mail',{...input,version:0},h.owner,409)
 assert.equal((await h.state()).outbox.length,0)
 const result=await h.cmd('proposal.test-mail',input)
 assert.equal(result.recipient,h.auth.OWNER_EMAIL)
 const mail=(await h.state()).outbox
 assert.equal(mail.length,1);assert.equal(mail[0].recipient,h.auth.OWNER_EMAIL)
 assert.equal(mail[0].subject,'[Test] Proposal for Northstar')
 const preview=h.origin+'/app/preview?'+new URLSearchParams({id:p.id,revision:'1'})
 assert.equal(mail[0].body,input.message+'\n\nPreview this revision (sign-in required):\n'+preview)
 assert.ok(!mail[0].body.includes('/p/'))
 assert.deepEqual(await lifecycle(),before)
 assert.equal((await h.send(preview.slice(h.origin.length))).status,401)
 const view=await h.send(preview.slice(h.origin.length),undefined,h.owner)
 assert.equal(view.status,200);assert.match(view.text,/Preview · Revision 1/)
 const context=await h.send('/app/preview/client?id='+p.id+'&revision=1',undefined,h.owner)
 assert.equal(context.status,200);assert.match(context.text,/Preview only/)
 assert.equal((await h.send('/app/preview/client?id='+p.id+'&revision=1',{name:'accept'},h.owner)).status,403)
 let state=await h.state();assert.equal(state.proposals.find(row=>row.id===p.id).testMail.length,1)
 assert.equal((await h.db.prepare("SELECT COUNT(*) AS n FROM p_audit WHERE action='proposal.view' AND subject=?").bind(p.id).first()).n,0)
 // The tenth slot is shared atomically; concurrent eleventh requests cannot queue mail.
 for(let n=1;n<9;n++)await h.cmd('proposal.test-mail',input)
 const raced=await Promise.all([h.send('/api/platter/command',{name:'proposal.test-mail',input},h.owner),h.send('/api/platter/command',{name:'proposal.test-mail',input},h.owner)])
 assert.deepEqual(raced.map(r=>r.status).sort(),[200,429])
 await h.cmd('proposal.test-mail',input,h.owner,429)
 assert.equal((await h.state()).outbox.length,10)
 // Another member has an independent quota and receives only their own rehearsal.
 await h.send('/auth/invite',{email:'editor@studio.example',displayName:'Editor',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('editor@studio.example')
 await h.cmd('proposal.share',{id:p.id,operatorId:(await h.state(member)).actor.id})
 await h.cmd('proposal.test-mail',input,member)
 const memberState=await h.state(member)
 assert.equal(memberState.proposals.find(row=>row.id===p.id).testMail.length,1)
 const memberMail=(await h.state()).outbox.find(m=>m.recipient==='editor@studio.example')
 assert.equal(memberMail.subject,'[Test] Proposal for Northstar')
 // The quota uses installation calendar days, even across DST, rather than a rolling 24h window.
 await h.db.prepare("INSERT INTO p_installation_settings(singleton,time_zone) VALUES(1,'America/New_York') ON CONFLICT(singleton) DO UPDATE SET time_zone=excluded.time_zone").run()
 const future=Date.parse('2030-03-10T05:00:00Z')
 await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(future).run()
 for(let n=0;n<10;n++)await h.cmd('proposal.test-mail',input)
 await h.cmd('proposal.test-mail',input,h.owner,429)
 await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(Date.parse('2030-03-11T03:59:59Z')).run()
 await h.cmd('proposal.test-mail',input,h.owner,429)
 await h.db.prepare('UPDATE p_expiry_clock SET observed_at=? WHERE singleton=1').bind(Date.parse('2030-03-11T04:00:00Z')).run()
 await h.cmd('proposal.test-mail',input)
 // Test mail does not approve or freeze: ordinary approval/send remains mandatory.
 await h.cmd('proposal.send',{id:p.id,version:1},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 await h.cmd('proposal.test-mail',{...input,version:2})
 const shared=await h.cmd('proposal.send',{id:p.id,version:2}),oldPath=new URL(shared.shareUrl).pathname
 await h.cmd('proposal.test-mail',{...input,version:3},h.owner,409)
 const negotiated=await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:3,scope:'Expanded photography scope'})
 await h.cmd('proposal.test-mail',{...input,version:negotiated.version})
 const pendingMail=(await h.state()).outbox.find(m=>m.subject===input.subject.replace(/^/,'[Test] ')&&m.body.includes('revision=2'))
 assert.ok(pendingMail,'test opens the pending revision, never the still-live client offer')
 assert.equal((await h.send(oldPath)).status,200)
 const proposal=(await h.state()).proposals.find(row=>row.id===p.id)
 assert.equal(proposal.revision,2);assert.equal(proposal.status,'draft');assert.equal(proposal.sentRevision,1)
 const audit=(await h.send('/api/platter/audit?action=proposal.test-mail',undefined,h.owner)).value.rows
 assert.ok(audit.every(row=>row.subject===p.id&&['owner','sales'].includes(row.actor_role)&&row.occurred_at>0))
 assert.ok(!JSON.stringify(audit).includes(input.message))
}))


test('FOLLOW-005 / SEND-010 / FOLLOW-002 verified decline and owner loss close offers, retain reasons and reopen only through fresh approval',()=>run(async h=>{
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {p,path,client}=await sent(h),cookie=await verified(h,path)
 const current=async id=>(await h.state()).proposals.find(x=>x.id===id)
 await h.send(path+'/action?name=question.create',{revision:1,section:'scope',text:'Could this wait until next quarter?'},cookie)
 await h.cmd('followup.schedule',{id:p.id,action:'Call about budget',dueDate:'2027-03-10'})
 const before=await current(p.id),beforeMail=(await h.state()).outbox.map(m=>m.id)
 const unchanged=async()=>{assert.deepEqual(await current(p.id),before);assert.deepEqual((await h.state()).outbox.map(m=>m.id),beforeMail)}
 for(const [input,session,status,headers] of [
  [{revision:1,reason:'Budget'},'',401,{}],
  [{revision:2,reason:'Budget'},cookie,409,{}],
  [{revision:1,reason:''},cookie,400,{}],
  [{revision:1,reason:'x'.repeat(1001)},cookie,400,{}],
  [{revision:1,reason:'Budget'},cookie,403,{origin:'https://elsewhere.example'}],
 ]){assert.equal((await h.send(path+'/action?name=decline',input,session,headers)).status,status);await unchanged()}
 const declined=await h.send(path+'/action?name=decline',{revision:1,reason:'Budget'},cookie)
 assert.equal(declined.status,410,declined.text);assert.match(declined.text,/Proposal withdrawn/)
 const after=await current(p.id)
 assert.equal(after.pipelineStatus,'declined');assert.equal(after.status,'withdrawn');assert.equal(after.outcomes[0].reason,'Budget');assert.equal(after.outcomes[0].actor_role,'client');assert.equal(after.outcomes[0].actor_email,'avery@northstar.example');assert.ok(after.outcomes[0].occurred_at>0)
 assert.deepEqual(after.options,before.options);assert.equal(after.revision,before.revision);assert.equal(after.approved_at,before.approved_at);assert.equal(after.acceptance,undefined);assert.equal(after.invoice,undefined)
 assert.ok(!(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===p.id))
 assert.ok(!(await h.send('/api/platter/questions',undefined,h.owner)).value.questions.some(q=>q.proposal_id===p.id))
 await h.cmd('followup.schedule',{id:p.id,action:'Call again',dueDate:'2027-03-11'},h.owner,409)
 for(const suffix of ['', '/action?name=accept','/action?name=decline','/action?name=code.request','/action?name=question.create','/action?name=expiry.reopen','/download.pdf?optionId=one','/attachments/any-file']){
  const response=await h.send(path+suffix,suffix.includes('/action')?{name:'Avery',optionId:'one',consent:true,reason:'Changed reason',revision:1}:undefined,cookie)
  assert.equal(response.status,410,response.text);assert.ok(!response.text.includes(offer.scope));assert.ok(!response.text.includes('Budget'))
 }
 assert.deepEqual((await current(p.id)).outcomes,after.outcomes,'replay does not replace the reason or add another outcome')
 const audit=(await h.send('/api/platter/audit?action=proposal.decline',undefined,h.owner)).value.rows
 assert.equal(audit.length,1);assert.equal(audit[0].actor_role,'client');assert.equal(audit[0].actor_id,client.id);assert.equal(audit[0].subject,p.id);assert.equal(audit[0].reason,'Budget');assert.equal(audit[0].occurred_at,after.outcomes[0].occurred_at)
 await h.cmd('proposal.send',{id:p.id,version:after.version},h.owner,409)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:p.id,version:after.version,scope:'A smaller project within the new budget'})
 let pending=await current(p.id)
 assert.equal((await h.send('/app/preview/client/action?name=decline&id='+p.id+'&revision='+pending.revision,{reason:'Preview attempt'},h.owner)).status,403)
 await h.cmd('proposal.send',{id:p.id,version:pending.version},h.owner,409)
 await h.cmd('proposal.approve',{id:p.id,version:pending.version,revision:pending.revision});pending=await current(p.id)
 const newShare=await h.cmd('proposal.send',{id:p.id,version:pending.version}),newPath=new URL(newShare.shareUrl).pathname
 assert.notEqual(newPath,path);assert.equal((await h.send(path,undefined,cookie)).status,410)
 assert.equal((await h.send(newPath+'/action?name=decline',{revision:2,reason:'Budget'},cookie)).status,401,'new revision requires fresh mailbox verification')
 const newCookie=await verified(h,newPath)
 assert.equal((await h.send(newPath+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},newCookie)).status,200)
 assert.equal((await h.send(newPath+'/action?name=decline',{revision:2,reason:'Too late'},newCookie)).status,409)
 assert.equal((await current(p.id)).pipelineStatus,'accepted');assert.deepEqual((await current(p.id)).outcomes,after.outcomes)

 const otherDraft=await h.cmd('proposal.prepare',{...offer,clientId:client.id,title:'Cancelled campaign'});await h.cmd('proposal.approve',{id:otherDraft.id,version:1,revision:1});const otherShare=await h.cmd('proposal.send',{id:otherDraft.id,version:2});const other={p:otherDraft,path:new URL(otherShare.shareUrl).pathname},otherCookie=await verified(h,other.path)
 await h.send('/auth/invite',{email:'outcomes-member@studio.example',displayName:'Sales colleague',role:'member',returnTo:'/app'},h.owner)
 const member=await h.signIn('outcomes-member@studio.example')
 await h.cmd('proposal.lose',{id:other.p.id,version:3,reason:'Cancelled'},member,403)
 await h.cmd('proposal.lose',{id:other.p.id,version:2,reason:'Cancelled'},h.owner,409)
 await h.cmd('proposal.lose',{id:other.p.id,version:3,reason:''},h.owner,400)
 const clock=Date.now()+3600000;await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?)').bind(clock).run()
 const mailBefore=(await h.state()).outbox.map(m=>m.id)
 await h.cmd('proposal.lose',{id:other.p.id,version:3,reason:'Project cancelled'})
 const lost=await current(other.p.id)
 assert.equal(lost.pipelineStatus,'lost');assert.equal(lost.outcomes[0].kind,'lost');assert.equal(lost.outcomes[0].actor_role,'owner');assert.equal(lost.outcomes[0].reason,'Project cancelled');assert.equal(lost.withdrawals[0].notice,0)
 assert.deepEqual((await h.state()).outbox.map(m=>m.id),mailBefore,'marking lost sends no recipient notice by default')
 assert.ok(!(await h.send('/api/platter/followups',undefined,h.owner)).value.rows.some(r=>r.id===lost.id))
 for(const suffix of ['', '/action?name=accept','/action?name=code.request','/download.pdf?optionId=one','/attachments/any-file'])assert.equal((await h.send(other.path+suffix,suffix.includes('/action')?{name:'Avery',optionId:'one',consent:true}:undefined,otherCookie)).status,410)
 const lostAudit=(await h.send('/api/platter/audit?action=proposal.lose',undefined,h.owner)).value.rows
 assert.equal(lostAudit.length,1);assert.equal(lostAudit[0].actor_id,(await h.state()).actor.id);assert.equal(lostAudit[0].occurred_at,lost.outcomes[0].occurred_at)
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:lost.id,version:lost.version})
 let retry=await current(lost.id);await h.cmd('proposal.approve',{id:retry.id,version:retry.version,revision:retry.revision});retry=await current(lost.id)
 await h.cmd('proposal.send',{id:retry.id,version:retry.version});retry=await current(lost.id)
 await h.cmd('proposal.lose',{id:retry.id,version:retry.version,reason:'Funding withdrawn'})
 const sameTimeAudit=(await h.send('/api/platter/audit?action=proposal.lose&subject='+lost.id,undefined,h.owner)).value.rows
 assert.equal(sameTimeAudit.length,2);assert.ok(sameTimeAudit.every(row=>row.occurred_at===clock));assert.deepEqual(sameTimeAudit.map(row=>row.reason).sort(),['Funding withdrawn','Project cancelled'],'separate outcomes at the same server time retain their own audit reason')
 const accepted=await current(p.id);await h.cmd('proposal.lose',{id:p.id,version:accepted.version,reason:'Too late'},h.owner,409)
}))

test('TEAM-001 / APPROVE-003 / APPROVE-001 role scopes, collaborator rights, policy, sequential amount and parallel legal approvals through HTTP',()=>run(async h=>{
 assert.equal((await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})).status,303)
 const people={owner:{cookie:h.owner,...(await h.state()).actor}},red=await h.cmd('team.create',{name:'Sales East'}),blue=await h.cmd('team.create',{name:'Sales West'})
 for(const role of ['admin','manager','sales','content_editor','viewer','billing','other','billing2']){
  const email=role+'@synthetic-platter.example';assert.equal((await h.send('/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'},h.owner)).status,202)
  const cookie=await h.signIn(email),actor=(await h.state(cookie)).actor
  assert.equal(actor.role,'sales','new native members default to scoped sales')
  await h.cmd('member.set',{operatorId:actor.id,version:0,role:role==='other'?'sales':role==='billing2'?'billing':role,teams:[role==='other'?blue.id:red.id]})
  people[role]={cookie,...(await h.state(cookie)).actor}
 }
 await h.cmd('team.member',{operatorId:people.owner.id,teamId:red.id})
 const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'})
 const prepare=(person='sales',extra={})=>h.cmd('proposal.prepare',{...offer,clientId:client.id,...extra},people[person].cookie)
 const current=async id=>(await h.state()).proposals.find(p=>p.id===id)
 const unchanged=async fn=>{const tables=['p_proposals','p_revisions','p_approvals','p_approval_decisions','p_mail','p_audit','p_collaborators'];const read=()=>Promise.all(tables.map(t=>h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all().then(r=>r.results)));const before=await read();await fn();assert.deepEqual(await read(),before,'refusal writes neither business state nor audit/mail')}
 const outside=await prepare('other',{title:'Private west proposal'}),inside=await prepare('sales',{title:'East proposal'})
 assert.equal((await h.send('/app/proposal?id='+outside.id,undefined,people.manager.cookie)).status,403)
 assert.equal((await h.send('/app/proposal?id='+inside.id,undefined,people.manager.cookie)).status,200)
 for(const [role,expected] of [['owner',true],['admin',true],['manager',false],['sales',false],['content_editor',false],['viewer',false],['billing',true]]){
  const s=await h.state(people[role].cookie);assert.equal(s.proposals.some(p=>p.id===outside.id),expected,role+' view scope');assert.equal(s.revisions.some(r=>r.proposal_id===outside.id),expected,role+' revision scope')
  if(!expected)await unchanged(()=>h.cmd('proposal.revise',{...offer,clientId:client.id,id:outside.id,version:1},people[role].cookie,403))
 }
 assert.equal((await h.send('/api/platter/pipeline?q=Private',undefined,people.sales.cookie)).value.count,0)
 await h.cmd('proposal.share',{id:outside.id,operatorId:people.sales.id},people.other.cookie)
 assert.equal((await h.state(people.sales.cookie)).proposals.some(p=>p.id===outside.id),true)
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:outside.id,version:1},people.sales.cookie)
 await h.cmd('proposal.approve',{id:outside.id,version:2,revision:2})
 await h.cmd('proposal.send',{id:outside.id,version:3},people.sales.cookie)
 await h.cmd('proposal.share',{id:outside.id,operatorId:people.sales.id,shared:false},people.other.cookie)
 assert.equal((await h.state(people.sales.cookie)).proposals.some(p=>p.id===outside.id),false)
 // Existing send/edit/template/report/audit/policy/key doors exercise every current role.
 for(const role of ['owner','admin','manager','sales','content_editor','viewer','billing']){
  const person=people[role],made=await prepare('sales',{title:'Matrix '+role});await h.cmd('proposal.share',{id:made.id,operatorId:person.id})
  const canEdit=['owner','admin','manager','sales','content_editor'].includes(role)
  if(canEdit){await h.cmd('proposal.revise',{...offer,clientId:client.id,id:made.id,version:1},person.cookie);await h.cmd('template.save',{id:made.id,version:2,name:'Personal '+role},person.cookie)}
  else await unchanged(()=>h.cmd('proposal.revise',{...offer,clientId:client.id,id:made.id,version:1},person.cookie,403))
  let row=await current(made.id)
  if(role!=='owner')await unchanged(()=>h.cmd('proposal.approve',{id:row.id,version:row.version,revision:row.revision},person.cookie,403))
  await h.cmd('proposal.approve',{id:row.id,version:row.version,revision:row.revision});row=await current(made.id)
  if(['owner','admin','manager','sales'].includes(role))await h.cmd('proposal.send',{id:row.id,version:row.version},person.cookie)
  else await unchanged(()=>h.cmd('proposal.send',{id:row.id,version:row.version},person.cookie,403))
  assert.equal((await h.send('/api/platter/audit',undefined,person.cookie)).status,['owner','admin'].includes(role)?200:403)
  assert.equal((await h.send('/api/platter/pipeline',undefined,person.cookie)).status,['owner','admin','manager','sales','viewer'].includes(role)?200:403)
  if(role!=='owner')await h.cmd('agent.create',{label:'synthetic-platter-denied'},person.cookie,403)
 }
 const policy=async(required,defaultRole='owner')=>h.cmd('approval.policy',{version:(await h.state()).approvalSettings.policy.version,required,defaultRole})
 const rule=async condition=>h.cmd('approval.rule',{version:(await h.state()).approvalSettings.policy.version,name:'Manager above $25,000',position:0,condition,approvers:['role:manager']})
 await policy(false);await rule({kind:'totalOver',cents:2500000,currency:'USD'})
 const small=await prepare('sales',{priceOne:'2000',priceTwo:'3000'});assert.equal((await h.send('/api/platter/pipeline?nextAction=send',undefined,people.sales.cookie)).value.rows.some(r=>r.id===small.id),true);await h.cmd('proposal.send',{id:small.id,version:1},people.sales.cookie)
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_approvals WHERE proposal_id=?').bind(small.id).first()).n,0)
 const large=await prepare('sales',{priceOne:'28000',priceTwo:'30000'});await h.cmd('proposal.send',{id:large.id,version:1},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:large.id,version:1,revision:1},people.sales.cookie,403)
 await h.cmd('proposal.approve',{id:large.id,version:1,revision:1},people.manager.cookie)
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:large.id,version:2,priceOne:'29000',priceTwo:'31000'},people.sales.cookie)
 await h.cmd('proposal.send',{id:large.id,version:3},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:large.id,version:3,revision:2},people.manager.cookie);await h.cmd('proposal.send',{id:large.id,version:4},people.sales.cookie)
 const foreign=await prepare('other',{priceOne:'28000',priceTwo:'30000'});await unchanged(()=>h.cmd('proposal.approve',{id:foreign.id,version:1,revision:1},people.manager.cookie,403))
 const key=await h.cmd('agent.create',{label:'synthetic-platter-agent'})
 const agent=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:client.id,priceOne:'2000',priceTwo:'3000'}},'',{authorization:'Bearer '+key.token});assert.equal(agent.status,200)
 await h.cmd('proposal.send',{id:agent.value.id,version:1},h.owner,409);await h.cmd('proposal.approve',{id:agent.value.id,version:1,revision:1},people.manager.cookie)
 const agentRow=await current(agent.value.id);await h.cmd('proposal.send',{id:agentRow.id,version:agentRow.version})
 await h.cmd('approval.policy',{version:(await h.state()).approvalSettings.policy.version,required:true,defaultRole:'owner'},people.sales.cookie,403)
 await policy(true)
 const required=await prepare('sales',{priceOne:'2000',priceTwo:'3000'});await h.cmd('proposal.send',{id:required.id,version:1},people.sales.cookie,409);await h.cmd('proposal.approve',{id:required.id,version:1,revision:1});await h.cmd('proposal.send',{id:required.id,version:2},people.sales.cookie)
 for(const defaultRole of ['manager','admin']){
  await policy(true,defaultRole);const p=await prepare('sales',{priceOne:'2000',priceTwo:'3000'})
  if(defaultRole==='admin')await h.cmd('proposal.approve',{id:p.id,version:1,revision:1},people.manager.cookie,403)
  await h.cmd('proposal.approve',{id:p.id,version:1,revision:1},people[defaultRole].cookie);await h.cmd('proposal.send',{id:p.id,version:2},people.sales.cookie)
 }
 await policy(false)
 const approvalVersion=async()=> (await h.state()).approvalSettings.policy.version
 await h.cmd('approval.rule',{version:await approvalVersion(),name:'Legal review',position:1,condition:{kind:'termsEdited'},approvers:['person:'+people.admin.id,'person:'+people.billing.id]})
 await h.cmd('approval.rule',{version:await approvalVersion(),name:'Invalid sales approver',position:3,condition:{kind:'termsEdited'},approvers:['person:'+people.sales.id]},h.owner,400)
 for(const order of [['admin','billing'],['billing','admin']]){
  const p=await prepare('sales',{terms:'Original terms',priceOne:'28000',priceTwo:'30000'})
  await h.cmd('proposal.revise',{...offer,clientId:client.id,id:p.id,version:1,terms:'Edited legal terms',priceOne:'28000',priceTwo:'30000'},people.sales.cookie)
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:2},people.admin.cookie,403)
  await h.cmd('proposal.approve',{id:p.id,version:2,revision:2},people.manager.cookie)
  await unchanged(()=>h.cmd('proposal.approve',{id:p.id,version:3,revision:2},people.billing2.cookie,403))
  await h.cmd('proposal.approve',{id:p.id,version:3,revision:2},people[order[0]].cookie)
  assert.equal((await current(p.id)).approval.complete,false)
  await h.cmd('proposal.send',{id:p.id,version:4},people.sales.cookie,409)
  await h.cmd('proposal.approve',{id:p.id,version:4,revision:2},people[order[1]].cookie)
  assert.equal((await current(p.id)).approval.complete,true);await h.cmd('proposal.send',{id:p.id,version:5},people.sales.cookie)
 }
 const raced=await prepare('sales',{terms:'Original'})
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:raced.id,version:1,terms:'New legal terms'},people.sales.cookie)
 const concurrent=await Promise.all(['admin','billing'].map(role=>h.send('/api/platter/command',{name:'proposal.approve',input:{id:raced.id,version:2,revision:2}},people[role].cookie)))
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409])
 assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_approval_decisions WHERE proposal_id=?').bind(raced.id).first()).n,1,'the refused concurrent decision writes nothing')
 const loser=concurrent[0].status===409?'admin':'billing'
 await h.cmd('proposal.approve',{id:raced.id,version:3,revision:2},people[loser].cookie)
 assert.equal((await current(raced.id)).approval.complete,true)
 const reject=await prepare('sales',{terms:'Original'});await h.cmd('proposal.revise',{...offer,clientId:client.id,id:reject.id,version:1,terms:'Legal change'},people.sales.cookie)
 await h.cmd('proposal.reject',{id:reject.id,version:2,revision:2,note:'Review needed'},people.billing.cookie)
 await h.cmd('proposal.approve',{id:reject.id,version:3,revision:2},people.admin.cookie,403)
 await h.cmd('proposal.send',{id:reject.id,version:3},people.sales.cookie,409)
 await h.cmd('member.zone',{timeZone:'America/Los_Angeles'},people.sales.cookie)
 assert.equal((await h.state(people.sales.cookie)).followups.timeZone,'America/Los_Angeles')
 // Duplication inherits the live approval policy and never copies approval authority.
 const unruled=await prepare('sales',{priceOne:'2000',priceTwo:'3000'})
 const immediate=await h.cmd('proposal.duplicate',{id:unruled.id,version:1},people.sales.cookie)
 await h.cmd('proposal.send',{id:immediate.id,version:1},people.sales.cookie)
 await policy(true,'manager')
 const renewed=await h.cmd('proposal.duplicate',{id:unruled.id,version:1},people.sales.cookie)
 await h.cmd('proposal.send',{id:renewed.id,version:1},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:renewed.id,version:1,revision:1},people.manager.cookie)
 await h.cmd('proposal.send',{id:renewed.id,version:2},people.sales.cookie)
 // Sales negotiation and manager approval keep the earlier live offer frozen.
 const sentCopy=await current(renewed.id),oldLink='/p/'+sentCopy.shareToken
 await h.cmd('proposal.negotiate',{...offer,clientId:client.id,id:renewed.id,version:sentCopy.version,priceOne:'2000',priceTwo:'3000',scope:'Revised by its sales owner'},people.sales.cookie)
 let negotiated=await current(renewed.id)
 assert.equal((await h.send(oldLink)).status,200)
 await h.cmd('proposal.send',{id:renewed.id,version:negotiated.version},people.sales.cookie,409)
 await h.cmd('proposal.approve',{id:renewed.id,version:negotiated.version,revision:negotiated.revision},people.manager.cookie)
 negotiated=await current(renewed.id);await h.cmd('proposal.send',{id:renewed.id,version:negotiated.version},people.sales.cookie)
 assert.equal((await h.send(oldLink)).status,404)
 await policy(false)
 // Agent provenance survives a human revision, and optional maxima cannot evade amount review.
 const agentDraft=await h.send('/api/platter/agent/command',{name:'proposal.prepare',input:{...offer,clientId:client.id}},'',{authorization:'Bearer '+key.token})
 await h.cmd('proposal.revise',{...offer,clientId:client.id,id:agentDraft.value.id,version:1})
 await h.cmd('proposal.send',{id:agentDraft.value.id,version:2},h.owner,409)
 const optional=await prepare('sales',{packages:[{id:'one',label:'Base',price:'2000',optionalItems:[{id:'extra',label:'Optional delivery',unitPrice:'1000',min:1,max:30,quantity:1,editable:true}]}]})
 await h.cmd('proposal.send',{id:optional.id,version:1},people.sales.cookie,409)
 const audit=(await h.send('/api/platter/audit?action=approval.policy',undefined,h.owner)).value.rows;assert.ok(audit.length>=5);assert.ok(audit.every(r=>r.actor_id===people.owner.id&&r.occurred_at>0))
}))

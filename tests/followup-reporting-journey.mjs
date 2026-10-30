import assert from 'node:assert/strict'

const address=n=>'synthetic-platter-'+n+String.fromCharCode(64)+'example.test'
export const reportingOffer={title:'Northstar brand photography',scope:'One studio shoot, edited photographs, and usage licence.',optionOne:'Studio essentials',priceOne:'2400.00',optionTwo:'Full campaign',priceTwo:'4200.00',depositPercent:'25'}

// Both journeys use the original populated pipeline fixture through public commands.
export async function thirtyProposalFixture(h,{offer=reportingOffer,verified,legacyCurrencies=false,legacyUnrecorded=false}) {
 await h.cmd('tracking.settings',{enabled:'yes',alerts:'no',retentionDays:90,quietMinutes:30,consent:'yes'})
 const clients=[]
 for(const [name,email] of [['Northstar Coffee',address(991)],['Juniper Design',address(992)]])clients.push(await h.cmd('client.save',{name,email}))
 const people=[{email:h.auth.OWNER_EMAIL,cookie:h.owner,id:(await h.state()).actor.id}]
 for(const email of [address(993),address(994)]){
  await h.send('/auth/invite',{email,displayName:email.split('@')[0],role:'member',returnTo:'/app'},h.owner)
  const cookie=await h.signIn(email);people.push({email,cookie,id:(await h.state(cookie)).actor.id})
 }
 const fixture=[]
 for(let i=0;i<30;i++){
  const person=people[i%3],client=clients[i%2],input={...offer,clientId:client.id,title:`Campaign ${String(i+1).padStart(2,'0')}`,priceOne:String(1000+i*10),priceTwo:String(2000+i*20)}
  const made=await h.cmd('proposal.prepare',input,person.cookie),status=i===22?'viewed':i===2?'expired':i===6?'withdrawn':i===10?'declined':i===14?'lost':i===18?'won':['draft','approved','sent','accepted'][i%4]
  // Historical currency fixture only; new offers still use the public USD-only door.
  const currency=legacyCurrencies&&i%5===0?'AUD':'USD'
  if(currency==='AUD')await h.db.prepare("UPDATE p_proposals SET currency='AUD' WHERE id=?").bind(made.id).run()
  const unrecorded=legacyUnrecorded&&i===0
  if(unrecorded)await h.db.prepare('UPDATE p_proposals SET sales_owner_id=NULL,sales_owner_name=NULL WHERE id=?').bind(made.id).run()
  let version=1
  if(status!=='draft'){await h.cmd('proposal.approve',{id:made.id,version:version++,revision:1})}
  if(['sent','viewed','accepted','expired','withdrawn','declined','lost','won'].includes(status)){
   const shared=await h.cmd('proposal.send',{id:made.id,version:version++})
   if(status==='viewed')assert.equal((await h.send(new URL(shared.shareUrl).pathname)).status,200)
   if(status==='won')await h.cmd('proposal.win',{id:made.id,version:version++,reason:'Signed outside'})
   if(status==='lost')await h.cmd('proposal.lose',{id:made.id,version:version++,reason:'Project cancelled'})
   if(status==='declined'){const path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path);assert.equal((await h.send(path+'/action?name=decline',{revision:1,reason:'Budget'},cookie)).status,410)}
   if(status==='withdrawn')await h.cmd('proposal.withdraw',{id:made.id,version:version++,reason:'Client project cancelled',notice:false})
   if(status==='expired')await h.cmd('expiry.set',{id:made.id,version:version++,mode:'date',date:'2020-03-01'})
   if(status==='accepted'){
    const path=new URL(shared.shareUrl).pathname,cookie=await verified(h,path)
    assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'one',consent:true},cookie)).status,200)
   }
  }
  fixture.push({currency,index:i,id:made.id,title:input.title,status:status==='draft'?'awaiting-approval':status,owner:unrecorded?null:person.id,client:client.id,valueCents:(status==='accepted'?1000+i*10:2000+i*20)*100,nextAction:status==='draft'?'approve':status==='approved'?'send':['sent','viewed'].includes(status)?'await-client':status==='expired'?'reopen':['withdrawn','declined','lost','won'].includes(status)?'withdrawn':'export-deposit'})
 }
 return {clients,people,fixture}
}

const totals=rows=>['AUD','USD'].map(currency=>({currency,count:rows.filter(r=>r.currency===currency).length,valueCents:rows.filter(r=>r.currency===currency).reduce((n,r)=>n+r.valueCents,0)})).filter(t=>t.count)
const pipelineOrder=rows=>rows.toSorted((a,b)=>(a.dueDate??'9999').localeCompare(b.dueDate??'9999')||a.title.localeCompare(b.title)||a.id.localeCompare(b.id))
const queueOrder=rows=>rows.toSorted((a,b)=>a.dueDate.localeCompare(b.dueDate)||['viewed','unopened','unavailable'].indexOf(a.reason)-['viewed','unopened','unavailable'].indexOf(b.reason)||b.valueCents-a.valueCents||a.id.localeCompare(b.id))

export async function followupReportingJourney(h,{inspect=async()=>{}}={}) {
 const at=Date.parse('2027-03-10T12:00:00Z')
 await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'})
 const verified=async(h,path)=>{
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const code=(await h.db.prepare("SELECT m.body FROM p_mail m JOIN p_shares s ON s.proposal_id=m.proposal_id WHERE s.token=? AND m.subject='Your Platter verification code' ORDER BY m.rowid DESC LIMIT 1").bind(path.split('/').at(-1)).first()).body.match(/\b\d{6}\b/)[0]
  const response=await h.send(path+'/action?name=code.verify',{code});assert.equal(response.status,200,response.text);return response.cookie
 }
 const {fixture,people}=await thirtyProposalFixture(h,{verified,legacyCurrencies:true,legacyUnrecorded:true})
 const originalOwner=people[0],team=await h.cmd('team.create',{name:'Reporting team'})
 const managerEmail=address(995)
 assert.equal((await h.send('/auth/invite',{email:managerEmail,displayName:'Reporting manager',role:'member',returnTo:'/app'},h.owner)).status,202)
 const managerCookie=await h.signIn(managerEmail),manager={cookie:managerCookie,id:(await h.state(managerCookie)).actor.id}
 await h.cmd('member.set',{operatorId:manager.id,version:0,role:'manager',teams:[team.id]})
 await h.cmd('member.set',{operatorId:people[1].id,version:0,role:'sales',teams:[team.id]})
 const open=fixture.filter(p=>['awaiting-approval','approved','sent','viewed','expired'].includes(p.status))
 for(const row of open){
  row.dueDate=['2027-03-09','2027-03-10','2027-03-12'][Math.floor(row.index/3)%3]
  row.action='Call about '+row.title
  row.reason=row.status==='viewed'?'viewed':['sent','expired'].includes(row.status)?'unopened':'unavailable'
  row.period=row.dueDate==='2027-03-09'?'overdue':row.dueDate==='2027-03-10'?'today':'upcoming'
  row.nextAction='followup'
  await h.cmd('followup.schedule',{id:row.id,action:row.action,dueDate:row.dueDate})
 }
 for(const row of fixture)row.dueDate??=null
 const business=async cookie=>{
  const s=await h.state(cookie)
  return {clients:s.clients,proposals:s.proposals.map(p=>({id:p.id,clientId:p.client_id,title:p.title,scope:p.scope,terms:p.terms,options:p.options,currency:p.currency,ownerId:p.sales_owner_id,owner:p.sales_owner_name,revision:p.revision,version:p.version,status:p.status,acceptance:p.acceptance,invoice:p.invoice,withdrawals:p.withdrawals,outcomes:p.outcomes})).sort((a,b)=>a.id.localeCompare(b.id)),revisions:s.revisions,followupActions:s.followupActions}
 }
 const before=await business(h.owner)
 const reconcile=async(label,person,owners)=>{
  const visible=fixture.filter(p=>owners.includes(p.owner)),queueRows=queueOrder(open.filter(p=>owners.includes(p.owner)))
  for(const owner of [undefined,'unrecorded',...people.map(p=>p.id)]){
   const expected=visible.filter(p=>!owner||(p.owner??'unrecorded')===owner),expectedQueue=queueRows.filter(p=>!owner||(p.owner??'unrecorded')===owner)
   const query=new URLSearchParams({sort:'dueDate',...(owner?{owner}:{})})
   const read=async path=>{const r=await h.send(path,undefined,person.cookie);assert.equal(r.status,200,r.text);return r.value}
   const queue=await read('/api/platter/followups?'+query)
   assert.deepEqual(queue.rows.map(r=>({id:r.id,ownerId:r.ownerId,dueDate:r.dueDate,action:r.action,reason:r.reason,period:r.period,currency:r.currency,valueCents:r.valueCents})),expectedQueue.map(r=>({id:r.id,ownerId:r.owner,dueDate:r.dueDate,action:r.action,reason:r.reason,period:r.period,currency:r.currency,valueCents:r.valueCents})),label+' exact queue')
   for(const row of queue.rows.filter(r=>!r.ownerId))assert.equal(row.owner,'Not recorded')
   assert.equal(queue.count,expectedQueue.length);assert.deepEqual(queue.totals,totals(expectedQueue))
   for(const due of [undefined,'yes','no']){
    const rows=pipelineOrder(expected.filter(p=>!due||(due==='yes')===Boolean(p.dueDate&&p.dueDate<='2027-03-10')))
    const q=new URLSearchParams(query);if(due)q.set('dueFollowup',due)
    const report=await read('/api/platter/pipeline?'+q)
    assert.deepEqual(report.rows.map(r=>({id:r.id,ownerId:r.ownerId,dueDate:r.dueDate,nextAction:r.nextAction,currency:r.currency,valueCents:r.valueCents,dueFollowup:r.dueFollowup})),rows.map(r=>({id:r.id,ownerId:r.owner,dueDate:r.dueDate,nextAction:r.nextAction,currency:r.currency,valueCents:r.valueCents,dueFollowup:Boolean(r.dueDate&&r.dueDate<='2027-03-10')})),label+' exact pipeline '+due)
    for(const row of report.rows.filter(r=>!r.ownerId))assert.equal(row.owner,'Not recorded')
    assert.equal(report.count,rows.length);assert.deepEqual(report.totals,totals(rows))
    if(!owner)await inspect({label,person,query:q,rows,queueRows:expectedQueue,totals:totals(rows)})
   }
  }
 }
 const reconcileAll=async label=>{
  await reconcile(label+' owner',originalOwner,[null,...people.map(p=>p.id)])
  await reconcile(label+' sales',people[1],[people[1].id])
  await reconcile(label+' other sales',people[2],[people[2].id])
  await reconcile(label+' manager',manager,[people[1].id])
 }
 await reconcileAll('initial')
 await h.cmd('member.set',{operatorId:people[1].id,version:1,role:'sales',teams:[]})
 await h.cmd('member.set',{operatorId:people[2].id,version:0,role:'sales',teams:[team.id]})
 await reconcile('membership changed owner',originalOwner,[null,...people.map(p=>p.id)])
 await reconcile('membership changed sales',people[1],[people[1].id])
 await reconcile('membership changed other sales',people[2],[people[2].id])
 await reconcile('membership changed manager',manager,[people[2].id])
 const lost=open.find(p=>p.owner===people[1].id)
 const refusedBefore=await business(h.owner)
 await h.cmd('followup.schedule',{id:lost.id,action:'Must not be written',dueDate:'2027-03-11'},manager.cookie,403)
 assert.deepEqual(await business(h.owner),refusedBefore,'scope-loss refusal changes no business records')
 assert.deepEqual(refusedBefore,before,'membership changes preserve the complete business projection')

 // Only existing, confirmed people participate in the native fresh-email handoff.
 const freshOwner=await h.signIn(originalOwner.email)
 const promoted=await h.send('/auth/operator/role',{operatorId:people[2].id,role:'owner'},freshOwner)
 assert.equal(promoted.status,200,promoted.text)
 const successor=await h.signIn(people[2].email)
 assert.equal((await h.state(successor)).actor.role,'owner')
 assert.equal((await h.send('/auth/operator/role',{operatorId:originalOwner.id,role:'member'},successor)).status,200)
 assert.equal((await h.send('/api/platter/pipeline',undefined,freshOwner)).status,401,'revoked owner session cannot read the report')
 assert.equal((await h.send('/api/platter/followups',undefined,originalOwner.cookie)).status,401,'old owner queue session is revoked')
 originalOwner.cookie=await h.signIn(originalOwner.email)
 people[2].cookie=successor
 await reconcile('handoff former owner',originalOwner,[originalOwner.id])
 await reconcile('handoff successor',people[2],[null,...people.map(p=>p.id)])
 await reconcile('handoff sales',people[1],[people[1].id])
 await reconcile('handoff manager',manager,[people[2].id])
 assert.deepEqual(await business(successor),before,'handoff does not reassign proposals or change business records')
 return {fixture,people,manager}
}

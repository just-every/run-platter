import assert from 'node:assert/strict'
import { driveToken, driveSettings, completeDriveAgreement } from './drive-fixture.mjs'

// Extend the existing archive sanity journey through real commands and cron.
export async function driveCredentialJourney(h,fake){
 const connection=async()=>(await h.state()).connections.find(c=>c.provider==='google_drive')
 const history=async()=>(await h.send('/api/platter/archives',undefined,h.owner)).value
 const dispatch=()=>h.cmd('archive.dispatch',{})
 const clientId=(await h.state()).clients.find(c=>c.name==='Synthetic archive client').id
 const reconnect=async()=>{
  fake.setHook(undefined);fake.setUncertain(false)
  const c=await connection()
  await h.cmd('provider.connect',{provider:'google_drive',version:c.version,token:driveToken,consent:true})
  const current=await connection(),settings=(await history()).settings
  await h.cmd('archive.configure',{...driveSettings,version:settings.version,connectionVersion:current.version})
  return current
 }
 const privateBody='synthetic-platter-credential-diagnostic'
 const refusal=(status,error,headers={})=>Response.json({error:{message:driveToken+' '+privateBody,...error}},{status,headers})
 const assertSanitized=async()=>{
  const state=await h.state(),archives=await history(),page=await h.send('/app/settings',undefined,h.owner),audit=await h.send('/api/platter/audit',undefined,h.owner)
  for(const value of [state,archives,page.text,audit.value]){
   const text=JSON.stringify(value);assert.ok(!text.includes(driveToken));assert.ok(!text.includes(privateBody));assert.ok(!text.includes('sealed'))
  }
  const secrets=(await h.db.prepare('SELECT sealed FROM p_connection_secrets').all()).results
  assert.ok(secrets.every(row=>!row.sealed.includes(driveToken)))
 }
 const cases=[
  {name:'Revoked token',status:401,error:{status:'UNAUTHENTICATED'}},
  {name:'Expired token',status:401,error:{errors:[{reason:'authError'}]}},
  {name:'Missing Drive scope',status:403,error:{errors:[{reason:'insufficientPermissions'}]},upload:true},
  {name:'Missing OAuth scope',status:403,error:{details:[{reason:'ACCESS_TOKEN_SCOPE_INSUFFICIENT'}]}},
  {name:'Scope challenge',status:403,error:{},headers:{'www-authenticate':'Bearer error="insufficient_scope"'}}
 ]
 for(const scenario of cases){
  const current=await reconnect(),first=await completeDriveAgreement(h,scenario.name,clientId),later=await completeDriveAgreement(h,scenario.name+' queued successor',first.client.id)
  let rejectedAt
  fake.setHook(request=>{if(!scenario.upload||new URL(request.url).pathname.startsWith('/upload/')){rejectedAt=fake.calls.length;return refusal(scenario.status,scenario.error,scenario.headers)}})
  const start=fake.calls.length;await dispatch()
  const calls=fake.calls.slice(start),jobs=(await history()).jobs
  assert.equal((await connection()).status,'broken',scenario.name)
  assert.equal((await connection()).version,current.version)
  assert.equal((await history()).settings.active,false)
  assert.ok(calls.length>0);assert.equal(fake.calls.length,rejectedAt,'no request follows the credential rejection')
  assert.ok(jobs.filter(j=>[first.proposal.id,later.proposal.id].includes(j.proposal_id)).every(j=>j.status==='held'))
  if(scenario.upload){
   const files=(await h.db.prepare('SELECT * FROM p_archive_files WHERE proposal_id=?').bind(first.proposal.id).all()).results
   assert.equal(files.length,1);assert.equal(files[0].kind,'agreement');assert.equal(files[0].status,'uncertain','a rejected write retains its reserved id for review')
  }
  const stopped=fake.calls.length;await dispatch();await h.cmd('archive.reconcile',{id:first.proposal.id},h.owner,409)
  await h.cmd('archive.configure',{...driveSettings,version:(await history()).settings.version,connectionVersion:current.version},h.owner,409)
  assert.equal(fake.calls.length,stopped,'a broken credential cannot perform reconciliation or configuration requests')
  await assertSanitized()
  await reconnect()
  const afterReconnect=fake.calls.length;await dispatch();await h.cmd('archive.reconcile',{id:first.proposal.id},h.owner,409)
  assert.equal(fake.calls.length,afterReconnect,'reconnection and a fresh grant never revive old jobs')
  const fresh=await completeDriveAgreement(h,scenario.name+' fresh completion',first.client.id);await dispatch()
  assert.equal((await history()).jobs.find(j=>j.proposal_id===fresh.proposal.id).status,'complete')
 }
 // Ordinary resource permission errors, quotas and lost acknowledgements do not
 // establish that the credential is invalid, and none may replay a write.
 for(const scenario of [{status:403,error:{errors:[{reason:'forbidden'}]}},{status:403,error:{errors:[{reason:'rateLimitExceeded'}]}},{status:429,error:{}},{status:503,error:{}}]){
  await reconnect();const agreement=await completeDriveAgreement(h,'Temporary or resource refusal '+scenario.status,clientId)
  fake.setHook(()=>refusal(scenario.status,scenario.error))
  const before=fake.calls.length;await dispatch();assert.equal(fake.calls.length,before+1)
  assert.equal((await connection()).status,'connected')
  const job=(await history()).jobs.find(j=>j.proposal_id===agreement.proposal.id);assert.equal(job.status,'held')
  if(scenario.status===429)assert.match(job.reason,/rate limit/)
  else assert.doesNotMatch(job.reason,/credential or its access scope/)
  await dispatch();assert.equal(fake.calls.length,before+1);await assertSanitized()
 }
 // A real transport deadline leaves the connection usable, with an explicit
 // uncertain outcome and no second request or automatic replay.
 await reconnect();const timed=await completeDriveAgreement(h,'Timed out archive request',clientId)
 fake.setHook(async()=>{await new Promise(resolve=>setTimeout(resolve,31000));return refusal(503,{})})
 const beforeTimeout=fake.calls.length;await dispatch()
 assert.equal(fake.calls.length,beforeTimeout+1);assert.equal((await connection()).status,'connected')
 assert.match((await history()).jobs.find(j=>j.proposal_id===timed.proposal.id).reason,/timed out; its outcome is uncertain/)
 await dispatch();assert.equal(fake.calls.length,beforeTimeout+1);await assertSanitized()
 // The response is delayed until a new connection and future-only grant exist.
 // It still belongs to the old request's credential version.
 const previous=await reconnect(),stale=await completeDriveAgreement(h,'Late old credential failure',clientId)
 let replaced=false
 fake.setHook(async()=>{
  fake.setHook(undefined);replaced=true
  await h.cmd('provider.connect',{provider:'google_drive',version:previous.version,token:driveToken,consent:true})
  const settings=(await history()).settings
  await h.cmd('archive.configure',{...driveSettings,version:settings.version,connectionVersion:previous.version+1})
  return refusal(401,{})
 })
 await dispatch();assert.equal(replaced,true)
 assert.equal((await connection()).version,previous.version+1);assert.equal((await connection()).status,'connected')
 assert.equal((await history()).settings.active,true)
 assert.equal((await history()).jobs.find(j=>j.proposal_id===stale.proposal.id).status,'held')
 const fresh=await completeDriveAgreement(h,'Replacement credential completion',clientId);await dispatch()
 assert.equal((await history()).jobs.find(j=>j.proposal_id===fresh.proposal.id).status,'complete')
 await assertSanitized()
}

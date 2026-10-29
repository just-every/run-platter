import assert from 'node:assert/strict'

export async function crmCredentialJourney(h,{make,bind,crm,requests,patches}){
 const connection=async()=>(await h.state()).connections.find(c=>c.provider==='hubspot')
 const reconnect=async()=>{crm.hook=undefined;const c=await connection();await h.cmd('provider.connect',{provider:'hubspot',version:c.version,token:'synthetic-platter-credential-1',consent:true})}
 const privateValue='synthetic-platter-private-provider-diagnostic'
 const failure=(status,headers={})=>Response.json({error:{message:privateValue}},{status,headers})
 const sanitized=async()=>{
  for(const value of [await h.state(),(await h.send('/api/platter/audit',undefined,h.owner)).value,(await h.send('/app/settings',undefined,h.owner)).text])assert.ok(!JSON.stringify(value).includes(privateValue))
 }
 for(const scenario of [{status:401,broken:true},{status:403,headers:{'www-authenticate':'Bearer error="insufficient_scope"'},broken:true,write:true},{status:403,broken:false},{status:429,broken:false},{status:503,broken:false}]){
  await reconnect()
  const first=await make('Credential-bound CRM outcome'),later=await make('Queued CRM successor')
  await bind(first.id,3);await bind(later.id,3)
  crm.hook=request=>{if(!scenario.write||request.method==='PATCH')return failure(scenario.status,scenario.headers)}
  const start=requests.length,beforeWrites=patches.length
  await h.cmd('proposal.lose',{id:first.id,version:3,reason:'Budget'})
  assert.equal(requests.length,start+(scenario.write?2:1),'the refusal stops this operation at its read or write boundary')
  assert.equal(patches.length,beforeWrites)
  assert.equal((await connection()).status,scenario.broken?'broken':'connected')
  assert.equal((await h.state()).crmOutcomes.attempts.find(r=>r.proposal_id===first.id).status,'uncertain')
  const stopped=requests.length;await h.cmd('outcome.crm.sync',{id:first.id});assert.equal(requests.length,stopped,'held writes never replay')
  if(scenario.broken){
   await h.cmd('proposal.lose',{id:later.id,version:3,reason:'Budget'});assert.equal(requests.length,stopped,'later jobs cannot use the rejected credential')
  }
  await sanitized();await reconnect()
  const afterReconnect=requests.length;await h.cmd('outcome.crm.sync',{id:first.id});await h.cmd('outcome.crm.sync',{id:later.id})
  assert.equal(requests.length,afterReconnect,'replacement credentials do not reactivate old grants or attempts')
 }
 await reconnect();const stale=await make('Stale CRM credential refusal');await bind(stale.id,3)
 let replaced=false
 crm.hook=async()=>{crm.hook=undefined;await reconnect();replaced=true;return failure(401)}
 const writes=patches.length;await h.cmd('proposal.lose',{id:stale.id,version:3,reason:'Budget'})
 assert.equal(replaced,true);assert.equal((await connection()).status,'connected');assert.equal(patches.length,writes)
 const fresh=await make('Freshly authorized CRM outcome');await bind(fresh.id,3)
 await h.cmd('proposal.lose',{id:fresh.id,version:3,reason:'Budget'});assert.equal(patches.length,writes+1)
 assert.equal((await h.state()).crmOutcomes.attempts.find(r=>r.proposal_id===fresh.id).status,'confirmed')
 await sanitized()
}

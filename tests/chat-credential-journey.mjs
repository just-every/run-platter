import assert from 'node:assert/strict'

export async function chatCredentialJourney(h){
 for(const r of (await h.db.prepare('SELECT id FROM p_notification_routes').all()).results)await h.cmd('notification.route.remove',{id:r.id})
 const connection=async provider=>(await h.state()).connections.find(c=>c.provider===provider)
 const reconnect=async provider=>{h.setHook(undefined);const c=await connection(provider);await h.cmd('provider.connect',{provider,version:c?.version??0,token:'synthetic-platter-chat-credential',consent:true})}
 const actor=(await h.state()).actor
 const route=provider=>h.cmd('notification.route',{provider,event:'approval',kind:'direct',destination:provider==='slack'?'synthetic-platter-7009':'synthetic-platter-7006',operatorId:actor.id,consent:true})
 const request=async title=>{const p=await h.prepare(title);await h.cmd('notification.request',{id:p.id,version:1,consent:true});return p}
 const privateValue='synthetic-platter-private-chat-diagnostic'
 for(const provider of ['slack','teams']){
  await reconnect(provider);await route(provider)
  // Slack can reject a token in a successful HTTP response; Graph uses HTTP 401.
  h.setHook(request=>{
   const url=new URL(request.url)
   if(provider==='slack'&&url.pathname==='/api/conversations.open')return Response.json({ok:false,error:'token_revoked',response_metadata:{messages:[privateValue]}})
   if(provider==='teams'&&url.pathname.endsWith('/messages'))return Response.json({error:{code:'InvalidAuthenticationToken',message:privateValue}},{status:401})
  })
  const start=h.calls.length,messages=h.chats.length,failed=await request('Rejected chat credential')
  assert.equal((await connection(provider)).status,'broken')
  assert.equal(h.chats.length,messages,'the credential refusal cannot produce a delivered chat')
  assert.equal(h.calls.slice(start).filter(c=>new URL(c.url).hostname===(provider==='slack'?'slack.com':'graph.microsoft.com')).length,1,'no provider request follows the credential failure')
  const rows=(await h.db.prepare('SELECT * FROM p_notification_outbox WHERE proposal_id=? AND route_id IS NOT NULL').bind(failed.id).all()).results
  assert.ok(rows.some(r=>r.status==='uncertain'))
  const stopped=h.calls.filter(c=>new URL(c.url).hostname===(provider==='slack'?'slack.com':'graph.microsoft.com')).length
  await request('No later chat I/O');await h.tick(Date.now())
  assert.equal(h.calls.filter(c=>new URL(c.url).hostname===(provider==='slack'?'slack.com':'graph.microsoft.com')).length,stopped)
  await reconnect(provider);const replaced=h.calls.length;await h.tick(Date.now());assert.equal(h.calls.length,replaced,'reconnection cannot replay held or withheld chat')
  await route(provider);const good=h.chats.length;await request('Freshly authorized chat');assert.equal(h.chats.length,good+1)
  // Remove this provider's grants before proving the next provider in isolation.
  const routes=(await h.db.prepare('SELECT id FROM p_notification_routes WHERE provider=?').bind(provider).all()).results
  for(const r of routes)await h.cmd('notification.route.remove',{id:r.id})
 }
 for(const value of [await h.state(),(await h.send('/api/platter/audit',undefined,h.owner)).value,(await h.send('/app/settings',undefined,h.owner)).text])assert.ok(!JSON.stringify(value).includes(privateValue))
}

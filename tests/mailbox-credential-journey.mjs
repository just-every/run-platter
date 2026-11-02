import assert from 'node:assert/strict'

export async function mailboxCredentialJourney(h,{connect,send,calls,gmail,installation,setHook,cookie}){
 const connection=async()=>(await h.state(cookie)).connections.find(c=>c.provider==='gmail')
 const tick=async()=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'*/15 * * * *'})
 const tokenRequest=request=>new URL(request.url).hostname==='oauth2.googleapis.com'
 const privateValue='synthetic-platter-private-mailbox-diagnostic'
 const failure=(status,error='temporarily_unavailable')=>Response.json({error,error_description:privateValue},{status})
 const snapshot=()=>[gmail.length,installation.length]
 const sanitized=async()=>{
  for(const value of [await h.state(cookie),(await h.send('/api/platter/audit',undefined,h.owner)).value,(await h.send('/app/team',undefined,cookie)).text])assert.ok(!JSON.stringify(value).includes(privateValue))
 }
 for(const status of [429,503]){
  await connect('gmail');setHook(request=>tokenRequest(request)?failure(status):undefined)
  const before=snapshot(),start=calls.length,held=await send()
  assert.deepEqual(snapshot(),before,'temporary refresh failures never send or switch carrier')
  assert.equal(calls.length,start+1,'no identity or send request follows a failed refresh')
  assert.equal((await connection()).status,'connected');assert.equal(held.mailAttributions[0].outcome,'uncertain');assert.equal(held.mailAttributions[0].fallback,0)
  const stopped=calls.length;await tick();assert.equal(calls.length,stopped)
  setHook(undefined);await connect('gmail');const reconnected=calls.length;await tick();assert.equal(calls.length,reconnected,'reconnection never retries old mail')
  await sanitized()
 }
 // Refresh rotation is used by the next real send and stays sealed in storage.
 await connect('gmail');let rotation=0
 setHook(async request=>{
  if(!tokenRequest(request))return
  const input=new URLSearchParams(await request.text());assert.equal(input.get('grant_type'),'refresh_token')
  assert.equal(input.get('refresh_token'),rotation?'synthetic-platter-refresh-rotated':'synthetic-platter-5105');rotation++
  return Response.json({access_token:'synthetic-platter-5106',refresh_token:'synthetic-platter-refresh-rotated',scope:'openid email https://www.googleapis.com/auth/gmail.send'})
 })
 const good=gmail.length;await send();await send();assert.equal(rotation,2);assert.equal(gmail.length,good+2)
 assert.ok(!JSON.stringify((await h.db.prepare('SELECT * FROM p_connection_secrets').all()).results).includes('synthetic-platter-refresh-rotated'))
 setHook(undefined);await connect('gmail')
 // A resource-level refusal of a write remains uncertain and cannot switch carrier.
 setHook(request=>new URL(request.url).pathname.endsWith('/messages/send')?failure(403,'resource_forbidden'):undefined)
 const forbidden=snapshot(),held=await send();assert.deepEqual(snapshot(),forbidden);assert.equal((await connection()).status,'connected');assert.equal(held.mailAttributions[0].outcome,'uncertain')
 setHook(undefined);await connect('gmail')
 // An explicit invalid refresh grant breaks only this version and stops its I/O.
 setHook(request=>tokenRequest(request)?failure(400,'invalid_grant'):undefined)
 const revoked=snapshot(),start=calls.length;await send();assert.equal(calls.length,start+2,'one refused refresh and the existing installation fallback')
 assert.equal(gmail.length,revoked[0]);assert.equal(installation.length,revoked[1]+1);assert.equal((await connection()).status,'broken')
 const noRefresh=calls.filter(c=>c.host==='oauth2.googleapis.com').length;await send();assert.equal(calls.filter(c=>c.host==='oauth2.googleapis.com').length,noRefresh,'later mail does not touch the revoked provider')
 setHook(undefined);await connect('gmail')
 // A delayed old grant must neither break nor overwrite a newly connected grant.
 for(const status of [400,200]){
  let saved
  setHook(async request=>{
   if(!tokenRequest(request))return
   setHook(undefined);await connect('gmail')
   saved=await h.db.prepare('SELECT sealed FROM p_connection_secrets WHERE connection_id=?').bind((await connection()).id).first()
   return status===400?failure(400,'invalid_grant'):Response.json({access_token:'synthetic-platter-stale-access',refresh_token:'synthetic-platter-stale-refresh',scope:'openid email https://www.googleapis.com/auth/gmail.send'})
  })
  const before=snapshot(),stale=await send();assert.deepEqual(snapshot(),before,'an obsolete refresh cannot send through either carrier')
  assert.equal(stale.mailAttributions[0].outcome,'uncertain');assert.equal((await connection()).status,'connected')
  assert.deepEqual(await h.db.prepare('SELECT sealed FROM p_connection_secrets WHERE connection_id=?').bind((await connection()).id).first(),saved)
 }
 // A newer refresh can rotate the same connection without a reconnection.
 const version=(await connection()).version,beforeRotation=snapshot();let rotated
 setHook(async request=>{
  if(!new URL(request.url).pathname.endsWith('/messages/send'))return
  setHook(undefined);await send()
  rotated=await h.db.prepare('SELECT sealed FROM p_connection_secrets WHERE connection_id=?').bind((await connection()).id).first()
  return failure(401,'invalid_token')
 })
 const old=await send();assert.equal(old.mailAttributions[0].outcome,'uncertain');assert.equal(old.mailAttributions[0].fallback,0)
 assert.deepEqual(snapshot(),[beforeRotation[0]+1,beforeRotation[1]],'only the new message completes; the stale refusal never switches carrier')
 assert.equal((await connection()).version,version);assert.equal((await connection()).status,'connected')
 assert.deepEqual(await h.db.prepare('SELECT sealed FROM p_connection_secrets WHERE connection_id=?').bind((await connection()).id).first(),rotated)
 const fresh=gmail.length;await send();assert.equal(gmail.length,fresh+1,'a fresh message uses the replacement connection')
 await sanitized();setHook(undefined)
}

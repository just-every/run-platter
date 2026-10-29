import assert from 'node:assert/strict'
import { harness } from './harness.mjs'
import { driveFixture,driveSettings,completeDriveAgreement } from './drive-fixture.mjs'

export async function driveOAuthJourney(){
 let sequence=0,token,refreshToken,mode,scope='https://www.googleapis.com/auth/drive.file',hook
 const issued=new Set(),calls=[],fake=driveFixture({token:()=>token}),privateValue='synthetic-platter-private-oauth-diagnostic'
 const h=await harness({assetsDirectory:'public',auth:{GOOGLE_DRIVE_CLIENT_ID:'synthetic-platter-drive-client',GOOGLE_DRIVE_CLIENT_SECRET:'synthetic-platter-drive-client-secret'},outboundService:async request=>{
  const url=new URL(request.url);calls.push({host:url.hostname,path:url.pathname,method:request.method})
  if(url.hostname!=='oauth2.googleapis.com')return fake.outboundService(request)
  const input=new URLSearchParams(await request.text());assert.equal(input.get('client_id'),h.auth.GOOGLE_DRIVE_CLIENT_ID);assert.equal(input.get('client_secret'),h.auth.GOOGLE_DRIVE_CLIENT_SECRET)
  if(input.get('grant_type')==='authorization_code'){assert.equal(input.get('redirect_uri'),h.origin+'/api/platter/drive/callback');assert.ok(input.get('code_verifier').length>=43)}
  else {assert.equal(input.get('grant_type'),'refresh_token');assert.ok(issued.has(input.get('refresh_token')),'refresh only a provider-issued renewable grant')}
  if(hook){const action=hook;hook=undefined;const result=await action();if(result)return result}
  if(mode)return Response.json({error:mode===400?'invalid_grant':'temporarily_unavailable',error_description:privateValue},{status:mode})
  if(input.get('grant_type')==='refresh_token')issued.delete(input.get('refresh_token'))
  token='synthetic-platter-drive-access-'+(++sequence);refreshToken='synthetic-platter-drive-refresh-'+sequence;issued.add(refreshToken)
  return Response.json({access_token:token,refresh_token:refreshToken,token_type:'Bearer',scope,expires_in:3600})
 }})
 try{
  const connection=async()=>(await h.state()).connections.find(c=>c.provider==='google_drive')
  const history=async()=>(await h.send('/api/platter/archives',undefined,h.owner)).value
  const authorize=async(cookie=h.owner)=>{
   const r=await h.send('/api/platter/drive/authorize',{consent:true},cookie);assert.equal(r.status,303,r.text)
   const url=new URL(r.headers.get('location'));assert.equal(url.searchParams.get('scope'),'https://www.googleapis.com/auth/drive.file');assert.equal(url.searchParams.get('code_challenge_method'),'S256')
   return '/api/platter/drive/callback?'+new URLSearchParams({state:url.searchParams.get('state'),code:'synthetic-platter-drive-code'})
  }
  const connect=async()=>{const callback=await authorize();const r=await h.send(callback,undefined,h.owner);assert.equal(r.status,303,r.text);return callback}
  await h.send('/auth/invite',{email:['synthetic-platter-sales','example.test'].join('@'),displayName:'Sales',role:'member'},h.owner)
  const sales=await h.signIn(['synthetic-platter-sales','example.test'].join('@'))
  const noPermission=calls.length
  assert.equal((await h.send('/api/platter/drive/authorize',{consent:true},sales)).status,403)
  assert.equal((await h.send('/api/platter/drive/authorize',{consent:false},h.owner)).status,400);assert.equal(calls.length,noPermission)
  const callback=await authorize();assert.equal((await h.send(callback,undefined,sales)).status,403);assert.equal(calls.length,noPermission)
  assert.equal((await h.send(callback,undefined,h.owner)).status,303)
  const replay=calls.length;assert.equal((await h.send(callback,undefined,h.owner)).status,403);assert.equal(calls.length,replay)
  const binding=await connection(),sealed=await h.db.prepare('SELECT sealed FROM p_connection_secrets WHERE connection_id=?').bind(binding.id).first()
  scope='https://www.googleapis.com/auth/drive';const broad=await authorize();assert.equal((await h.send(broad,undefined,h.owner)).status,409);scope='https://www.googleapis.com/auth/drive.file'
  assert.deepEqual(await connection(),binding);assert.deepEqual(await h.db.prepare('SELECT sealed FROM p_connection_secrets WHERE connection_id=?').bind(binding.id).first(),sealed,'an overbroad grant never replaces the reviewed connection')
  await h.cmd('archive.configure',driveSettings)
  const completed=await completeDriveAgreement(h,'OAuth Drive agreement');await h.cmd('archive.dispatch',{})
  assert.equal((await history()).jobs.find(j=>j.proposal_id===completed.proposal.id).status,'complete');assert.ok(sequence>3,'real archive requests refresh and rotate the renewable grant')
  for(const status of [429,503]){
   const made=await completeDriveAgreement(h,'Transient OAuth archive',completed.client.id),start=calls.length
   mode=status;await h.cmd('archive.dispatch',{});mode=undefined
   assert.equal(calls.length,start+1);assert.equal((await connection()).status,'connected');assert.equal((await history()).jobs.find(j=>j.proposal_id===made.proposal.id).status,'held')
   await h.cmd('archive.dispatch',{});assert.equal(calls.length,start+1,'temporary grant failures hold the job without replay')
  }
  const revoked=await completeDriveAgreement(h,'Revoked OAuth Drive agreement',completed.client.id),later=await completeDriveAgreement(h,'Revoked grant successor',completed.client.id)
  mode=400;const before=calls.length;await h.cmd('archive.dispatch',{});assert.equal(calls.length,before+1);assert.equal((await connection()).status,'broken')
  assert.ok((await history()).jobs.filter(j=>[revoked.proposal.id,later.proposal.id].includes(j.proposal_id)).every(j=>j.status==='held'))
  await h.cmd('archive.dispatch',{});assert.equal(calls.length,before+1)
  mode=undefined;await connect();await h.cmd('archive.configure',{...driveSettings,version:1,connectionVersion:2})
  const reconnected=calls.length;await h.cmd('archive.dispatch',{});assert.equal(calls.length,reconnected,'OAuth reconnection does not reactivate old archives')
  const stale=await completeDriveAgreement(h,'Reconnection during OAuth refresh',completed.client.id)
  hook=async()=>{await connect();return Response.json({error:'invalid_grant',error_description:privateValue},{status:400})}
  await h.cmd('archive.dispatch',{});assert.equal((await connection()).status,'connected');assert.equal((await connection()).version,3)
  assert.equal((await history()).jobs.find(j=>j.proposal_id===stale.proposal.id).status,'held')
  await h.cmd('archive.configure',{...driveSettings,version:2,connectionVersion:3})
  const fresh=await completeDriveAgreement(h,'Fresh OAuth completion',completed.client.id);await h.cmd('archive.dispatch',{})
  assert.equal((await history()).jobs.find(j=>j.proposal_id===fresh.proposal.id).status,'complete')
  const withdrawn=await completeDriveAgreement(h,'Revoke during PDF upload refresh',completed.client.id)
  const uploadsBefore=[...fake.files.values()].filter(file=>file.bytes).length
  let revokedAt
  const revokeOnUpload=async()=>{
   const file=await h.db.prepare("SELECT 1 FROM p_archive_files WHERE proposal_id=? AND status='writing'").bind(withdrawn.proposal.id).first()
   if(!file){hook=revokeOnUpload;return}
   await h.cmd('archive.revoke',{version:3});revokedAt=fake.calls.length
  }
  hook=revokeOnUpload;await h.cmd('archive.dispatch',{})
  assert.ok(revokedAt!==undefined,'revocation completes during the upload credential refresh')
  assert.equal([...fake.files.values()].filter(file=>file.bytes).length,uploadsBefore,'revocation during refresh must not transfer or store a private PDF')
  assert.equal(fake.calls.length,revokedAt,'no Drive request follows successful revocation')
  assert.equal((await history()).jobs.find(j=>j.proposal_id===withdrawn.proposal.id).status,'held')
  assert.equal((await history()).settings.active,false)
  await h.cmd('archive.dispatch',{});await h.cmd('archive.reconcile',{id:withdrawn.proposal.id},h.owner,409)
  assert.equal(fake.calls.length,revokedAt,'held work cannot retry after revocation')
  await h.cmd('archive.configure',{...driveSettings,version:3,connectionVersion:3})
  const future=await completeDriveAgreement(h,'Fresh consent after revoked upload',completed.client.id);await h.cmd('archive.dispatch',{})
  assert.equal((await history()).jobs.find(j=>j.proposal_id===future.proposal.id).status,'complete')
  const pending=await authorize();await h.cmd('provider.disconnect',{provider:'google_drive',version:3});const disconnected=calls.length
  assert.equal((await h.send(pending,undefined,h.owner)).status,403);await h.cmd('archive.dispatch',{});assert.equal(calls.length,disconnected)
  for(const value of [await h.state(),await history(),(await h.send('/api/platter/audit',undefined,h.owner)).value,(await h.send('/app/settings',undefined,h.owner)).text]){
   const serialized=JSON.stringify(value);for(const secret of [token,refreshToken,h.auth.GOOGLE_DRIVE_CLIENT_SECRET,privateValue])assert.ok(!serialized.includes(secret))
  }
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_connection_secrets WHERE connection_id=?').bind(binding.id).first()).n,0)
 }finally{await h.close()}
}

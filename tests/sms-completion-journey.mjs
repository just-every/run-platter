import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {harness} from './harness.mjs'

// The same public SMS lifecycle covers signing, deferral, STOP and uncertainty.
export async function completionSmsJourney(){
 const texts=[],mail=[]
 let uncertain=false
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9800',TWILIO_ACCOUNT_SID:'synthetic-platter-9801',TWILIO_AUTH_TOKEN:'synthetic-platter-9802',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
  if(new URL(request.url).hostname==='api.twilio.com'){
   texts.push(Object.fromEntries(new URLSearchParams(await request.text())))
   if(uncertain&&texts.at(-1).To==='+12025550145')throw Error('Synthetic uncertain completion')
   return Response.json({sid:'synthetic-platter-'+(9803+texts.length)},{status:201})
  }
  mail.push(await request.json());return Response.json({id:'synthetic-platter-'+(9850+mail.length)})
 }})
 const tick=async time=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(time),cron:'*/15 * * * *'})
 const history=async id=>(await h.send('/api/platter/sms?id='+id,undefined,h.owner)).value
 try{
  await tick('2030-03-09T19:00:00Z')
  const recipient='synthetic-platter-9801@example.invalid',client=await h.cmd('client.save',{name:'Synthetic client',email:recipient})
  const prepare=async(phone,purposes=['completion'])=>{
   const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic completed agreement',scope:'Exact signed scope',optionOne:'Studio',priceOne:'100',optionTwo:'Campaign',priceTwo:'200',depositPercent:'25'})
   await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
   const sent=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(sent.shareUrl).pathname
   await h.cmd('sms.configure',{id:p.id,version:3,consent:true,recipient,phone,firm:'Synthetic Platter firm',purposes,disclosure:'Completion texts from Synthetic Platter firm. Reply STOP to stop all texts.',assentedAt:'2030-03-09T18:00:00Z',method:'Recipient signed instruction',evidence:'synthetic-platter-9804',timeZone:'America/Los_Angeles'})
   assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
   const code=mail.at(-1).text.match(/\b\d{6}\b/)[0],verification=await h.send(path+'/action?name=code.verify',{code})
   assert.equal(verification.status,200)
   return {...p,path,url:sent.shareUrl,cookie:verification.cookie}
  }
  const accept=async p=>{const r=await h.send(p.path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},p.cookie);assert.equal(r.status,200,r.text)}
  const immediate=await prepare('+12025550140')
  await h.send(immediate.path+'/action?name=reminder.opt-out',{},immediate.cookie)
  await accept(immediate)
  assert.equal(texts.length,1,'a separately consented completion survives reminder-only opt-out')
  assert.equal(texts[0].To,'+12025550140');assert.ok(texts[0].Body.includes(immediate.url));assert.match(texts[0].Body,/agreement is complete/)
  let record=(await history(immediate.id)).messages
  assert.equal(record.length,1);assert.equal(record[0].kind,'completion');assert.equal(record[0].status,'accepted');assert.ok(!record[0].message.includes('/p/'))
  await accept(immediate);await Promise.all([tick('2030-03-09T19:01:00Z'),tick('2030-03-09T19:01:00Z')]);assert.equal(texts.length,1,'repeated acceptance and concurrent processing never repeat completion')
  const noPurpose=await prepare('+12025550141',['invitation'])
  await accept(noPurpose);await tick('2030-03-09T19:02:00Z');assert.equal(texts.length,1);assert.equal((await history(noPurpose.id)).messages.length,0,'invitation assent never implies completion assent')
  const deferred=await prepare('+12025550142'),revoked=await prepare('+12025550143'),stopped=await prepare('+12025550144'),held=await prepare('+12025550145')
  await tick('2030-03-10T06:00:00Z')
  for(const p of [deferred,revoked,stopped,held])await accept(p)
  assert.equal(texts.length,1)
  for(const p of [deferred,revoked,stopped,held])assert.equal((await history(p.id)).messages[0].due_at,Date.parse('2030-03-10T15:00:00Z'),'completion waits for 8 am using dispatch-date daylight saving')
  await h.cmd('sms.revoke',{id:revoked.id,version:4})
  const url=h.origin+'/api/platter/sms/inbound',form=new URLSearchParams({AccountSid:'synthetic-platter-9801',From:'+12025550144',To:'+15005550006',Body:'STOP'})
  const signature=createHmac('sha1','synthetic-platter-9802').update(url+[...form.keys()].sort().map(k=>k+form.get(k)).join('')).digest('base64')
  const callback=await h.mf.dispatchFetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','x-twilio-signature':signature},body:form.toString()});assert.equal(callback.status,200);await callback.text()
  await tick('2030-03-10T14:59:00Z');assert.equal(texts.length,1)
  // Make just one number uncertain so the supported completion is observed too.
  uncertain=true
  await tick('2030-03-10T15:00:00Z')
  assert.equal(texts.length,3);assert.deepEqual(texts.slice(1).map(t=>t.To).sort(),['+12025550142','+12025550145'])
  assert.equal((await history(deferred.id)).messages[0].status,'accepted')
  assert.equal((await history(held.id)).messages[0].status,'held')
  for(const p of [revoked,stopped])assert.equal((await history(p.id)).messages[0].status,'cancelled')
  uncertain=false
  await tick('2030-03-11T15:00:00Z');await tick('2030-03-12T15:00:00Z');assert.equal(texts.length,3,'uncertain completions remain held without replay')
 }finally{await h.close()}
}

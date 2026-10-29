import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {harness} from './harness.mjs'

export async function smsReenableJourney(){
 const texts=[];let emailCalls=0
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9900',TWILIO_ACCOUNT_SID:'synthetic-platter-9901',TWILIO_AUTH_TOKEN:'synthetic-platter-9902',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
  if(new URL(request.url).hostname==='api.twilio.com'){texts.push(Object.fromEntries(new URLSearchParams(await request.text())));return Response.json({sid:'synthetic-platter-'+(9903+texts.length)},{status:201})}
  emailCalls++;return Response.json({id:'synthetic-platter-9910'})
 }})
 const tick=async time=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(time),cron:'*/15 * * * *'})
 const callback=async(fields,signature=true)=>{
  const url=h.origin+'/api/platter/sms/inbound',form=new URLSearchParams({AccountSid:'synthetic-platter-9901',From:'+12025550148',To:'+15005550006',...fields})
  const signed=createHmac('sha1','synthetic-platter-9902').update(url+[...form.keys()].sort().map(k=>k+form.get(k)).join('')).digest('base64')
  const r=await h.mf.dispatchFetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',...(signature?{'x-twilio-signature':signed}:{})},body:form.toString()});await r.text();return r.status
 }
 const history=async id=>(await h.send('/api/platter/sms?id='+id,undefined,h.owner)).value
 try{
  await tick('2030-06-01T12:00:00Z')
  const recipient='synthetic-platter-9901@example.invalid',client=await h.cmd('client.save',{name:'Synthetic client',email:recipient}),proposals=[]
  const consent={recipient,phone:'+12025550148',firm:'Synthetic Platter firm',purposes:['invitation','reminder','identity','completion'],disclosure:'Selected proposal texts from Synthetic Platter firm. Reply STOP to stop all texts.',assentedAt:'2030-06-01T11:55:00Z',method:'Recipient signed instruction',evidence:'synthetic-platter-9911',timeZone:'Etc/UTC',consent:true}
  for(let i=0;i<2;i++){
   const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic re-enablement',scope:'Exact scope',optionOne:'One',priceOne:'100',optionTwo:'Two',priceTwo:'200',depositPercent:'25'})
   await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
   await h.cmd('proposal.send',{id:p.id,version:2,delivery:'unsupported'},h.owner,400)
   const sent=await h.cmd('proposal.send',{id:p.id,version:2,delivery:'sms'})
   assert.equal(emailCalls,0,'text-only preparation never queues or transports an email');assert.equal(texts.length,0)
   await h.cmd('sms.configure',{...consent,id:p.id,version:3});proposals.push({...p,path:new URL(sent.shareUrl).pathname})
  }
  const [first,other]=proposals,original=(await history(first.id)).assents
  await h.cmd('signer.method',{id:other.id,version:3,method:'SMS code'})
  assert.equal((await h.send(other.path+'/action?name=code.request',{})).status,200)
  const verified=await h.send(other.path+'/action?name=code.verify',{code:texts[0].Body.match(/\b\d{6}\b/)[0]});assert.equal(verified.status,200)
  assert.equal(await callback({Body:'STOP'}),200)
  await tick('2030-06-01T12:02:00Z')
  const fresh={...consent,id:first.id,version:3,assentedAt:'2030-06-01T12:02:00Z',evidence:'synthetic-platter-9912',reenableConsent:true}
  await h.cmd('sms.reenable',fresh,h.owner,409)
  assert.equal(await callback({Body:'START'}),200);await h.cmd('sms.reenable',fresh,h.owner,409)
  const start={Body:'START',OptOutType:'START',MessageSid:'synthetic-platter-9913'}
  assert.equal(await callback(start,false),401)
  assert.equal(await callback({...start,To:'+15005550007'}),403)
  assert.equal(await callback(start),200);assert.equal((await history(first.id)).reenablement,true)
  await h.cmd('sms.configure',fresh,h.owner,409)
  assert.equal(await callback({Body:'STOP'}),200)
  assert.equal(await callback(start),200);assert.equal((await history(first.id)).reenablement,false,'replayed provider receipts cannot cross a later STOP')
  const current={...start,MessageSid:'synthetic-platter-9914'};assert.equal(await callback(current),200)
  await h.cmd('sms.reenable',{...fresh,assentedAt:consent.assentedAt},h.owner,409)
  await h.cmd('sms.reenable',{...fresh,reenableConsent:false},h.owner,403)
  await h.cmd('sms.reenable',{...fresh,consent:false},h.owner,400)
  const memberAddress='synthetic-platter-9915@example.invalid'
  await h.send('/auth/invite',{email:memberAddress,role:'member',displayName:'Synthetic sender'},h.owner)
  const member=await h.signIn(memberAddress);await h.cmd('sms.reenable',fresh,member,403)
  assert.deepEqual((await history(first.id)).assents,original);assert.equal(texts.length,1)
  await h.cmd('sms.reenable',fresh)
  const active=await history(first.id)
  assert.equal(active.authorized,true);assert.equal(active.suppression,null);assert.equal(active.reenables.length,1)
  assert.equal(active.reenables[0].provider_event_id,current.MessageSid);assert.equal(active.assents.length,2);assert.deepEqual(active.assents[0],original[0])
  assert.equal(texts.length,1,'re-enablement itself never sends')
  assert.equal((await history(other.id)).authorized,false,'other invitations retain no authority')
  assert.equal((await h.send(other.path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},verified.cookie)).status,401,'an old SMS session stays revoked')
  await h.cmd('sms.send',{id:first.id,message:'Explicitly authorized after new assent',requestId:'synthetic-platter-9916'})
  assert.equal(texts.length,2);assert.equal(texts[1].To,consent.phone)
  await h.cmd('sms.reenable',fresh,h.owner,409);assert.equal(texts.length,2)
  assert.equal(await callback({Body:'STOP'}),200);assert.equal(await callback(current),200)
  assert.equal((await history(first.id)).reenablement,false)
  await h.cmd('sms.reenable',fresh,h.owner,409)
 }finally{await h.close()}
}

export async function smsDisabledJourney(){
 const sms=[],mail=[]
 const h=await harness({origin:'https://platter.example',auth:{AUTH_LOCAL:'false',SMS_PROVIDER:'disabled',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9960',TWILIO_ACCOUNT_SID:'synthetic-platter-9961',TWILIO_AUTH_TOKEN:'synthetic-platter-9962',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
  if(new URL(request.url).hostname==='api.twilio.com'){sms.push(await request.text());return Response.json({sid:'synthetic-platter-9963'},{status:201})}
  mail.push(await request.json());return Response.json({id:'synthetic-platter-'+(9964+mail.length)})
 }})
 try{
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-01T12:00:00Z'),cron:'*/15 * * * *'})
  const recipient='synthetic-platter-9964@example.invalid',client=await h.cmd('client.save',{name:'Synthetic client',email:recipient})
  const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Disabled SMS transport',scope:'Exact scope',optionOne:'One',priceOne:'100',optionTwo:'Two',priceTwo:'200',depositPercent:'25'})
  await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
  await h.cmd('proposal.send',{id:p.id,version:2,delivery:'sms'},h.owner,409)
  const sent=await h.cmd('proposal.send',{id:p.id,version:2}),path=new URL(sent.shareUrl).pathname
  await h.cmd('sms.configure',{id:p.id,version:3,recipient,phone:'+12025550149',firm:'Synthetic Platter firm',purposes:['invitation','identity','completion'],disclosure:'Selected proposal texts. Reply STOP to stop.',assentedAt:'2030-06-01T11:55:00Z',method:'Recipient signed instruction',evidence:'synthetic-platter-9965',timeZone:'Etc/UTC',consent:true})
  await h.cmd('sms.send',{id:p.id,message:'A disabled transport cannot send',requestId:'synthetic-platter-9966'})
  await h.cmd('signer.method',{id:p.id,version:3,method:'SMS code'},h.owner,409)
  assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
  const verified=await h.send(path+'/action?name=code.verify',{code:mail.at(-1).text.match(/\b\d{6}\b/)[0]});assert.equal(verified.status,200)
  assert.equal((await h.send(path+'/action?name=accept',{name:'Synthetic signer',optionId:'one',consent:true},verified.cookie)).status,200)
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-01T12:01:00Z'),cron:'*/15 * * * *'})
  assert.equal(sms.length,0,'the installer’s disabled choice prevents invitation, identity and completion transport even when private keys remain present')
 }finally{await h.close()}
}

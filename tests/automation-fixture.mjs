import assert from 'node:assert/strict'
import { driveFixture, connectDrive } from './drive-fixture.mjs'

export const slackToken='synthetic-platter-10101',slackChannel='synthetic-platter-10102'
export function automationFixture(){
 const drive=driveFixture(),messages=[],chats=[],requests=[]
 let outcome='success',hook
 const outboundService=async request=>{
  const url=new URL(request.url)
  if(url.hostname==='www.googleapis.com')return drive.outboundService(request)
  if(url.hostname==='api.resend.com'){messages.push(await request.json());return Response.json({id:'synthetic-platter-10103'})}
  assert.equal(url.hostname,'slack.com');assert.equal(request.headers.get('authorization'),'Bearer '+slackToken)
  requests.push(url.pathname)
  if(hook)await hook(request)
  if(url.pathname==='/api/auth.test')return Response.json({ok:true,team_id:'synthetic-platter-10104'})
  if(url.pathname==='/api/conversations.info')return Response.json({ok:true,channel:{id:slackChannel,is_member:true}})
  assert.equal(url.pathname,'/api/chat.postMessage')
  const body=await request.json();requests.push(body)
  if(outcome==='failed')return Response.json({ok:false,error:'channel_not_found',private:'synthetic-platter-never-retain'})
  chats.push(body)
  if(outcome==='uncertain')return new Response('synthetic-platter-never-retain',{status:503})
  if(outcome==='unknown')return Response.json({ok:false,error:'synthetic-platter-unknown'})
  return Response.json({ok:true,ts:'synthetic-platter-10105'})
 }
 return {drive,messages,chats,requests,outboundService,outcome:value=>{outcome=value},setHook:value=>{hook=value},posts:()=>requests.filter(r=>r==='/api/chat.postMessage').length}
}
export async function automationDestinations(h,cookie=h.owner){
 await connectDrive(h,cookie)
 await h.cmd('provider.connect',{provider:'slack',version:0,token:slackToken,consent:true},cookie)
 return h.cmd('notification.route',{provider:'slack',event:'signed',kind:'channel',destination:slackChannel,consent:true},cookie)
}
export const ruleInput=routeId=>({name:'Archive and notify',trigger:'signed',archiveVersion:1,routeId,consent:true})

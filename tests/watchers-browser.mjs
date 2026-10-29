import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { harness } from './harness.mjs'
import { browserEdge } from './browser-edge.mjs'

export async function watcherBrowser(width=1440) {
 let h,browser,owner,member,edge
 const messages=[]
 const address=name=>name+String.fromCharCode(64)+'example.test'
 const destinations={owner:'synthetic-platter-9801',member:'synthetic-platter-9802',inactive:'synthetic-platter-9803'}
 try {
  edge=await browserEdge()
  h=await harness({origin:edge.origin,auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9807'},entry:'dist/server/index.js',assetsDirectory:'dist/client',outboundService:async request=>{
   const url=new URL(request.url)
   if(url.hostname==='api.resend.com'){messages.push(await request.json());return Response.json({id:'synthetic-platter-'+messages.length})}
   if(url.hostname==='graph.microsoft.com'){
    if(url.pathname==='/v1.0/me')return Response.json({id:'synthetic-platter-9810'})
    return Response.json({chatType:'oneOnOne',members:[{email:url.pathname.endsWith('9812')?address('synthetic-platter-9804'):h.auth.OWNER_EMAIL},{userId:'synthetic-platter-9810'}]})
   }
   if(url.pathname==='/api/auth.test')return Response.json({ok:true,team_id:'synthetic-platter-9800'})
   if(url.pathname==='/api/users.info')return Response.json({ok:true,user:{team_id:'synthetic-platter-9800',profile:{email:url.searchParams.get('user')===destinations.member?address('synthetic-platter-9804'):h.auth.OWNER_EMAIL}}})
   throw Error('Unexpected provider request')
  }})
  edge.attach(h)
  browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  owner=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
  const cookie=async(context,value)=>{const [name,...parts]=value.split('=');await context.addCookies([{name,value:parts.join('='),url:h.origin}])}
  await cookie(owner,h.owner)
  const page=await owner.newPage()
  await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  await h.send('/auth/invite',{email:address('synthetic-platter-9804'),role:'member',displayName:'Second watcher'},h.owner)
  assert.equal((await h.send('/auth/magic-link',{email:address('synthetic-platter-9804')})).status,202)
  const message=messages.findLast(m=>m.to.includes(address('synthetic-platter-9804')))
  const token=new URL(message.text.match(/https?:\/\/[^\s]+\/auth\/confirm\?token=[^\s]+/)[0]).searchParams.get('token')
  const verified=await h.send('/auth/confirm',{token});assert.equal(verified.status,303)
  const memberCookie=verified.cookie,person=(await h.state(memberCookie)).actor,ownerPerson=(await h.state()).actor
  const client=await h.cmd('client.save',{name:'Synthetic client',email:address('synthetic-platter-9805')})
  const proposal=await h.cmd('proposal.prepare',{clientId:client.id,title:'Campaign notification choices',scope:'The private campaign scope.',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
  await h.cmd('proposal.approve',{id:proposal.id,version:1,revision:1});const sent=await h.cmd('proposal.send',{id:proposal.id,version:2})
  await h.cmd('proposal.share',{id:proposal.id,operatorId:person.id,shared:true})
  await h.cmd('provider.connect',{provider:'slack',version:0,token:'synthetic-platter-9806',consent:true})
  const route=await h.cmd('notification.route',{provider:'slack',event:'approval',kind:'direct',destination:destinations.owner,operatorId:ownerPerson.id,consent:true})
  const other=await h.cmd('notification.route',{provider:'slack',event:'approval',kind:'direct',destination:destinations.member,operatorId:person.id,consent:true})
  const inactive=await h.cmd('notification.route',{provider:'slack',event:'approval',kind:'direct',destination:destinations.inactive,operatorId:ownerPerson.id,consent:true})
  await h.cmd('notification.route.remove',{id:inactive.id})
  await h.cmd('provider.connect',{provider:'teams',version:0,token:'synthetic-platter-9811',consent:true})
  const teams=await h.cmd('notification.route',{provider:'teams',event:'approval',kind:'direct',destination:'synthetic-platter-9813',operatorId:ownerPerson.id,consent:true})
  const otherTeams=await h.cmd('notification.route',{provider:'teams',event:'approval',kind:'direct',destination:'synthetic-platter-9812',operatorId:person.id,consent:true})
  const inactiveTeams=await h.cmd('notification.route',{provider:'teams',event:'approval',kind:'direct',destination:'synthetic-platter-9814',operatorId:ownerPerson.id,consent:true})
  await h.cmd('notification.route.remove',{id:inactiveTeams.id})
  const settingsPath='/app/settings/notifications?id='+proposal.id
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  const capture=async(target,name)=>{
   await target.evaluate(()=>document.fonts.ready)
   assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'notification settings fit the test viewport')
   if(!screenshots)return
   const panel=target.locator('section').filter({has:target.getByRole('heading',{name:'Your proposal notifications',exact:true})})
   for(const shownWidth of [1440,390]){
    await target.setViewportSize({width:shownWidth,height:900});await target.evaluate(()=>document.fonts.ready)
    assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'notification settings fit the viewport')
    await panel.screenshot({path:join(screenshots,'SEND-005-'+name+'-'+shownWidth+'.png')})
   }
   await target.setViewportSize({width,height:900})
  }
  const read=async(auth=h.owner)=>(await h.send('/api/platter/watch?id='+proposal.id,undefined,auth)).value.watcher
  await page.goto(h.origin+'/app/proposal?id='+proposal.id)
  await page.getByRole('link',{name:'Notification settings',exact:true}).click()
  assert.equal(new URL(page.url()).pathname,'/app/settings/notifications')
  assert.equal(await page.getByLabel('First client view').isChecked(),false)
  assert.equal(await page.getByLabel('Personal Slack destination').locator('option').count(),2,'only the current person’s active verified destination is offered')
  assert.equal(await page.getByLabel('Personal Slack destination').locator('option[value="'+other.id+'"]').count(),0)
  assert.equal(await page.getByLabel('Personal Slack destination').locator('option[value="'+inactive.id+'"]').count(),0)
  for(const label of ['First client view','Client comment','Client signature','Recorded payment','Client decline','Failed payment','Email to my sign-in address'])await page.getByLabel(label,{exact:true}).check()
  assert.equal(await page.getByLabel('Personal Teams destination').locator('option').count(),2)
  for(const hidden of [otherTeams,inactiveTeams])assert.equal(await page.getByLabel('Personal Teams destination').locator('option[value="'+hidden.id+'"]').count(),0)
  await page.getByLabel('Personal Slack destination').selectOption(route.id)
  await page.getByLabel('Personal Teams destination').selectOption(teams.id)
  const consent=()=>page.getByRole('checkbox',{name:'I authorize these events and channels for revision 1.',exact:true})
  assert.equal(await consent().isChecked(),false)
  await consent().check();await page.getByRole('button',{name:'Save notification preferences',exact:true}).click()
  assert.match(await page.locator('main').innerText(),/Consent active for this revision/)
  assert.equal(await consent().isChecked(),false,'saving never preselects fresh consent')
  const first=await read()
  assert.equal(first.authorized,1);assert.equal(first.revision,1);assert.equal(first.slack_route,route.id);assert.deepEqual(JSON.parse(first.events),['view','comment','signed','paid','declined','payment_failed']);assert.equal(first.teams_route,teams.id)
  await capture(page,'owner-consented')

  member=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true});await cookie(member,memberCookie)
  const second=await member.newPage()
  await second.goto(h.origin+settingsPath)
  assert.equal(await second.getByLabel('First client view').isChecked(),false,'another person’s saved choices are never displayed')
  assert.equal(await second.getByLabel('Personal Slack destination').locator('option[value="'+route.id+'"]').count(),0)
  assert.equal(await second.getByLabel('Personal Slack destination').locator('option[value="'+other.id+'"]').count(),1)
  assert.equal(await second.getByLabel('Personal Teams destination').locator('option[value="'+teams.id+'"]').count(),0)
  assert.equal(await second.getByLabel('Personal Teams destination').locator('option[value="'+otherTeams.id+'"]').count(),1)
  for(const label of ['Client comment','Client signature','Recorded payment','Email to my sign-in address'])await second.getByLabel(label,{exact:true}).check()
  await second.getByRole('checkbox',{name:'I authorize these events and channels for revision 1.',exact:true}).check()
  await second.getByRole('button',{name:'Save notification preferences',exact:true}).click()
  await second.reload()
  const secondPreferences=await read(memberCookie)
  assert.equal(secondPreferences.authorized,1);assert.equal(secondPreferences.email_enabled,1);assert.equal(secondPreferences.slack_route,null);assert.equal(secondPreferences.teams_route,null);assert.deepEqual(JSON.parse(secondPreferences.events),['comment','signed','paid'])
  await capture(second,'email-only')
  assert.deepEqual(await read(),first,'one person’s save leaves the other preferences exact')

  const stale=await owner.newPage();await stale.goto(h.origin+settingsPath)
  await page.getByLabel('Recorded payment',{exact:true}).uncheck();await consent().check();await page.getByRole('button',{name:'Save notification preferences',exact:true}).click()
  const changed=await read()
  await stale.getByRole('checkbox',{name:'I authorize these events and channels for revision 1.',exact:true}).check()
  const staleResponse=stale.waitForResponse(response=>response.url().includes('notification.watch')&&response.request().method()==='POST')
  await stale.getByRole('button',{name:'Save notification preferences',exact:true}).click()
  assert.equal((await staleResponse).status(),409);assert.match(await stale.getByRole('alert').innerText(),/Notification preferences changed/)
  assert.deepEqual(await read(),changed,'a stale form cannot replace current choices')
  await stale.close()
  await page.getByRole('button',{name:'Revoke notification consent',exact:true}).click()
  const revoked=await read()
  assert.equal(revoked.authorized,0);assert.equal(revoked.email_enabled,1);assert.equal(revoked.slack_route,route.id);assert.deepEqual(JSON.parse(revoked.events),['view','comment','signed','declined','payment_failed']);assert.equal(revoked.teams_route,teams.id)
  assert.equal((await read(memberCookie)).authorized,1,'personal revocation does not revoke somebody else')
  await capture(page,'revoked')
  await second.reload();assert.equal(await second.getByLabel('First client view').isDisabled(),true,'view events require the current owner’s consent')
  await h.send(new URL(sent.shareUrl).pathname);await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-01T12:00:00Z'),cron:'*/15 * * * *'})
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM p_notification_outbox WHERE watcher_id=?').bind(first.id).first()).n,0,'revoked consent cannot queue a future view')
  await h.cmd('proposal.share',{id:proposal.id,operatorId:person.id,shared:false})
  assert.equal((await second.goto(h.origin+settingsPath)).status(),403,'lost scope refuses the personal settings door')
  assert.equal((await h.send(settingsPath)).status,303,'settings require a member session')
 } finally {await member?.close();await owner?.close();await browser?.close();await edge?.close();await h?.close()}
}

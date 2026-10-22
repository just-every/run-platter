import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'

export async function remindersJourney(){
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp({scheduled:true})
   const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),post=(path,data)=>context.request.post(app.origin+path,{headers:{origin:app.origin},data,maxRedirects:0}),state=async()=>(await context.request.get(app.origin+'/api/platter/state')).json(),cmd=async(name,input)=>{const response=await post('/api/platter/command',{name,input});assert.equal(response.status(),200,await response.text());return response.json()},current=async id=>(await state()).proposals.find(p=>p.id===id)
    const capture=async(name,section)=>{await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow for '+name+' at '+width);if(screenshots){await page.screenshot({path:join(screenshots,`FOLLOW-${name}-${width}.png`),fullPage:true});if(section)await section.screenshot({path:join(screenshots,`FOLLOW-${name}-${width}-panel.png`)})}}
    assert.equal((await post('/auth/bootstrap',{token:app.token,displayName:'Synthetic owner'})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await app.fireCron('2030-03-01T18:00:00Z')
    await page.goto(app.origin+'/app/settings')
    const workspace=page.locator('section').filter({has:page.getByRole('heading',{name:'Workspace defaults',exact:true})})
    await workspace.getByLabel('Reminder days after sending',{exact:true}).fill('3, 7');await workspace.getByLabel('Reminder days before expiry',{exact:true}).fill('');await workspace.getByLabel('Default expiry days after sending (empty for no expiry)',{exact:true}).fill('30');await workspace.getByRole('button',{name:'Save workspace defaults',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    const quiet=page.locator('section').filter({has:page.getByRole('heading',{name:'Reminder quiet hours',exact:true})});await quiet.getByLabel('Quiet hours start (0–23)',{exact:true}).fill('20');await quiet.getByLabel('Quiet hours end (0–23)',{exact:true}).fill('8');await quiet.getByRole('button',{name:'Save reminder quiet hours'}).click();assert.equal((await state()).reminderPolicy.quiet_end,8);await capture('workspace',quiet)
    const client=await cmd('client.save',{name:'Synthetic recipient',email:'client@synthetic-platter.example'}),source=await cmd('template.start',{id:'starter:consultancy',version:1,clientId:client.id})
    await page.goto(app.origin+'/app/proposal?id='+source.id)
    const save=page.locator('section').filter({has:page.getByRole('heading',{name:'Save a personal template',exact:true})});await save.getByLabel('Template name',{exact:true}).fill('Delivery template');await save.getByRole('button',{name:'Save personal template',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    await page.goto(app.origin+'/app');await page.getByText('Reminder and expiry defaults for Delivery template',{exact:true}).click()
    const templates=page.locator('section').filter({has:page.getByRole('heading',{name:'Personal templates',exact:true})}),defaults=templates.locator('form').filter({has:page.getByRole('button',{name:'Save template delivery defaults',exact:true})})
    for(const label of ['Reminder source','Expiry source','Warning source'])await defaults.getByRole('combobox',{name:label,exact:true}).selectOption('override')
    await defaults.getByLabel('Template days after sending',{exact:true}).fill('2, 5, 9');await defaults.getByLabel('Template days before expiry',{exact:true}).fill('');await defaults.getByLabel('Template expiry days (empty for no expiry)',{exact:true}).fill('14');await defaults.getByRole('button',{name:'Save template delivery defaults',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    await page.getByText('Reminder and expiry defaults for Delivery template',{exact:true}).click();await capture('template-override',templates)
    await templates.getByRole('button',{name:'Start from Delivery template',exact:true}).click()
    const id=new URL(page.url()).searchParams.get('id');assert.ok(id)
    const reminders=page.locator('section').filter({has:page.getByRole('heading',{name:'Email reminders',exact:true})})
    assert.equal(await reminders.getByLabel('Recipient IANA time zone',{exact:true}).inputValue(),'','recipient zone is never inferred')
    assert.match(await reminders.innerText(),/inactive until a sender/)
    await reminders.getByLabel('Recipient IANA time zone',{exact:true}).fill('America/Los_Angeles');await reminders.getByLabel('I authorize scheduled reminder email for this proposal and confirm the recipient time zone.',{exact:true}).check();await reminders.getByLabel('Scheduled reminder subject',{exact:true}).fill('Review the proposed schedule');await reminders.getByLabel('Scheduled reminder message',{exact:true}).fill('Please review the start date before accepting.');await reminders.getByRole('button',{name:'Save reminder settings',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    assert.deepEqual((await current(id)).deliveryPreview.reminders.map(r=>r.date),['2030-03-03','2030-03-06','2030-03-10']);assert.match(await reminders.innerText(),/2030-03-15/);await capture('before-send',reminders)
    await page.getByRole('button',{name:'Approve this revision',exact:true}).click();const approved=(await current(id)).approved_at;await page.getByRole('button',{name:'Send approved proposal',exact:true}).click();assert.equal((await current(id)).status,'sent');await capture('scheduled',reminders)
    await reminders.getByRole('combobox',{name:'Scheduled reminders',exact:true}).selectOption('no');await reminders.getByLabel('Scheduled reminder message',{exact:true}).fill('The next reminder has edited text.');await reminders.getByRole('button',{name:'Save reminder settings',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    assert.equal((await current(id)).revision,1);assert.equal((await current(id)).approved_at,approved);assert.equal((await current(id)).reminderSettings.enabled,0)
    await reminders.getByLabel('Manual reminder subject',{exact:true}).fill('Manual schedule check');await reminders.getByLabel('Manual reminder message',{exact:true}).fill('Can you confirm the start date?');await reminders.getByRole('button',{name:'Send manual email reminder',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    const delivery=page.locator('section').filter({has:page.getByRole('heading',{name:'Invitation delivery',exact:true})});assert.match(await delivery.innerText(),/Manual schedule check/);assert.match(await delivery.innerText(),/Can you confirm the start date\?/)
    const sent=(await state()).outbox.find(m=>m.subject==='Manual schedule check');assert.equal(sent.recipient,'client@synthetic-platter.example');assert.ok(sent.body.startsWith('Can you confirm the start date?\n\n'));await capture('manual-sent',delivery)
    await reminders.getByRole('button',{name:'Send manual email reminder',exact:true}).click();assert.match(await page.getByRole('alert').innerText(),/One manual reminder per recipient calendar day/);await capture('manual-daily-limit',reminders)
    const expiry=page.locator('section').filter({has:page.getByRole('heading',{name:'Expiry and reopening',exact:true})});await expiry.getByRole('combobox',{name:'Expiry type',exact:true}).selectOption('date');await expiry.getByLabel('Expiry date in installation time',{exact:true}).fill('2030-03-22');await expiry.getByRole('button',{name:'Save expiry',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0);assert.equal((await current(id)).revision,1);assert.equal((await current(id)).approved_at,approved);assert.match(await reminders.innerText(),/Expiry 2030-03-22/);await capture('expiry-timeline',reminders)
    await page.getByRole('button',{name:'Duplicate proposal',exact:true}).click();const copiedId=new URL(page.url()).searchParams.get('id'),copied=await current(copiedId);assert.notEqual(copiedId,id);assert.equal(copied.reminderSettings,null);assert.deepEqual(copied.reminderRuns,[]);assert.deepEqual(copied.deliveryChanges,[]);assert.match(await reminders.innerText(),/inactive until a sender/);await capture('copied-inactive',reminders)
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
}

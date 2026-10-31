import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import {chromium} from '@playwright/test'
import {installedApp} from './site-harness.mjs'
import {intakeTemplate,visitor} from './public-intake-fixture.mjs'

export async function publicIntakeBrowser(){
 const app=await installedApp({scheduled:true}),screens=process.env.PLATTER_SCREENSHOTS
 let browser
 try{
  if(screens)await mkdir(screens,{recursive:true})
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const owner=await browser.newContext({viewport:{width:1440,height:1000}})
  const bootstrap=await owner.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Public intake owner'},maxRedirects:0});assert.equal(bootstrap.status(),303)
  const setup=await owner.request.post(app.origin+'/setup',{headers:{origin:app.origin},form:{confirm:'yes'},maxRedirects:0});assert.equal(setup.status(),303)
  await app.fireCron(Date.parse('2031-06-01T15:00:00Z'))
  const h={origin:app.origin,cmd:async(name,input)=>{const r=await owner.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()},state:async()=>{const r=await owner.request.get(app.origin+'/api/platter/state');assert.equal(r.status(),200);return r.json()}}
  await intakeTemplate(h)
  const page=await owner.newPage()
  const capture=async(page,name)=>{
   await page.evaluate(async()=>{await document.fonts.ready})
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'public intake stays within the viewport')
   for(const width of [1440,390]){await page.setViewportSize({width,height:1000});if(screens)await page.screenshot({path:join(screens,'SEND-009-'+name+'-'+width+'.png'),fullPage:true})}
   await page.setViewportSize({width:1440,height:1000})
  }
  await page.goto(app.origin+'/app/settings')
  await page.getByText('Review public intake for Public studio',{exact:true}).click()
  const review=page.locator('form[action*="public-intake.review"]')
  for(const name of ['text:scope','package:studio','package:campaign','optional:studio:prints','block:public-text','field:brief'])await review.locator('[name="'+name+'"]').check()
  await review.locator('[name="submissionCap"]').fill('2');await review.locator('[name="expiresAt"]').fill('2031-07-01T00:00')
  await review.getByRole('button',{name:'Review public projection'}).click()
  const approval=page.locator('section').filter({has:page.getByRole('heading',{name:'Approve public projection',exact:true})})
  assert.match(await approval.innerText(),/500\.00/);assert.match(await approval.innerText(),/Project brief/)
  await capture(page,'owner-review')
  await approval.locator('[name="consent"]').check();await approval.getByRole('button',{name:'Publish reviewed intake'}).click()
  const form=(await h.state()).publicForms[0],path=new URL(form.url).pathname
  for(const [n,optionId,quantity] of [[9930,'studio',2],[9931,'campaign',0]]){
   const context=await browser.newContext({viewport:{width:1440,height:1000}}),client=await context.newPage()
   await client.goto(app.origin+path)
   assert.equal(await client.locator('[name="company"]').count(),1)
   assert.ok(!(await client.locator('main').innerText()).includes('Private directory company'))
   const values=visitor(n)
   for(const name of ['name','email','company'])await client.locator('[name="'+name+'"]').fill(values[name])
   await client.locator('[name="optionId"][value="'+optionId+'"]').check()
   if(quantity){await client.locator('[name="add.studio.prints"]').check();await client.locator('[name="qty.studio.prints"]').fill(String(quantity))}
   await client.locator('[name="field:brief"]').fill(values['field:brief'])
   if(n===9930)await capture(client,'visitor-form')
   await client.getByRole('button',{name:'Send verification code'}).click()
   await client.getByRole('heading',{name:'Verify your mailbox',exact:true}).waitFor({timeout:5000}).catch(async error=>{throw new Error('Intake response '+client.url()+' '+await client.locator('body').innerText(),{cause:error})})
   if(n===9930)await capture(client,'mailbox-code')
   const mail=(await h.state()).publicIntakeMail.find(m=>m.recipient===values.email&&/\b\d{6}\b/.test(m.body))
   await client.locator('[name="code"]').fill(mail.body.match(/\b\d{6}\b/)[0])
   await client.getByRole('button',{name:'Verify and submit request'}).click()
   await client.getByRole('heading',{name:'Request received',exact:true}).waitFor()
   assert.match(await client.locator('main').innerText(),n===9930?/2,200\.00/:/4,000\.00/)
   assert.match(await client.locator('main').innerText(),/500\.00/)
   if(n===9930)await capture(client,'request-receipt')
   await context.close()
  }
  const state=await h.state();assert.equal(state.publicSubmissions.length,2)
  for(const submission of state.publicSubmissions){const draft=state.proposals.find(p=>p.id===submission.proposal_id);assert.equal(draft.status,'draft');assert.equal(draft.collection.completion,'off');assert.equal(draft.approved_by,null)}
  await page.goto(app.origin+'/app/proposal?id='+state.publicSubmissions[0].proposal_id)
  assert.match(await page.locator('main').innerText(),/Public intake provenance/)
  await capture(page,'owner-draft')
  await page.goto(app.origin+'/app/settings')
  await page.getByRole('button',{name:'Disable public intake',exact:true}).click()
  const refused=await browser.newContext();assert.equal((await refused.request.get(app.origin+path)).status(),410);await refused.close()
  await owner.close()
 }finally{await browser?.close();await app.close()}
}

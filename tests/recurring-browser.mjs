import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'
import { recurringFixture } from './recurring-journey.mjs'

export async function recurringBrowserJourney() {
 const browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM_PATH?{executablePath:process.env.PLATTER_CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const screenshots=process.env.PLATTER_SCREENSHOTS
 if(screenshots)await mkdir(screenshots,{recursive:true})
 try{for(const width of screenshots?[1440,390]:[1440]){
  const app=await installedApp(),context=await browser.newContext({viewport:{width,height:900}})
  try{
   const page=await context.newPage(),headers={origin:app.origin}
   assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers,data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
   await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
   const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers,data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
   const client=await cmd('client.save',{name:'Recurring client',email:'recurring@studio.example'}),p=await cmd('proposal.prepare',{clientId:client.id,...recurringFixture(),title:'Setup and recurring care',scope:'Services for the agreed term.',depositPercent:'1'})
   const capture=async(name)=>{await page.waitForLoadState('load');if(width===1440){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' fits');for(const control of await page.locator('button,a[role=button]').all()){const label=(await control.innerText()).trim();if(label&&!/[A-Za-z0-9]/.test(label)&&await control.isVisible()){const id=await control.getAttribute('aria-describedby');assert.ok(id,'Icon-only control has a tooltip');await control.focus();assert.equal(await page.locator('#'+id).isVisible(),true);await control.hover();await page.locator('#'+id).waitFor({state:'visible'})}}}if(screenshots)await page.screenshot({path:join(screenshots,'PRICE-003-'+name+'-'+width+'.png'),fullPage:true})}
   await page.goto(app.origin+'/app/proposal?id='+p.id)
   const line=page.locator('[data-pricing-line]').filter({has:page.locator('[data-pricing-field=name][value=Care]')})
   if(width===1440){assert.equal(await line.getByLabel('Billing interval').inputValue(),'monthly');assert.equal(await line.getByLabel('Recurring installments').inputValue(),'12')}
   await line.getByLabel('Recurring installments').fill('24');await page.getByRole('button',{name:'Save revision',exact:true}).click()
   await line.getByLabel('Recurring installments').fill('12');await page.getByRole('button',{name:'Save revision',exact:true}).click();await capture('editor')
   await page.goto(app.origin+'/app/preview/client?id='+p.id+'&revision=3&optionId=two&items='+encodeURIComponent(JSON.stringify([{id:'seats',quantity:4}])))
   if(width===1440){const text=await page.locator('main').innerText();assert.ok(text.includes('One-off total: USD 2,500.00'));assert.ok(text.includes('First-year value: USD 19,300.00'));assert.ok(text.includes('USD 200.00 per month'))}await capture('preview')
   await cmd('proposal.approve',{id:p.id,version:3,revision:3});const sent=await cmd('proposal.send',{id:p.id,version:4}),path=new URL(sent.shareUrl).pathname
   await page.goto(app.origin+path+'?optionId=two')
   if(width===1440){const text=await page.locator('main').innerText();assert.ok(text.includes('First-year value: USD 16,900.00'));assert.ok(text.includes('USD 1,200.00 per month'))}
   await page.getByRole('checkbox',{name:/Add Extra seats/}).check();await page.getByLabel('Quantity for Extra seats').fill('4');await page.getByRole('button',{name:'Review package',exact:true}).click();if(width===1440)assert.ok((await page.locator('main').innerText()).includes('4 × $50.00 USD × 12 installments = $2,400.00 USD'));await capture('client')
   await page.getByRole('button',{name:'Send verification code',exact:true}).click()
   const state=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=state.outbox.find(x=>x.proposal_id===p.id&&x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
   await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click()
   await page.getByLabel('Your full name').fill('Avery Chen');await page.locator('[name=consent]').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
   if(width===1440){const text=await page.locator('main').innerText();assert.ok(text.includes('First-year value: USD 19,300.00'));assert.ok(text.includes('USD 200.00 per month'));assert.ok(text.includes('This agreement is complete'))}await capture('agreement')
  }finally{await context.close();await app.close()}
 }}finally{await browser.close()}
}

export async function renewalBrowserJourney(){
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs'),{acceptedRenewal}=await import('./renewal-journey.mjs')
 const edge=await browserEdge(),h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin});edge.attach(h)
 let browser,context
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM_PATH??process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true})
  const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}])
  const page=await context.newPage();await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  const source=await acceptedRenewal(h)
  await page.goto(h.origin+'/app/settings')
  const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Renewal drafting',exact:true})})
  await panel.getByLabel('Recurring rate increase', {exact:true}).fill('5')
  await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Authorize renewal draft',exact:true}).click()
  assert.equal(await page.getByRole('alert').count(),0);assert.match(await panel.innerText(),/Drafting is authorized/)
  assert.match(await panel.innerText(),/2099-12-17/)
  const capture=async label=>{if(!process.env.PLATTER_SCREENSHOTS)return;await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true});for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);await (label==='independent-draft'?page.locator('[data-pricing-table]').first():panel).screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'RENEW-002-'+label+'-'+width+'.png')})}await page.setViewportSize({width:1440,height:1000})}
  await capture('authorized-settings')
  await panel.getByRole('button',{name:'Revoke renewal authorization',exact:true}).click();assert.match(await panel.innerText(),/Drafting is inactive/)
  await panel.getByLabel('Recurring increase type').selectOption('fixed');await panel.getByLabel('Recurring rate increase',{exact:true}).fill('0.01');await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Authorize renewal draft',exact:true}).click()
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2099-12-17T00:00:00Z'),cron:'*/15 * * * *'})
  await page.reload();await capture('draft-ready')
  await panel.getByRole('link',{name:'Open renewal draft',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:'Approve this revision',exact:true}).count(),1)
  assert.equal(await page.getByRole('button',{name:'Send approved proposal',exact:true}).count(),0)
  const line=page.locator('[data-pricing-line]').filter({has:page.locator('[data-pricing-field=name][value="Monthly care"]')})
  assert.equal(await line.locator('[data-pricing-field=unitPrice]').inputValue(),'1200.01')
  assert.equal(await line.getByLabel('Recurring start date').inputValue(),'2100-01-31')
  await capture('independent-draft')
  const result=(await h.state()).renewals.rows.find(r=>r.proposal_id===source.id)
  assert.ok(result.draft_id);assert.equal(result.active,0)
 }finally{await context?.close();await browser?.close();await h.close();await edge.close()}
}

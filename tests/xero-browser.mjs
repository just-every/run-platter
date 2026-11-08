import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'
import { xeroFixture } from './provider-network.mjs'
import { acceptXeroDeposit } from './xero-fixture.mjs'

export async function xeroBrowser(){
 const edge=xeroFixture();let app,browser
 try{
  app=await installedApp({scheduled:true,outboundService:edge.outboundService})
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  try{
   const post=async(path,data)=>{const r=await context.request.post(app.origin+path,{headers:{origin:app.origin},data,maxRedirects:0});return {status:r.status(),value:await r.json().catch(()=>({})),headers:r.headers()}}
   assert.equal((await post('/auth/bootstrap',{token:app.token,displayName:'Synthetic owner'})).status,303)
   await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
   const h={origin:app.origin,owner:undefined,cmd:async(name,input)=>{const r=await post('/api/platter/command',{name,input});assert.equal(r.status,200,JSON.stringify(r.value));return r.value},state:async()=>{const r=await context.request.get(app.origin+'/api/platter/state');return r.json()},send:async(path,body,cookie)=>{const r=body===undefined?await context.request.get(app.origin+path):await context.request.post(app.origin+path,{headers:{origin:app.origin,...(cookie?{cookie}:{})},data:body});return {status:r.status(),text:await r.text(),cookie:r.headers()['set-cookie']?.split(';')[0]}}}
   const completed=await acceptXeroDeposit(h)
   await page.goto(app.origin+'/app/settings')
   const connect=page.locator('form').filter({has:page.locator('input[name="provider"][value="xero"]')}).filter({has:page.getByRole('button',{name:'Connect Xero',exact:true})})
   await connect.getByLabel('Xero access token').fill(edge.token);await connect.getByLabel('Xero organization id').fill(edge.accountId);await connect.getByRole('checkbox').check();await connect.getByRole('button',{name:'Connect Xero',exact:true}).click()
   const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Xero deposit accounting',exact:true})})
   const authority=panel.locator('form').filter({has:page.getByRole('button',{name:'Choose invoice authority'})})
   await authority.getByRole('combobox',{name:'Invoice authority',exact:true}).selectOption('xero');await authority.getByRole('checkbox').check();await authority.getByRole('button',{name:'Choose invoice authority'}).click()
   assert.equal(await panel.getByRole('combobox',{name:'Invoice authority',exact:true}).inputValue(),'xero')
   const capture=async name=>{if(!screenshots)return;for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await panel.scrollIntoViewIfNeeded();await panel.screenshot({path:join(screenshots,'ACCT-002-'+name+'-'+width+'.png')})}await page.setViewportSize({width:1440,height:1000})}
   await panel.getByLabel('Accepted deposit').selectOption(completed.p.id);await panel.getByRole('button',{name:'Read Xero deposit mapping'}).click()
   assert.match(await panel.innerText(),/\$2,000\.01 USD/)
   await panel.getByLabel(/Create one new Xero contact/).check();await panel.getByLabel('Deposit income account').selectOption('200');await panel.getByRole('button',{name:'Review exact Xero invoice'}).click()
   assert.match(await panel.innerText(),/Income account: 200 · Deposit revenue/);assert.match(await panel.innerText(),/Tax: none · Deposit only/)
   assert.equal(edge.state.invoices.length,0,'reading and reviewing never issues an invoice')
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   await capture('review')
   await panel.getByLabel(/I reviewed this exact accepted deposit/).check();await panel.getByRole('button',{name:'Issue reviewed Xero deposit'}).click()
   assert.match(await panel.getByRole('list',{name:'Xero deposit history'}).innerText(),/complete/)
   assert.equal(edge.state.invoices.length,1);assert.equal(edge.state.invoices[0].Total,2000.01)
   assert.equal(await panel.getByRole('button',{name:'Choose invoice authority'}).count(),0)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   await capture('issued')
  }finally{await context.close()}
 }finally{await browser?.close();await app?.close()}
}

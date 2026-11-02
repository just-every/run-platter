import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'
import { hubspotFixture } from './hubspot-fixture.mjs'
import { privacyFixture } from './privacy-fixture.mjs'
export async function privacyBrowser(){
 const edge=hubspotFixture();let app,browser,context
 try{
  app=await installedApp({scheduled:true,outboundService:edge.request})
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLATTER_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  context=await browser.newContext({viewport:{width:1440,height:900}})
  const claimed=await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic privacy owner'},maxRedirects:0});assert.equal(claimed.status(),303)
  const owner=(await context.cookies()).map(c=>c.name+'='+c.value).join('; ')
  const send=async(path,body,cookie=owner)=>{
   const response=await fetch(app.origin+path,{method:body===undefined?'GET':'POST',headers:{origin:app.origin,cookie,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual'})
   const text=await response.text();let value;try{value=JSON.parse(text)}catch{value=text}
   return {status:response.status,value,text,cookie:response.headers.get('set-cookie')?.split(';')[0]}
  }
  const h={origin:app.origin,owner,db:app.db,mf:{dispatchFetch:(url,options)=>fetch(url,{...options,redirect:options?.redirect??'manual'})},send,cmd:async(name,input)=>{const r=await send('/api/platter/command',{name,input});assert.equal(r.status,200,r.text);return r.value},state:async()=>{const r=await send('/api/platter/state');assert.equal(r.status,200);return r.value}}
  const fixture=await privacyFixture(h,edge),page=await context.newPage()
  const capture=async name=>{
   if(process.env.PLATTER_SCREENSHOTS)await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true})
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.evaluate(()=>document.fonts.ready)
    if(process.env.PLATTER_SCREENSHOTS)await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`PRIV-001-${name}-${width}.png`),fullPage:true})
   }
   await page.setViewportSize({width:1440,height:900})
  }
  await page.goto(app.origin+'/app/settings')
  await page.getByLabel('Client for retention hold').selectOption(fixture.client.id);await page.getByLabel('Hold kind',{exact:true}).selectOption('legal');await page.getByLabel('Contact hold reason').fill('Synthetic legal retention')
  await page.getByRole('button',{name:'Hold contact data',exact:true}).click()
  assert.match(await page.locator('main').innerText(),/Synthetic legal retention/);await capture('settings-hold')
  await page.goto(app.origin+'/app/clients');await page.getByText('Review privacy erasure',{exact:true}).click();await page.getByRole('button',{name:'Review erasure inventory',exact:true}).click()
  assert.match(await page.getByRole('alert').innerText(),/retention or legal hold/)
  await page.goto(app.origin+'/app/settings');await page.getByRole('button',{name:'Release contact hold',exact:true}).click()
  await page.goto(app.origin+'/app/clients');await page.getByText('Review privacy erasure',{exact:true}).click();await page.getByRole('button',{name:'Review erasure inventory',exact:true}).click()
  assert.match(await page.locator('main').innerText(),/2 unretained proposals/);assert.match(await page.locator('main').innerText(),/synthetic-platter-4601/)
  assert.ok(await page.getByRole('button',{name:'Erase reviewed personal data',exact:true}).isVisible())
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  for(const button of await page.locator('button').all())if(await button.isVisible()&&!/[\p{L}\p{N}]/u.test((await button.innerText()).trim())){const tip=button.locator('..').getByRole('tooltip');assert.equal(await tip.count(),1);await button.focus();assert.ok(await tip.isVisible());await button.hover();await page.waitForTimeout(350);assert.ok(await tip.isVisible())}
  await capture('review')
  await page.getByLabel('Confirm client name for privacy erasure').fill(fixture.client.name)
  await page.getByLabel('I authorize this reviewed erasure and the retained business-record exceptions.').check()
  await page.getByRole('button',{name:'Erase reviewed personal data',exact:true}).click()
  assert.equal(await page.getByRole('heading',{name:'Erased contact',exact:true}).count(),1);assert.match(await page.locator('main').innerText(),/Erasure receipt/);assert.match(await page.locator('main').innerText(),/synthetic-platter-4601/)
  const state=await h.state();assert.equal(state.proposals.length,1);assert.equal(state.tracking.views.length,0);assert.equal(state.privacy.receipts.length,1)
  assert.ok(!(await page.locator('main').innerText()).includes(fixture.client.email))
  await capture('receipt')
  await page.goto(app.origin+'/app/proposal?id='+fixture.retained.id)
  assert.equal(await page.getByRole('heading',{name:'Business-record retention exception',exact:true}).count(),1);await capture('retained-agreement')
 }finally{await context?.close();await browser?.close();await app?.close()}
}

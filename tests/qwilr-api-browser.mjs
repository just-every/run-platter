import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { harness } from './harness.mjs'
import { browserEdge } from './browser-edge.mjs'
import { qwilrApiFixture } from './qwilr-api-fixture.mjs'

export async function qwilrApiBrowser() {
 const edge=await browserEdge(),provider=qwilrApiFixture()
 let h,browser
 try {
  h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,unclaimed:true,outboundService:r=>provider.fetch(r)})
  edge.attach(h)
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true}),page=await context.newPage()
  const capture=async phase=>{
   for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000})
    await page.evaluate(()=>document.fonts.ready)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    if(process.env.PLATTER_SCREENSHOTS){await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'MIG-004-'+phase+'-'+width+'.png'),fullPage:true})}
   }
   await page.setViewportSize({width:1440,height:1000})
  }
  assert.equal((await context.request.post(h.origin+'/auth/bootstrap',{headers:{origin:h.origin},data:{token:h.auth.SETUP_TOKEN,displayName:'Synthetic Qwilr owner'},maxRedirects:0})).status(),303)
  await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  await page.goto(h.origin+'/app/import')
  await page.getByLabel('Move-in name',{exact:true}).fill('Synthetic Qwilr API capture')
  await page.getByLabel('Export source',{exact:true}).selectOption('qwilr')
  await page.getByRole('button',{name:'Start document move-in',exact:true}).click()
  const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Synthetic Qwilr API capture',exact:true})})
  await section.getByText('Read Qwilr API evidence',{exact:true}).click()
  await capture('api-capture')
  await page.setViewportSize({width:390,height:1000})
  await section.getByLabel('Qwilr API token',{exact:true}).fill('synthetic-platter-991')
  await section.getByRole('checkbox').check()
  await section.getByRole('button',{name:'Read Qwilr source evidence',exact:true}).click()
  assert.match(await section.innerText(),/qwilr-api.zip/)
  assert.equal(await section.getByLabel('Qwilr API token',{exact:true}).inputValue(),'')
  await section.getByRole('button',{name:'Preview document move-in',exact:true}).click()
  assert.equal(await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).count(),0)
  for(const id of ['synthetic-platter-1','synthetic-platter-2'])await section.locator('select[name="match:binding:qwilr:api-pages:'+id+':document"]').selectOption('unmapped')
  await section.getByRole('button',{name:'Review report matches',exact:true}).click()
  await section.getByText('Source facts, dates, currencies and provenance',{exact:true}).click()
  assert.match(await section.innerText(),/"unitPrice": 1200/)
  assert.match(await section.innerText(),/"billingSchedule": "monthly"/)
  await capture('api-review')
  await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).click()
  while(await section.getByRole('button',{name:'Continue document move-in',exact:true}).count())await section.getByRole('button',{name:'Continue document move-in',exact:true}).click()
  const facts=page.locator('section').filter({has:page.getByRole('heading',{name:'Retained source facts',exact:true})})
  assert.equal(await facts.locator('li').count(),3)
  await section.getByRole('button',{name:'Open document journal',exact:true}).click()
  const jsonLink=section.getByRole('link',{name:/Download exports.*\.json/}).first()
  const response=await context.request.get(h.origin+await jsonLink.getAttribute('href'))
  assert.equal(response.status(),200)
  const downloaded=await response.body()
  assert.ok([...provider.originals.values()].some(bytes=>bytes.equals(downloaded)))
  await capture('api-journal')
  const calls=provider.requests.length
  await page.setViewportSize({width:390,height:1000})
  await section.getByRole('button',{name:'Undo document move-in',exact:true}).click()
  assert.equal(await page.getByRole('heading',{name:'Retained source facts',exact:true}).count(),0)
  assert.match(await section.innerText(),/Import undone/)
  assert.equal(provider.requests.length,calls)
  await capture('api-undone')
  await context.close()
  console.log('PROBE MIG-004 API controls: compiled owner import page at 1440 and 390 -> explicit capture, unbound review, exact JSON download and undo')
 }finally{await browser?.close();await h?.close();await edge.close()}
}

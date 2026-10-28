import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

export async function performanceBrowser(){
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs'),{salesFixture}=await import('./performance-fixture.mjs')
 let h,edge,browser,context
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  edge=await browserEdge();h=await harness({entry:'dist/server/index.js',origin:edge.origin,assetsDirectory:'./dist/client'});edge.attach(h)
  const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
  const f=await salesFixture(h)
  context=await browser.newContext({viewport:{width:1440,height:900},ignoreHTTPSErrors:true})
  await context.addCookies([{name:h.owner.split('=')[0],value:h.owner.slice(h.owner.indexOf('=')+1),url:h.origin}])
  const page=await context.newPage();await page.goto(h.origin+'/app?view=sales-performance')
  assert.equal(await page.locator('[data-performance-count]').innerText(),'100 decided proposals.');assert.match(await page.locator('[data-performance-total]').innerText(),/2,000.00/)
  await page.getByLabel('Group by',{exact:true}).selectOption('service');await page.getByRole('button',{name:'Filter sales performance',exact:true}).click()
  assert.equal(await page.locator('[data-performance-group]').count(),2);assert.match(await page.locator('[data-performance-group]').first().innerText(),/50.00%/)
  const capture=async name=>{
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:900})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,name+' fits '+width)
    const small=await page.locator('main').evaluate(root=>[...root.querySelectorAll('*')].filter(e=>e.children.length===0&&e.textContent.trim()&&e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<13).map(e=>({tag:e.tagName,classes:e.className,text:e.textContent.slice(0,80),size:getComputedStyle(e).fontSize})))
    assert.deepEqual(small,[],name+' readable text at '+width)
    if(process.env.PLATTER_SCREENSHOTS){await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`performance-${name}-${width}.png`),fullPage:true});if(['suggestion','applied'].includes(name))await page.locator('[data-price-suggestion]').screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`performance-${name}-detail-${width}.png`)})}
   }
   await page.setViewportSize({width:1440,height:900})
  }
  await capture('report')
  await page.goto(h.origin+'/app/proposal?id='+f.draft.id)
  const suggestion=page.locator('[data-price-suggestion]');assert.equal(await suggestion.count(),1);assert.match(await suggestion.innerText(),/50 proposals/);assert.equal(await suggestion.getByRole('link').count(),3);assert.match(await suggestion.locator('[data-current-price]').innerText(),/123.45/)
  for(const link of await suggestion.getByRole('link').all())assert.match(await link.getAttribute('href'),/^\/app\/proposal\?id=synthetic-platter-history-/)
  // Every control in the new panels has visible text, including the explicit apply action.
  for(const button of await page.locator('button').all())if(await button.isVisible()&&!/[a-z0-9]/i.test(await button.innerText())){const tip=await button.getAttribute('aria-describedby');assert.ok(tip,'icon control describes its tooltip');await button.focus();assert.equal(await page.locator('#'+tip).isVisible(),true,'keyboard focus reveals the tooltip immediately')}
  await capture('suggestion')
  await suggestion.getByRole('button',{name:'Apply suggested price',exact:true}).click()
  assert.match(await page.locator('[data-current-price]').innerText(),/2,500.00/)
  const after=(await h.state()).proposals.find(p=>p.id===f.draft.id);assert.equal(after.options[0].cents,500000)
  await capture('applied')
  await page.goto(h.origin+'/app/clients')
  const agency=page.locator('.client-card').filter({has:page.getByRole('heading',{name:'Synthetic Agency',exact:true})})
  await agency.getByLabel('Client segment',{exact:true}).fill('Agency')
  await agency.getByRole('button',{name:'Save segment',exact:true}).click()
  assert.equal((await h.state()).clients.find(c=>c.id===f.clients[0].id).segment,'Agency')
  await capture('clients')
 }finally{await context?.close();await browser?.close();await h?.close();await edge?.close()}
}

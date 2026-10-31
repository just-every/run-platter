import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'
import { bulkFixture } from './bulk-drafts-fixture.mjs'

export async function bulkDraftBrowser(width=1440){
 let app,browser
 try{
  app=await installedApp({scheduled:true})
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage()
  const request=context.request
  const bootstrap=await request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic bulk owner'},maxRedirects:0})
  assert.equal(bootstrap.status(),303)
  await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  const h={
   cmd:async(name,input)=>{const r=await request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()},
   state:async()=>{const r=await request.get(app.origin+'/api/platter/state');assert.equal(r.status(),200);return r.json()},
  }
  const fixture=await bulkFixture(h),screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  const capture=async stage=>{if(screenshots)await page.screenshot({path:join(screenshots,'bulk-'+width+'-'+stage+'.png'),fullPage:true})}
  await page.goto(app.origin+'/app')
  await page.getByText('Start multiple drafts',{exact:true}).click()
  await page.getByRole('link',{name:'Open bulk drafts',exact:true}).click()
  await page.getByLabel('Template',{exact:true}).selectOption(fixture.template.id)
  await page.getByRole('button',{name:'Choose template',exact:true}).click()
  await page.getByLabel('Client CSV',{exact:true}).fill(fixture.csv)
  await capture('csv')
  await page.getByRole('button',{name:'Preview bulk drafts',exact:true}).click()
  const reviewed=page.locator('section').filter({has:page.getByRole('heading',{name:'Reviewed bulk drafts',exact:true})})
  if(width===1440){
   assert.match(await reviewed.innerText(),/40 rows · 35 eligible · 5 held · 0 drafts created/)
   assert.match(await reviewed.getByRole('article',{name:'Sample bulk draft'}).innerText(),/Plan for Project 1/)
   assert.match(await reviewed.getByRole('article',{name:'Sample bulk draft'}).innerText(),/\$1,000.17 USD/)
   assert.equal(await reviewed.getByRole('list',{name:'Held rows'}).locator('li').count(),5)
   assert.ok((await h.state()).proposals.every(p=>p.id===fixture.prepared.id),'preview writes no drafts')
  }
  await capture('preview')
  const batchId=await reviewed.locator('input[name=id]').inputValue()
  await reviewed.getByRole('checkbox').check();await reviewed.getByRole('button',{name:'Create reviewed drafts',exact:true}).click()
  if(width===1440)assert.match(await reviewed.innerText(),/5 drafts created/)
  await capture('apply')
  // Leave the page and resume only from the retained batch link.
  await page.goto(app.origin+'/app/bulk-drafts')
  await page.getByRole('link',{name:'Open batch '+batchId.slice(0,8),exact:true}).click()
  if(width===1440)assert.match(await reviewed.innerText(),/5 drafts created/)
  await capture('resume')
  for(let step=0;step<6;step++){
   await reviewed.getByRole('checkbox').check()
   await reviewed.getByRole('button',{name:'Continue reviewed drafts',exact:true}).click()
  }
  if(width===1440){
   assert.match(await reviewed.innerText(),/40 rows · 35 eligible · 5 held · 35 drafts created/)
   assert.equal(await reviewed.getByRole('link',{name:/^Open draft \d+$/}).count(),35)
   assert.equal(await reviewed.getByRole('button',{name:'Continue reviewed drafts',exact:true}).count(),0)
   const state=await h.state(),drafts=state.proposals.filter(p=>p.id!==fixture.prepared.id)
   assert.equal(drafts.length,35);assert.ok(drafts.every(p=>p.status==='draft'&&!p.approved_by&&!p.share))
   assert.deepEqual(drafts.map(p=>p.options[0].cents).sort((a,b)=>a-b),Array.from({length:35},(_,i)=>100017+i*100))
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
   const tiny=await reviewed.locator('p,label,li,button,h3,h4,code').evaluateAll(nodes=>nodes.filter(node=>parseFloat(getComputedStyle(node).fontSize)<13).map(node=>node.textContent))
   assert.deepEqual(tiny,[])
  }
  await capture('completed')
  console.log('PROBE RENEW-001 browser '+width+': compiled preview, apply and reopened resume -> 35 drafts, five held rows')
  await context.close()
 }finally{await browser?.close();await app?.close()}
}

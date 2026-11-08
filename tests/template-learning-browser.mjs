import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { harness } from './harness.mjs'
import { learningFixture, learningBusiness } from './template-learning-fixture.mjs'

export async function learningBrowser(){
 const h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client'}),screenshots=process.env.PLATTER_SCREENSHOTS
 let browser
 try{
  await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})
  const fixture=await learningFixture(h,{size:40}),before=await learningBusiness(h)
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({viewport:{width:1440,height:900}})
  const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}])
  const page=await context.newPage();await page.goto(h.origin+'/app/template-learning')
  await page.getByRole('group',{name:'Baseline cohort'}).getByLabel('Template version').selectOption(JSON.stringify({templateId:fixture.templateId,version:1}))
  await page.getByRole('group',{name:'Baseline cohort'}).getByLabel('Offered package count').fill('2')
  await page.getByRole('group',{name:'Comparison cohort'}).getByLabel('Template version').selectOption(JSON.stringify({templateId:fixture.templateId,version:2}))
  await page.getByRole('group',{name:'Comparison cohort'}).getByLabel('Offered package count').fill('3')
  await page.getByRole('button',{name:'Compare cohorts'}).click()
  const reportUrl=page.url(),id=new URL(reportUrl).searchParams.get('id');assert.ok(id)
  const baseline=page.getByRole('region',{name:'Baseline result'}),comparison=page.getByRole('region',{name:'Comparison result'})
  assert.match(await baseline.innerText(),/20 distinct decided proposals/);assert.match(await baseline.innerText(),/30\.0%/)
  assert.match(await comparison.innerText(),/20 distinct decided proposals/);assert.match(await comparison.innerText(),/70\.0%/)
  assert.match(await baseline.innerText(),/Signed wins\s+4/);assert.match(await comparison.innerText(),/Recorded won overrides\s+4/)
  const diff=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Proposed template diff',exact:true})})
  assert.match(await diff.innerText(),/Partnership/);assert.match(await diff.innerText(),/3,000\.00/)
  assert.equal(await page.getByRole('button',{name:/apply|accept/i}).count(),0)
  const capture=async(name,width)=>{
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(r))})
   if(width===1440){
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits viewport')
    assert.deepEqual(await page.locator('main').evaluate(main=>[...main.querySelectorAll('button,a,input,select,label,p,dt,dd,li,legend')].filter(el=>getComputedStyle(el).display!=='none'&&parseFloat(getComputedStyle(el).fontSize)<13).map(el=>el.tagName)),[])
   }
   if(screenshots){await mkdir(screenshots,{recursive:true});await page.screenshot({path:join(screenshots,'AGENT-007-'+name+'-'+width+'.png'),fullPage:true})}
  }
  await capture('recommendation',1440)
  await page.getByText('Baseline sources · 20',{exact:true}).click()
  const sourceLink=page.locator('a[href$="source='+fixture.ids[0]+'"]');await sourceLink.click()
  const source=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Decision revision',exact:true})})
  assert.match(await source.innerText(),/revision 3/);assert.match(await source.innerText(),/Essentials/);assert.match(await source.innerText(),/1,000\.00/);assert.doesNotMatch(await source.innerText(),/Partnership/)
  await capture('source',1440)
  // Functional assertions run at one width; the same changed screens are shown at phone width.
  await page.setViewportSize({width:390,height:900});await capture('source',390)
  await page.goto(reportUrl);await capture('recommendation',390)
  assert.deepEqual(await learningBusiness(h),before,'browser comparison and inspection grant no execution and preserve business facts')
  console.log('PROBE AGENT-007 browser: compiled comparison and exact revision inspection -> desktop assertions pass; recommendation and source shown at 1440 and 390')
  await context.close()
 }finally{await browser?.close();await h.close()}
}

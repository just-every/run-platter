import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'
export async function trackingBrowser(){
 let app,browser
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLATTER_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  if(process.env.PLATTER_SCREENSHOTS)await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const owner=await browser.newContext({viewport:{width,height:900}}),client=await browser.newContext({viewport:{width,height:900},userAgent:width===390?'iPhone Mobile':'Desktop'})
   try{
    const page=await owner.newPage(),command=async(name,input)=>{const r=await owner.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const capture=async(p,name)=>{await p.evaluate(()=>document.fonts.ready);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(process.env.PLATTER_SCREENSHOTS){await p.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`TRACK-${name}-${width}.png`),fullPage:true});if(['settings','timeline'].includes(name))await p.locator('section.panel').filter({has:p.getByRole('heading',{name:name==='settings'?'Engagement privacy':'Engagement timeline',exact:true})}).screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`TRACK-${name}-panel-${width}.png`)})}}
    assert.equal((await owner.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.goto(app.origin+'/app/settings');await page.getByLabel('Measure client views').selectOption('yes');await page.getByLabel('Open alerts',{exact:true}).selectOption('yes');await page.getByLabel('I authorize measuring client views and the selected alerts.').check();await page.getByRole('button',{name:'Save engagement settings'}).click();assert.equal(await page.getByLabel('Retention in days').inputValue(),'90');await capture(page,'settings')
    const c=await command('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),p=await command('proposal.prepare',{clientId:c.id,title:'Synthetic tracking offer',scope:'Studio photography',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
    await command('proposal.approve',{id:p.id,version:1,revision:1});const share=await command('proposal.send',{id:p.id,version:2})
    const publicPage=await client.newPage(),hosts=new Set();publicPage.on('request',r=>hosts.add(new URL(r.url()).origin));await publicPage.goto(share.shareUrl)
    assert.ok(await publicPage.getByRole('heading',{name:'View privacy'}).isVisible());assert.match(await publicPage.locator('main').innerText(),/Views of this page are measured/);assert.deepEqual([...hosts],[app.origin]);await capture(publicPage,'client')
    await page.locator('[data-tracking-notices]').getByText(/First open/).waitFor({timeout:15000});assert.match(await page.locator('[data-tracking-notices]').innerText(),/Synthetic tracking offer/);assert.ok(!(await page.locator('[data-tracking-notices]').innerText()).includes('avery@northstar.example'));await capture(page,'live-notice')
    await page.goto(app.origin+'/app/proposal?id='+p.id);const timeline=page.getByRole('list',{name:'Engagement timeline',exact:true});assert.match(await timeline.innerText(),/Unverified link view/);assert.match(await timeline.innerText(),width===390?/phone/:/desktop/);assert.match(await page.getByRole('list',{name:'Open alerts',exact:true}).innerText(),/First open/);await capture(page,'timeline')
    // Existing icon controls use the shared delayed tooltip; textual controls need none.
    for(const button of await page.locator('button').all()){const label=(await button.innerText()).trim();if(await button.isVisible()&&!/[\p{L}\p{N}]/u.test(label)){const tooltip=button.locator('..').getByRole('tooltip');assert.equal(await tooltip.count(),1);await button.focus();assert.ok(await tooltip.isVisible());await button.hover();await page.waitForTimeout(350);assert.ok(await tooltip.isVisible())}}
    await page.goto(app.origin+'/app?status=viewed');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.match(await page.locator('[data-pipeline-total="USD"]').innerText(),/4,200/);await capture(page,'pipeline')
    await page.goto(app.origin+'/app/proposal?id='+p.id);await page.getByLabel('Hold reason').fill('Pending dispute');await page.getByRole('button',{name:'Hold engagement data'}).click();assert.ok(await page.getByRole('button',{name:'Erase engagement data'}).isDisabled());await page.getByRole('button',{name:'Release engagement hold'}).click();await page.getByRole('button',{name:'Erase engagement data'}).click();assert.equal(await page.getByRole('list',{name:'Engagement timeline',exact:true}).count(),0)
   }finally{await owner.close();await client.close();await app.close();app=null}
  }
 }finally{await browser?.close();await app?.close()}
}

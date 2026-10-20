import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'
import { pricingFixture, pricingExpected } from './pricing-fixture.mjs'
import { pdfPages } from './pdf-document.mjs'

export async function pricingJourney() {
 let browser,app
 try {
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),headers={origin:app.origin}
    const claimed=await context.request.post(app.origin+'/auth/bootstrap',{headers,data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0});assert.equal(claimed.status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const response=await context.request.post(app.origin+'/api/platter/command',{headers,data:{name,input}});assert.equal(response.status(),200,await response.text());return response.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    await page.goto(app.origin+'/app')
    await page.locator('[name=clientId]').selectOption(client.id)
    for(const [name,value]of Object.entries({title:'Northstar brand and support',scope:'Brand strategy, delivery and retained support.',optionOne:'Project and support',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'}))await page.locator(`[name=${name}]`).fill(value)
    const packageEditor=page.locator('[data-pricing-option=one]')
    for(const fixture of pricingFixture()){
     await packageEditor.getByRole('button',{name:'Add table',exact:true}).click()
     const table=packageEditor.locator('[data-pricing-table]').last()
     await table.locator(':scope > label > [data-pricing-field=name]').fill(fixture.name)
     for(let i=0;i<fixture.lines.length;i++){
      if(i)await table.getByRole('button',{name:'Add line item',exact:true}).click()
      const line=table.locator('[data-pricing-line]').last()
      for(const field of ['name','description','quantity','unit','unitPrice','group'])await line.locator(`[data-pricing-field=${field}]`).fill(fixture.lines[i][field])
     }
    }
    const capture=async(name)=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} fits ${width}`);if(screenshots)await page.screenshot({path:join(screenshots,`PRICE-001-${name}-${width}.png`),fullPage:true})}
    await capture('editor')
    await page.getByRole('button',{name:'Prepare proposal',exact:true}).click()
    await page.getByRole('link',{name:'Northstar brand and support',exact:true}).click()
    assert.match(await page.locator('[data-pricing-display]').innerText(),/Package grand total: \$403\.89 USD/)
    await capture('saved')
    const state=await (await context.request.get(app.origin+'/api/platter/state')).json(),p=state.proposals.find(p=>p.title==='Northstar brand and support')
    assert.equal(p.options[0].cents,pricingExpected.grandCents)
    await page.reload();assert.equal(await page.locator('[data-pricing-table]').count(),2)
    // Edit one quantity through the real editor, then restore its original value.
    const quantity=page.locator('[data-pricing-line]').first().locator('[data-pricing-field=quantity]')
    await quantity.fill('2');await page.getByRole('button',{name:'Save revision',exact:true}).click()
    assert.match(await page.locator('[data-pricing-display]').innerText(),/408\.89/)
    await page.getByRole('button',{name:'Restore revision 1',exact:true}).click()
    assert.match(await page.locator('[data-pricing-display]').innerText(),/403\.89/)
    await page.getByRole('link',{name:'Preview client page',exact:true}).click()
    const frame=page.frameLocator('iframe')
    assert.match(await frame.locator('[data-pricing-display]').innerText(),/403\.89/)
    await capture('preview')
    await page.goto(app.origin+'/app/proposal?id='+p.id)
    await page.getByRole('button',{name:'Approve this revision',exact:true}).click();await page.getByRole('button',{name:'Send approved proposal',exact:true}).click()
    const live=await (await context.request.get(app.origin+'/api/platter/state')).json(),row=live.proposals.find(x=>x.id===p.id),path='/p/'+row.shareToken
    const clientContext=await browser.newContext({viewport:{width,height:900}}),clientPage=await clientContext.newPage()
    try{
     await clientPage.goto(app.origin+path)
     assert.match(await clientPage.locator('[data-pricing-display]').innerText(),/403\.89/)
     await clientPage.getByRole('button',{name:'Send verification code',exact:true}).click()
     const mail=await (await context.request.get(app.origin+'/api/platter/state')).json(),code=mail.outbox.find(m=>m.proposal_id===p.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
     await clientPage.locator('[name=code]').fill(code);await clientPage.getByRole('button',{name:'Verify email',exact:true}).click()
     await clientPage.getByRole('radio').first().check()
     const download=await clientContext.request.get(app.origin+path+'/download.pdf?optionId=one');assert.equal(download.status(),200)
     const content=(await pdfPages(await download.body())).join(' ');for(const value of ['403.89','330.03','73.86','100.97'])assert.ok(content.includes(value))
     for(const table of pricingFixture())for(const line of table.lines)assert.ok(content.includes(line.description))
     assert.ok(await clientPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
     if(screenshots)await clientPage.screenshot({path:join(screenshots,`PRICE-001-client-${width}.png`),fullPage:true})
     await clientPage.locator('[name=name]').fill('Avery Chen');await clientPage.locator('[name=consent]').check();await clientPage.getByRole('button',{name:'Accept proposal',exact:true}).click()
     assert.match(await clientPage.locator('main').innerText(),/Proposal accepted/);assert.match(await clientPage.locator('[data-pricing-display]').innerText(),/403\.89/)
     if(screenshots)await clientPage.screenshot({path:join(screenshots,`PRICE-001-accepted-${width}.png`),fullPage:true})
    }finally{await clientContext.close()}
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await app?.close();await browser?.close()}
}

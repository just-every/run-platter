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
    if(screenshots){await packageEditor.locator('[data-pricing-table]').first().locator('[data-pricing-field=name]').first().scrollIntoViewIfNeeded();await page.screenshot({path:join(screenshots,`PRICE-001-editor-detail-${width}.png`)})}
    await page.getByRole('button',{name:'Prepare proposal',exact:true}).click()
    await page.getByRole('link',{name:'Northstar brand and support',exact:true}).click()
    assert.match(await page.locator('[data-pricing-display]').innerText(),/Package grand total: \$403\.89 USD/)
    await capture('saved')
    if(screenshots){await page.locator('[data-pricing-display] h4').first().scrollIntoViewIfNeeded();await page.screenshot({path:join(screenshots,`PRICE-001-saved-detail-${width}.png`)})}
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
    if(width===390){await page.getByLabel('Preview width').selectOption('390');await page.getByRole('button',{name:'Change preview width'}).click()}
    const frame=page.frameLocator('iframe')
    assert.match(await frame.locator('[data-pricing-display]').innerText(),/403\.89/)
    await frame.locator('[data-pricing-display] h4').first().scrollIntoViewIfNeeded()
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
     if(screenshots){await clientPage.locator('[data-pricing-display] h4').first().scrollIntoViewIfNeeded();await clientPage.screenshot({path:join(screenshots,`PRICE-001-client-detail-${width}.png`)})}
     await clientPage.locator('[name=name]').fill('Avery Chen');await clientPage.locator('[name=consent]').check();await clientPage.getByRole('button',{name:'Accept proposal',exact:true}).click()
     assert.match(await clientPage.locator('main').innerText(),/Proposal accepted/);assert.match(await clientPage.locator('[data-pricing-display]').innerText(),/403\.89/)
     if(screenshots){await clientPage.screenshot({path:join(screenshots,`PRICE-001-accepted-${width}.png`),fullPage:true});await clientPage.getByRole('heading',{name:'Proposal accepted',exact:true}).scrollIntoViewIfNeeded();await clientPage.screenshot({path:join(screenshots,`PRICE-001-accepted-detail-${width}.png`)})}
    }finally{await clientContext.close()}
    // Exercise the discount controls through the compiled editor at both widths.
    const discounted=await cmd('proposal.prepare',{clientId:client.id,title:'Discounted services',scope:'Public scope',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'2500'}],pricingTables:[{optionId:'main',name:'Services',lines:[{name:'Brand strategy',quantity:'1',unit:'project',unitPrice:'1000',group:'Delivery'},{name:'Campaign rollout',quantity:'1',unit:'project',unitPrice:'1000',group:'Delivery'},{name:'Usage licence',quantity:'1',unit:'project',unitPrice:'500'}]}]})
    await page.goto(app.origin+'/app/proposal?id='+discounted.id)
    await page.locator('[data-package-field=discountAmount]').fill('500')
    await page.locator('[data-pricing-field=groupDiscountPercent]').first().fill('10')
    await page.locator('[data-package-field=discountExpiresOn]').fill('2099-05-01')
    await page.getByRole('button',{name:'Save revision',exact:true}).click()
    let discountState=await(await context.request.get(app.origin+'/api/platter/state')).json(),discountRow=discountState.proposals.find(p=>p.id===discounted.id)
    assert.equal(discountRow.options[0].cents,180000)
    const assertDiscountSummary=async()=>{
     assert.equal(await page.locator('[data-sum-price=main]').innerText(),'$1,800.00')
     assert.equal(await page.locator('[data-sum-deposit=main]').innerText(),'$450.00')
     assert.equal(await page.locator('[data-package-id=main] [data-line=deposit]').innerText(),'$450.00')
     assert.equal(await page.locator('[data-package-id=main] [data-line=balance]').innerText(),'$1,350.00')
    }
    await assertDiscountSummary()
    await page.locator('[data-package-field=discountAmount]').fill('600')
    assert.equal(await page.locator('[data-sum-price=main]').innerText(),'$1,700.00')
    assert.equal(await page.locator('[data-sum-deposit=main]').innerText(),'$425.00')
    await page.locator('[data-package-field=discountAmount]').fill('500.00');await assertDiscountSummary()
    assert.equal(await page.locator('[data-package-field=discountAmount]').inputValue(),'500.00')
    assert.equal(await page.locator('[data-pricing-field=groupDiscountPercent]').first().inputValue(),'10')
    await capture('discount-editor')
    if(screenshots){await page.locator('[data-package-id=main]').scrollIntoViewIfNeeded();await page.screenshot({path:join(screenshots,`PRICE-004-editor-viewport-${width}.png`)})}
    if(screenshots)await page.getByRole('region',{name:'Offer summary',exact:true}).screenshot({path:join(screenshots,`PRICE-004-editor-summary-${width}.png`)})
    await page.getByRole('button',{name:'Approve this revision',exact:true}).click()
    await assertDiscountSummary();await capture('discount-approved')
    if(screenshots){await page.locator('[data-package-id=main]').scrollIntoViewIfNeeded();await page.screenshot({path:join(screenshots,`PRICE-004-approved-viewport-${width}.png`)})}
    if(screenshots)await page.getByRole('region',{name:'Offer summary',exact:true}).screenshot({path:join(screenshots,`PRICE-004-approved-summary-${width}.png`)})
    await page.locator('[data-pricing-field=discountPercent]').first().fill('20')
    await page.locator('[data-pricing-field=discountAmount]').first().fill('10')
    await page.locator('[data-package-field=showDiscount]').selectOption('no')
    await page.getByRole('button',{name:'Save revision',exact:true}).click()
    discountState=await(await context.request.get(app.origin+'/api/platter/state')).json();discountRow=discountState.proposals.find(p=>p.id===discounted.id);assert.equal(discountRow.options[0].cents,161100)
    assert.equal(await page.locator('[data-sum-price=main]').innerText(),'$1,611.00')
    assert.equal(await page.locator('[data-sum-deposit=main]').innerText(),'$402.75')
    await page.getByRole('button',{name:'Approve this revision',exact:true}).click();await page.getByRole('button',{name:'Send approved proposal',exact:true}).click()
    await page.getByRole('link',{name:'Open client proposal',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/1,611[.]00/);assert.doesNotMatch(await page.locator('main').innerText(),/Package discount:|Package discounts|Unit price/)
    assert.match(await page.locator('main').innerText(),/2099-05-01/);await capture('discount-client')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await app?.close();await browser?.close()}
}

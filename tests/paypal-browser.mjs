import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { harness } from './harness.mjs'
import { browserEdge } from './browser-edge.mjs'
import { captureRuntimeLog } from './instrument-scan.mjs'
import { paypalFixture, paypalToken, paypalMerchant, paypalWebhook } from './paypal-fixture.mjs'
import { preparePaypalAgreement, verifyPaypalSigner, inspectPaypalReservations, assertPaypalSanitized } from './paypal-journey.mjs'

export async function paypalBrowser(){
 const screenshots=process.env.PLATTER_SCREENSHOTS,log=captureRuntimeLog()
 let browser
 try{
  if(screenshots)await mkdir(screenshots,{recursive:true})
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  for(const width of [1440,390]){
   const edge=await browserEdge(),fake=paypalFixture()
   let h,context
   try{
    h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,outboundService:fake.outboundService});edge.attach(h)
    inspectPaypalReservations(h,fake)
    context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
    const putCookie=async cookie=>{const [name,value]=cookie.split('=');await context.addCookies([{name,value,url:h.origin}])}
    await putCookie(h.owner)
    const page=await context.newPage()
    const capture=async phase=>{
     await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))})
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'PayPal page has no horizontal overflow at '+width)
     if(screenshots){
      await page.screenshot({path:join(screenshots,'PAY-009-'+phase+'-'+width+'.png'),fullPage:true})
      const panels=page.locator('section.panel').filter({has:page.getByRole('heading',{name:/^(Deposit collection|Deposit due|Deposit paid|PayPal approval confirmed|Deposit awaiting confirmation|Payments and refunds)/})})
      for(let index=0;index<await panels.count();index++)await panels.nth(index).screenshot({path:join(screenshots,'PAY-009-'+phase+'-'+width+'-panel-'+index+'.png')})
      const merchant=page.locator('article').filter({has:page.getByRole('heading',{name:'PayPal',exact:true})});if(await merchant.count())await merchant.screenshot({path:join(screenshots,'PAY-009-'+phase+'-'+width+'-merchant.png')})
     }
    }
    await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.goto(h.origin+'/app/settings')
    const connection=page.locator('article').filter({has:page.getByRole('heading',{name:'PayPal',exact:true})})
    await connection.getByLabel('PayPal access token',{exact:true}).fill(paypalToken)
    await connection.getByLabel('PayPal merchant id',{exact:true}).fill(paypalMerchant)
    await connection.getByLabel('PayPal webhook id',{exact:true}).fill(paypalWebhook)
    await connection.getByRole('checkbox').check();await connection.getByRole('button',{name:'Connect PayPal',exact:true}).click()
    assert.equal(await page.getByRole('alert').count(),0);assert.match(await connection.innerText(),/connected/)
    await capture('settings')
    let p=await preparePaypalAgreement(h,async draft=>{
     await page.goto(h.origin+'/app/proposal?id='+draft.id)
     await capture('draft')
     const policy=page.locator('form[action*="payment.collection"]')
     assert.equal(await policy.count(),1,'Deposit collection form is present: '+JSON.stringify({headings:await page.getByRole('heading').allTextContents(),alerts:await page.getByRole('alert').allTextContents()}))
     await policy.getByLabel('Acceptance and deposit',{exact:true}).selectOption('required')
     await policy.getByLabel('Deposit payment provider',{exact:true}).selectOption('paypal')
     assert.equal(await policy.locator('[name="merchantId"]').inputValue(),paypalMerchant)
     assert.equal(await policy.locator('[name="connectionVersion"]').inputValue(),'1')
     await policy.locator('[name="consent"]').check()
     await policy.getByRole('button',{name:'Save deposit collection',exact:true}).click()
     assert.equal(await page.getByRole('alert').count(),0)
     await capture('selection')
    })
    p=await verifyPaypalSigner(h,p);await putCookie(p.cookie)
    await page.goto(h.origin+p.path)
    const acceptance=page.locator('form').filter({has:page.getByRole('button',{name:/Accept.*proposal|Accept selected option/i})}).first()
    await acceptance.locator('[name="name"]').fill('Synthetic PayPal signer')
    await acceptance.locator('[name="optionId"][value="one"]').check()
    await acceptance.locator('[name="consent"]').check()
    await acceptance.getByRole('button').filter({hasText:/Accept/i}).click()
    await page.getByRole('heading',{name:/waiting for payment/}).waitFor()
    await capture('signed')
    // Replace only PayPal's hosted surface. The application and its transport stay real.
    await context.route('https://www.paypal.com/**',async route=>{
     const url=new URL(route.request().url()),id=url.searchParams.get('token'),order=fake.orders.get(id)
     assert.equal(url.pathname,'/checkoutnow');assert.ok(order,'Hosted approval uses the actual created order')
     const call=fake.calls.find(c=>c.method==='POST'&&new URL(c.url).pathname==='/v2/checkout/orders'&&c.body.purchase_units[0].reference_id===order.purchase_units[0].reference_id)
     const returnUrl=call.body.payment_source.paypal.experience_context.return_url
     if(url.searchParams.get('synthetic-approved')==='yes'){
      fake.approve(id);await route.fulfill({status:302,headers:{location:returnUrl}});return
     }
     const approved=new URL(url);approved.searchParams.set('synthetic-approved','yes')
     await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>PayPal synthetic approval</title></head><body><main><h1>Approve one-time PayPal deposit</h1><p>600.00 USD</p><a href="'+approved.href.replaceAll('&','&amp;')+'">Approve deposit on PayPal</a></main></body></html>'})
    })
    await page.locator('[data-paypal-prepare] [name="consent"]').check()
    await page.getByRole('button',{name:'Continue to PayPal approval',exact:true}).click()
    await page.waitForURL('https://www.paypal.com/**')
    await page.getByRole('heading',{name:'Approve one-time PayPal deposit',exact:true}).waitFor()
    await capture('hosted-approval')
    assert.equal(fake.captures.size,0)
    await page.getByRole('link',{name:'Approve deposit on PayPal',exact:true}).click()
    await page.waitForURL(h.origin+p.path+'**')
    const refresh=page.getByRole('button',{name:'Refresh PayPal payment status',exact:true})
    await refresh.click()
    const pay=page.locator('[data-paypal-capture]')
    await pay.waitFor()
    assert.equal(fake.captures.size,0,'Return and approval never capture the deposit')
    assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_records WHERE proposal_id=?').bind(p.id).first()).n,0)
    await capture('approved')
    await pay.locator('[name="consent"]').check()
    await pay.getByRole('button',{name:/Pay .* deposit/}).click()
    await page.getByRole('heading',{name:'Deposit paid',exact:true}).waitFor()
    await page.getByRole('heading',{name:'Proposal accepted',exact:true}).waitFor()
    assert.equal(fake.captures.size,1)
    const moneyWrites=fake.calls.filter(c=>c.method==='POST'&&new URL(c.url).pathname.endsWith('/capture'))
    assert.equal(moneyWrites.length,1)
    assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_records WHERE proposal_id=?').bind(p.id).first()).n,1)
    await capture('paid')
    await page.goto(h.origin+'/app/proposal?id='+p.id)
    const refund=page.locator('form[action*="payment.refund"]')
    await refund.getByLabel('Refund amount',{exact:true}).fill('300.00')
    await refund.getByLabel('Refund reason',{exact:true}).fill('Synthetic agreed half refund')
    await refund.getByRole('checkbox').check()
    await refund.getByRole('button',{name:'Refund PayPal deposit',exact:true}).click()
    assert.equal(await page.getByRole('alert').count(),0)
    assert.equal(fake.refunds.size,1)
    const refunded=fake.calls.filter(c=>c.method==='POST'&&new URL(c.url).pathname.endsWith('/refund'))
    assert.equal(refunded.length,1);assert.deepEqual(refunded[0].body.amount,{currency_code:'USD',value:'300.00'})
    assert.equal((await h.db.prepare('SELECT cents,status FROM p_refunds WHERE payment_id IN (SELECT id FROM p_payment_records WHERE proposal_id=?)').bind(p.id).first()).cents,30000)
    await capture('refund')
    await assertPaypalSanitized(h,log)
   }finally{await context?.close();await h?.close();await edge.close()}
  }
 }finally{try{await browser?.close()}finally{log.stop()}}
}

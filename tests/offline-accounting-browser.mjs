import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { allocationAgreement } from './payment-allocation-fixture.mjs'

export async function offlineInvoiceBrowser({h,page,browser,panel,milestone,capture}) {
 await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-01T12:00:00Z'),cron:'*/15 * * * *'})
 const agreement=await allocationAgreement(h,{paymentTerms:{netDays:30,milestones:[{label:'Delivered scope',date:'2030-06-01',percent:100}]}})
 await page.goto(h.origin+'/app/proposal?id='+agreement.id)
 const prepare=milestone.locator('form').filter({has:page.getByRole('button',{name:'Prepare accounting invoice',exact:true})})
 await prepare.getByLabel('QuickBooks customer id',{exact:true}).fill('synthetic-platter-customer-1');await prepare.getByLabel('QuickBooks service item id').fill('synthetic-platter-item-1');await prepare.getByLabel('Invoice remittance instructions').fill('Send a check to Synthetic Studio, 100 Example Street. Reference the invoice number.');await prepare.getByRole('checkbox').check();await prepare.getByRole('button').click();await page.waitForLoadState('load')
 const review=milestone.locator('[data-invoice-review]');assert.match(await review.innerText(),/Synthetic reviewed customer[\s\S]*Synthetic reviewed service[\s\S]*\$700\.00 USD · Issued 2030-06-01 · Due 2030-07-01/)
 const issue=review.locator('form').filter({has:page.getByRole('button',{name:'Issue reviewed invoice',exact:true})});await issue.getByRole('checkbox').check();await issue.getByRole('button',{name:'Issue reviewed invoice'}).click();await page.waitForLoadState('load')
 assert.match(await milestone.locator('[data-accounting-invoice]').innerText(),/SYN-ISSUED-1 · due/)
 const record=panel.locator('form').filter({has:page.getByRole('button',{name:'Record received payment',exact:true})})
 await record.getByLabel('Payment method').selectOption('check');await record.getByLabel('Amount received').fill('700');await record.getByLabel('Payment reference').fill('Synthetic check 123');await record.getByLabel('Payment received on').fill('2030-06-01');await record.getByRole('checkbox').check();await record.getByRole('button').click();await page.waitForLoadState('load')
 const allocate=milestone.locator('form').filter({has:page.getByRole('button',{name:'Allocate received payment',exact:true})})
 await allocate.getByLabel('Amount to allocate').fill('700');await allocate.getByRole('checkbox').check();await allocate.getByRole('button').click();await page.waitForLoadState('load')
 const sync=milestone.locator('form').filter({has:page.getByRole('button',{name:'Sync allocated receipt',exact:true})})
 await sync.getByLabel('QuickBooks payment method id').fill('check');await sync.getByRole('checkbox').check();await sync.getByRole('button').click();await page.waitForLoadState('load')
 const share=milestone.locator('form').filter({has:page.getByRole('button',{name:'Show invoice to verified client',exact:true})});await share.getByRole('checkbox').check();await share.getByRole('button').click();await page.waitForLoadState('load')
 assert.match(await milestone.locator('[data-accounting-invoice]').innerText(),/SYN-ISSUED-1 · paid[\s\S]*Provider balance \$0\.00 USD/)
 const refresh=milestone.locator('form').filter({has:page.getByRole('button',{name:'Refresh accounting balance',exact:true})});await refresh.getByRole('checkbox').check();await refresh.getByRole('button').click();await page.waitForLoadState('load');assert.match(await milestone.innerText(),/Provider balance \$0\.00 USD/)
 await capture('issued')
 const client=await browser.newContext({viewport:{width:1440,height:1000}})
 try {
  const split=agreement.cookie.indexOf('=');await client.addCookies([{name:agreement.cookie.slice(0,split),value:agreement.cookie.slice(split+1),domain:new URL(h.origin).hostname,path:agreement.path,httpOnly:true,sameSite:'Strict'}])
  const clientPage=await client.newPage();await clientPage.goto(h.origin+agreement.path)
  const invoice=clientPage.locator('[data-client-invoice]');assert.match(await invoice.innerText(),/Invoice SYN-ISSUED-1 · paid[\s\S]*Remaining \$0\.00 USD[\s\S]*Send a check to Synthetic Studio/)
  if(process.env.PLATTER_SCREENSHOTS){await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true});for(const width of [1440,390]){await clientPage.setViewportSize({width,height:1000});await clientPage.evaluate(()=>document.fonts.ready);await invoice.scrollIntoViewIfNeeded();assert.ok(await clientPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await invoice.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'PAY-007-client-invoice-'+width+'.png')})}}
 } finally {await client.close()}
 const hide=milestone.locator('form').filter({has:page.getByRole('button',{name:'Hide invoice from client',exact:true})});await hide.getByRole('checkbox').check();await hide.getByRole('button').click();await page.waitForLoadState('load')
 assert.deepEqual((await h.send(agreement.path+'/invoices.json',undefined,agreement.cookie)).value.invoices,[])
 const event=await allocationAgreement(h,{paymentTerms:{netDays:30,milestones:[{label:'Approved delivery',event:'Client approves delivery',percent:100}]}})
 await page.goto(h.origin+'/app/proposal?id='+event.id);assert.match(await milestone.innerText(),/awaiting completion/)
 const complete=milestone.locator('form').filter({has:page.getByRole('button',{name:'Record milestone completion',exact:true})})
 await complete.getByLabel('Milestone completed on').fill('2030-06-01');await complete.getByLabel('Completion record').fill('Synthetic delivery accepted by the owner');await complete.getByRole('checkbox').check();await complete.getByRole('button').click();await page.waitForLoadState('load')
 assert.match(await milestone.innerText(),/Completed 2030-06-01 · Synthetic delivery accepted by the owner/);assert.equal(await milestone.getByRole('button',{name:'Record milestone completion'}).count(),0);await capture('event-completed')
 const recurring=await allocationAgreement(h,{depositPercent:'30',paymentTerms:null,pricingTables:[{optionId:'main',name:'Monthly care',lines:[{name:'Care',quantity:'1',unit:'month',unitPrice:'1000',interval:'monthly',term:3,startsOn:'2099-01-31'}]}]})
 await page.goto(h.origin+'/app/proposal?id='+recurring.id);assert.equal(await panel.locator('[data-payment-milestone]').count(),3);assert.match(await milestone.innerText(),/2099-01-31 · Scheduled \$100\.00 USD/);await capture('recurring')
}

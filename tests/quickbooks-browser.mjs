import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { quickbooksMoneyFixture,postStripeReceipt } from './quickbooks-money.mjs'
import { installedApp } from './site-harness.mjs'
import { acceptedQuickbooksAgreement } from './provider-network.mjs'

export async function quickbooksBrowser() {
 let app,browser,context
 const fake=quickbooksMoneyFixture()
 try {
  app=await installedApp({scheduled:true,outboundService:fake.outboundService})
  browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  context=await browser.newContext({viewport:{width:1440,height:1000}})
  const page=await context.newPage(),request=context.request,headers={origin:app.origin}
  const cmd=async(name,input)=>{const r=await request.post(app.origin+'/api/platter/command',{headers,data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
  const send=async(path,body)=>{const r=await request.fetch(app.origin+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{data:body})});return {status:r.status(),cookie:r.headers()['set-cookie'],text:await r.text()}}
  const state=async()=>{const r=await request.get(app.origin+'/api/platter/state');assert.equal(r.status(),200);return r.json()}
  assert.equal((await request.post(app.origin+'/auth/bootstrap',{headers,data:{token:app.token,displayName:'Synthetic accounting owner'},maxRedirects:0})).status(),303)
  await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  await app.fireCron(Date.parse('2030-03-01T15:00:00Z'))
  await cmd('provider.connect',{provider:'quickbooks',version:0,realmId:fake.company,token:fake.token,consent:true})
  await acceptedQuickbooksAgreement({cmd,send,state},'Browser deposit agreement')
  assert.equal(fake.invoices.size,0)
  await page.goto(app.origin+'/app/settings')
  const panel=()=>page.locator('section').filter({has:page.getByRole('heading',{name:'QuickBooks deposit invoices',exact:true})})
  assert.match(await panel().innerText(),/Not selected/)
  const authorize=panel().locator('form').filter({has:page.getByRole('button',{name:'Authorize QuickBooks invoices',exact:true})})
  await authorize.getByRole('checkbox').check();await authorize.getByRole('button').click()
  assert.match(await panel().innerText(),/Authorized/)
  await panel().getByRole('button',{name:'Find QuickBooks customers',exact:true}).click()
  assert.match(await panel().innerText(),/No exact name match/)
  await panel().getByLabel('QuickBooks deposit item ID',{exact:true}).fill(fake.item)
  await panel().getByLabel('QuickBooks income account ID',{exact:true}).fill(fake.incomeAccount)
  await panel().getByRole('button',{name:'Review deposit and schedule',exact:true}).click()
  const review=panel().getByRole('article',{name:'Reviewed QuickBooks deposit'})
  assert.match(await review.innerText(),/\$1,000\.03 USD/)
  assert.match(await review.innerText(),/\$250\.01 USD/)
  assert.match(await review.innerText(),/Consulting income/)
  assert.match(await review.innerText(),/Reviewed deposit service/)
  assert.equal(fake.invoices.size,0,'reviewing the screen cannot post an invoice')
  const capture=async name=>{
   if(!process.env.PLATTER_SCREENSHOTS)return
   await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true})
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready)
    await panel().screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'ACCT-001-'+name+'-'+width+'.png')})
   }
   await page.setViewportSize({width:1440,height:1000})
  }
  await capture('review')
  await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Queue reviewed deposit',exact:true}).click()
  assert.match(await panel().innerText(),/queued/)
  await panel().getByRole('button',{name:'Dispatch reviewed deposits',exact:true}).click()
  assert.equal(fake.customers.size,1);assert.equal(fake.invoices.size,1)
  assert.match(await panel().getByRole('list',{name:'QuickBooks deposit history'}).innerText(),/complete/)
  await panel().getByRole('button',{name:'Refresh QuickBooks balance',exact:true}).click()
  assert.match(await panel().innerText(),/Provider status: unpaid/)
  const accountingJob=(await state()).accounting.jobs[0]
  await cmd('payment.record',{id:accountingJob.proposal_id,method:'check',amount:'100.01',reference:'Browser synthetic check',receivedOn:'2030-03-02',consent:true})
  await page.goto(app.origin+'/app/settings')
  await panel().getByLabel('QuickBooks deposit account ID',{exact:true}).fill(fake.bank)
  await panel().getByRole('button',{name:'Review receipt posting',exact:true}).click()
  const paymentReview=panel().getByRole('article',{name:'Reviewed QuickBooks payment'})
  assert.match(await paymentReview.innerText(),/\$100\.01 USD/)
  assert.match(await paymentReview.innerText(),/Operating bank/)
  assert.equal(fake.payments.size,0)
  await capture('receipt-review')
  await paymentReview.getByRole('checkbox').check();await paymentReview.getByRole('button',{name:'Apply reviewed receipt',exact:true}).click()
  assert.equal(fake.payments.size,1)
  await panel().getByRole('button',{name:'Refresh QuickBooks balance',exact:true}).click()
  assert.match(await panel().innerText(),/Provider status: partially paid/)
  assert.match(await panel().innerText(),/open balance \$150\.00 USD/)
  ;[...fake.invoices.values()][0].Balance=0
  await panel().getByRole('button',{name:'Refresh QuickBooks balance',exact:true}).click()
  assert.match(await panel().innerText(),/Provider status: paid/)
  const schedule=panel().getByRole('list',{name:'QuickBooks schedule history'})
  assert.match(await schedule.innerText(),/Delivery complete/)
  assert.equal(fake.invoices.size,1)
  await schedule.getByRole('checkbox').check()
  await schedule.getByRole('button',{name:'Record milestone complete',exact:true}).click()
  await panel().getByRole('button',{name:'Dispatch reviewed deposits',exact:true}).click()
  assert.equal(fake.invoices.size,2)
  assert.equal([...fake.invoices.values()][1].TxnDate,'2030-03-01')
  assert.equal([...fake.invoices.values()][1].DueDate,'2030-03-31')
  assert.match(await schedule.innerText(),/issued 2030-03-01 · due 2030-03-31/)
  await capture('retained')
  const {configureTaxes,taxRequest,taxPackages,taxTables}=await import('./taxes-fixture.mjs')
  await configureTaxes(cmd)
  const taxed=await acceptedQuickbooksAgreement({cmd,send,state},'Browser mapped tax agreement',undefined,{packages:taxPackages(),pricingTables:taxTables(),tax:taxRequest(),paymentTerms:null})
  await page.goto(app.origin+'/app/settings')
  await panel().getByLabel('Accepted agreement',{exact:true}).selectOption(taxed.proposal.id)
  await panel().getByRole('button',{name:'Find QuickBooks customers',exact:true}).click()
  const mapping=panel().getByRole('article',{name:'QuickBooks line mappings'})
  for(const name of ['Taxable services','Non-taxable services']){
   await mapping.getByLabel('Item ID for '+name,{exact:true}).fill(fake.item)
   await mapping.getByLabel('Income account ID for '+name,{exact:true}).fill(fake.incomeAccount)
  }
  await mapping.getByLabel('QuickBooks sales tax group ID',{exact:true}).fill(fake.taxGroup)
  await mapping.getByRole('button',{name:'Review mapped invoice',exact:true}).click()
  assert.match(await review.innerText(),/\$395\.63 USD/)
  assert.match(await review.innerText(),/\$82\.50 USD/)
  await capture('mapped-tax-review')
  await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Queue reviewed deposit',exact:true}).click()
  await panel().getByRole('button',{name:'Dispatch reviewed deposits',exact:true}).click()
  assert.equal([...fake.invoices.values()].at(-1).TotalAmt,395.63)
  const stripeAgreement=await acceptedQuickbooksAgreement({cmd,send,state},'Browser Stripe agreement')
  const stripeReview=await cmd('accounting.review',{proposalId:stripeAgreement.proposal.id,customerId:'new',itemId:fake.item,incomeAccountId:fake.incomeAccount})
  await cmd('accounting.apply',{id:stripeReview.id,digest:stripeReview.digest,consent:true});await cmd('accounting.dispatch',{})
  await postStripeReceipt({cmd},fake,stripeAgreement)
  await page.goto(app.origin+'/app/settings')
  await panel().getByLabel('Fee expense account ID',{exact:true}).fill(fake.expense)
  await panel().getByRole('button',{name:'Review processor accounting',exact:true}).click()
  const processor=panel().getByRole('article',{name:'Reviewed processor accounting'})
  assert.match(await processor.innerText(),/\$7\.50 USD/)
  assert.match(await processor.innerText(),/Processor fees/)
  assert.match(await processor.innerText(),/Stripe clearing/)
  assert.equal(fake.journals.size,0)
  await capture('processor-review')
  await processor.getByRole('checkbox').check();await processor.getByRole('button',{name:'Record reviewed accounting',exact:true}).click()
  assert.equal(fake.journals.size,1)
  assert.match(await panel().getByRole('list',{name:'QuickBooks processor history'}).innerText(),/confirmed/)
  assert.deepEqual(await panel().locator('button, label, p, legend').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length&&parseFloat(getComputedStyle(n).fontSize)<13).map(n=>n.tagName)),[])

  await panel().getByRole('button',{name:'Revoke QuickBooks invoice authorization',exact:true}).click()
  assert.equal((await state()).accounting.settings.active,false)
  assert.match(await panel().innerText(),/Inactive/)
 } finally {await context?.close();await browser?.close();await app?.close()}
}

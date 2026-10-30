import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'
import { quickbooksFixture, acceptedQuickbooksAgreement } from './provider-network.mjs'

export async function quickbooksBrowser() {
 let app,browser,context
 const fake=quickbooksFixture()
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
  await panel().getByRole('button',{name:'Review deposit invoice',exact:true}).click()
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
  await page.reload()
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
  await capture('retained')
  await panel().getByRole('button',{name:'Revoke QuickBooks invoice authorization',exact:true}).click()
  assert.equal((await state()).accounting.settings.active,false)
  assert.match(await panel().innerText(),/Inactive/)
 } finally {await context?.close();await browser?.close();await app?.close()}
}

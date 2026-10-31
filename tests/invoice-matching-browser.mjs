import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import {chromium} from '@playwright/test'
import {harness} from './harness.mjs'
import {invoiceFixture,invoiceAccount,invoiceCustomer,invoiceExternal,invoiceToken,acceptedDeposit} from './invoice-matching-fixture.mjs'
export async function invoiceMatchingBrowser(){
 const fake=invoiceFixture(),h=await harness({entry:'dist/server/index.js',assetsDirectory:'./dist/client',outboundService:fake.outboundService})
 let browser
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),at=h.owner.indexOf('=')
  await context.addCookies([{name:h.owner.slice(0,at),value:h.owner.slice(at+1),url:h.origin}])
  await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  const agreement=await acceptedDeposit(h)
  const screenshots=process.env.PLATTER_SCREENSHOTS;if(screenshots)await mkdir(screenshots,{recursive:true})
  const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Invoice reconciliation',exact:true})})
  const capture=async name=>{if(!screenshots)return;await page.evaluate(()=>document.fonts.ready);for(const width of [1440,390]){await page.setViewportSize({width,height:900});await panel.screenshot({path:join(screenshots,'ACCT-004-'+name+'-'+width+'.png')})}await page.setViewportSize({width:1440,height:900})}
  await page.goto(h.origin+'/app/settings');assert.equal(fake.calls.length,0,'opening settings grants no provider-read authority')
  const connection=page.locator('form').filter({has:page.getByRole('button',{name:'Connect QuickBooks Online',exact:true})})
  await connection.getByLabel('QuickBooks Online access token',{exact:true}).fill(invoiceToken);await connection.getByLabel('QuickBooks company id',{exact:true}).fill(invoiceAccount);await connection.getByRole('checkbox').check();await connection.getByRole('button').click()
  assert.equal(fake.calls.length,1)
  await page.waitForLoadState('load')
  assert.equal(await page.getByRole('alert').count(),0)
  assert.equal(await panel.getByLabel('Accepted deposit',{exact:true}).count(),1)
  await panel.getByLabel('Accepted deposit',{exact:true}).selectOption(agreement.p.id);await panel.getByLabel('QuickBooks customer ID',{exact:true}).fill(invoiceCustomer);await panel.getByLabel('Existing QuickBooks invoice ID',{exact:true}).fill(invoiceExternal)
  const read=panel.locator('form').filter({has:page.getByRole('button',{name:'Review existing invoice',exact:true})})
  await read.getByRole('checkbox').check();await read.getByRole('button').click()
  assert.equal(await page.getByRole('alert').count(),0)
  const review=panel.getByRole('article',{name:'Reviewed invoice match',exact:true})
  assert.match(await review.innerText(),/Synthetic deposit client/);assert.match(await review.innerText(),/Synthetic reviewed customer/);assert.match(await review.innerText(),/\$1,050\.00 USD/);assert.match(await review.innerText(),/revision 1/)
  assert.equal((await h.send('/api/platter/invoice-reconciliation',undefined,h.owner)).value.deposits[0].match,null)
  await capture('review')
  await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Retain reviewed match',exact:true}).click()
  assert.equal(await page.getByRole('alert').count(),0);assert.match(await panel.innerText(),/Matched from reviewed response/);assert.match(await panel.innerText(),/Recorded receipts: none/)
  const retained=(await h.send('/api/platter/invoice-reconciliation',undefined,h.owner)).value.deposits[0].match
  await capture('matched')
  await page.reload();const noRead=fake.calls.length;await page.reload();assert.equal(fake.calls.length,noRead,'reload does not reuse inspection consent')
  fake.invoice.TotalAmt=1100
  const inspect=panel.locator('form').filter({has:page.getByRole('button',{name:'Inspect matched invoice',exact:true})})
  await inspect.getByRole('checkbox').check();await inspect.getByRole('button').click()
  assert.equal(await page.getByRole('alert').count(),0);assert.match(await panel.innerText(),/Mismatch: amount/);assert.match(await panel.innerText(),/Current provider amount: \$1,100\.00 USD/);assert.match(await panel.innerText(),/Retained amount: \$1,050\.00 USD/);assert.match(await panel.innerText(),/Accepted money is unchanged/)
  assert.deepEqual((await h.send('/api/platter/invoice-reconciliation',undefined,h.owner)).value.deposits[0].match,retained)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  assert.ok(await panel.locator('input:not([type=hidden]),select,button,p,label').evaluateAll(elements=>elements.every(element=>parseFloat(getComputedStyle(element).fontSize)>=13)))
  await capture('mismatch')
  assert.equal(await panel.locator('button:not(:has-text("Inspect")):not(:has-text("Review"))').count(),0)
  console.log('PROBE ACCT-004 settings: compiled browser review, explicit apply and fresh inspection -> visible retained match and amount mismatch; screens at 1440 and 390')
  await context.close()
 }finally{await browser?.close();await h.close()}
}

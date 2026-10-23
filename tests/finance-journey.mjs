import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { harness } from './harness.mjs'
import { browserEdge } from './browser-edge.mjs'
import { financeFake, financeConfig, financeOffer } from './finance-fixture.mjs'
import { pdfPages } from './pdf-document.mjs'
export async function financeJourney(){
 const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const screenshots=process.env.PLATTER_SCREENSHOTS
 if(screenshots)await mkdir(screenshots,{recursive:true})
 try{for(const width of [1440,390]){
  const edge=await browserEdge(),fake=financeFake(),h=await harness({entry:'dist/server/index.js',origin:edge.origin,assetsDirectory:'dist/client',unclaimed:true,outboundService:fake.outboundService})
  edge.attach(h)
  const context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),clientContext=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true,javaScriptEnabled:false})
  try{
   const page=await context.newPage(),headers={origin:edge.origin},getState=async()=>{const r=await context.request.get(edge.origin+'/api/platter/state');assert.equal(r.status(),200,await r.text());return r.json()},cmd=async(name,input)=>{const r=await context.request.post(edge.origin+'/api/platter/command',{headers,data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
   const capture=async(target,name)=>{
    await target.waitForLoadState('load');assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' fits '+width)
    // These finance surfaces use text-labelled controls; none is icon-only.
    const unnamed=await target.locator('button').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width&&!(n.innerText.trim()||n.getAttribute('aria-label'))).map(n=>n.outerHTML));assert.deepEqual(unnamed,[])
    if(screenshots)await target.screenshot({path:join(screenshots,'finance-'+name+'-'+width+'.png'),fullPage:true})
   }
   assert.equal((await context.request.post(edge.origin+'/auth/bootstrap',{headers,data:{token:h.auth.SETUP_TOKEN,displayName:'Synthetic Finance Owner'},maxRedirects:0})).status(),303)
   await page.goto(edge.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
   const client=await cmd('client.save',{name:'Synthetic finance client',email:'client@synthetic-platter.example'})
   const p=await cmd('proposal.prepare',{...financeOffer,clientId:client.id,packages:[{id:'one',label:'Core',price:'10000',optionalItems:[{id:'extra',label:'Extra service',unitPrice:'100',min:1,max:10,quantity:1,editable:true}]},{id:'two',label:'Expanded',price:'20000'}]})
   await page.goto(edge.origin+'/app/payment-terms?id='+p.id)
   await page.getByLabel('Deposit percentage',{exact:true}).fill('30');await page.getByLabel('Invoice net days').fill('15')
   for(const [i,label,value,kind,date] of [[0,'Design approval','30','percent',''],[1,'Delivery','','balance','2028-03-15']]){
    await page.locator('[name=milestoneLabel'+i+']').fill(label);await page.locator('[name=milestoneKind'+i+']').selectOption(kind);await page.locator('[name=milestoneAmount'+i+']').fill(value);if(date)await page.locator('[name=milestoneDate'+i+']').fill(date)
   }
   await page.locator('[name=recurringLabel0]').fill('Monthly support');await page.locator('[name=recurringKind0]').selectOption('percent');await page.locator('[name=recurringAmount0]').fill('10');await page.locator('[name=recurringDate0]').fill('2028-04-01')
   await capture(page,'terms-editor');await page.getByRole('button',{name:'Save payment terms',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
   let row=(await getState()).proposals.find(r=>r.id===p.id);assert.equal(row.revision,2)
   const template=await cmd('template.save',{id:p.id,version:row.version,name:'Synthetic scheduled template'}),started=await cmd('template.start',{id:template.id,version:1,clientId:client.id})
   await page.goto(edge.origin+'/app/payment-terms?id='+started.id);await page.getByLabel('Deposit percentage',{exact:true}).fill('25');await page.getByRole('button',{name:'Save payment terms',exact:true}).click()
   assert.equal((await getState()).templates.find(t=>t.id===template.id).snapshot.deposit_bps,3000)
   await capture(page,'independent-template-terms')
   await cmd('provider.connect',{provider:'quickbooks',version:0,realmId:'synthetic-platter-6100',token:'synthetic-platter-6107',consent:true})
   await page.goto(edge.origin+'/app/payments')
   for(const [name,value] of Object.entries({itemId:financeConfig.itemId,taxCode:financeConfig.taxCode,incomeAccount:financeConfig.incomeAccount,clearingAccount:financeConfig.clearingAccount,feeAccount:financeConfig.feeAccount,bankAccount:financeConfig.bankAccount,remittance:financeConfig.remittance}))await page.locator('[name='+name+']').fill(value)
   const authorization=page.locator('form').filter({has:page.getByRole('button',{name:'Authorize accounting sync',exact:true})});await authorization.getByRole('checkbox').check();await capture(page,'authority-consent');await page.getByRole('button',{name:'Authorize accounting sync',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
   row=(await getState()).proposals.find(r=>r.id===p.id)
   const query='?id='+p.id+'&revision=2&width='+width+'&optionId=one&items='+encodeURIComponent(JSON.stringify([{id:'extra',quantity:4}]))
   await page.goto(edge.origin+'/app/preview/client'+query);assert.match(await page.locator('main').innerText(),/Design approval: USD 3120.00/);assert.match(await page.locator('main').innerText(),/Delivery: USD 4160.00/);await capture(page,'schedule-preview')
   await cmd('proposal.approve',{id:p.id,version:row.version,revision:2});row=(await getState()).proposals.find(r=>r.id===p.id);const share=await cmd('proposal.send',{id:p.id,version:row.version}),path=new URL(share.shareUrl).pathname
   const clientPage=await clientContext.newPage();await clientPage.goto(edge.origin+path+'?optionId=one&items='+encodeURIComponent(JSON.stringify([{id:'extra',quantity:4}])))
   await clientPage.getByRole('button',{name:'Send verification code',exact:true}).click()
   const code=(await getState()).outbox.find(m=>m.proposal_id===p.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
   await clientPage.getByLabel('Email verification code').fill(code);await clientPage.getByRole('button',{name:'Verify email',exact:true}).click()
   assert.match(await clientPage.locator('main').innerText(),/Design approval: USD 3120.00/);await capture(clientPage,'client-schedule')
   const downloading=clientPage.waitForEvent('download');await clientPage.getByRole('button',{name:'Download unsigned proposal PDF',exact:true}).click();const download=await downloading,text=(await pdfPages(await readFile(await download.path()))).join(' ');assert.match(text,/Design approval: USD 3120.00/);assert.match(text,/Delivery: USD 4160.00/)
   await clientPage.getByLabel('Your full name').fill('Synthetic Client');await clientPage.locator('[name=consent]').check();await clientPage.getByRole('button',{name:'Accept proposal',exact:true}).click();assert.match(await clientPage.locator('main').innerText(),/Proposal accepted/);await capture(clientPage,'accepted-schedule')
   let state=await getState(),milestone=state.finance.amounts.find(r=>r.proposal_id===p.id&&r.label==='Design approval')
   assert.equal(fake.invoices.size,1)
   await page.goto(edge.origin+'/app/payments');await capture(page,'reconciliation-scheduled')
   await page.getByRole('button',{name:'Mark Design approval done',exact:true}).click();assert.equal(fake.invoices.size,2)
   state=await getState();milestone=state.finance.amounts.find(r=>r.id===milestone.id)
   await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET observed_at=excluded.observed_at').bind(Date.now()+17*86400000).run()
   await page.reload();const record=page.locator('article').filter({has:page.getByRole('heading',{name:'Synthetic scheduled project · Design approval',exact:true})})
   await record.getByRole('combobox',{name:'Received payment method'}).selectOption('check');await record.getByLabel('Payment reference or check number').fill('synthetic-platter-6160');await record.getByLabel('Date received').fill(new Date().toISOString().slice(0,10));await record.getByRole('checkbox').check();await capture(page,'overdue-payment');await record.getByRole('button',{name:'Record received payment',exact:true}).click()
   state=await getState();milestone=state.finance.amounts.find(r=>r.id===milestone.id);assert.equal(milestone.paidCents,312000);assert.equal(milestone.overdueCents,0);assert.equal(fake.payments.size,1);await capture(page,'offline-paid')
   const deposit=state.finance.amounts.find(r=>r.proposal_id===p.id&&r.kind==='deposit');fake.invoices.get(deposit.external_id).TotalAmt+=1
   await page.getByRole('button',{name:'Reconcile accounting',exact:true}).click();assert.match(await page.locator('main').innerText(),/Invoice amount differs/);await capture(page,'provider-mismatch')
  }finally{await clientContext.close();await context.close();await h.close();await edge.close()}
 }}finally{await browser.close()}
}

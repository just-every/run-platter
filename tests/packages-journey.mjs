import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'
import { pdfPages } from './pdf-document.mjs'

export async function packagesJourney() {
 const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const screenshots=process.env.PLATTER_SCREENSHOTS
 if(screenshots)await mkdir(screenshots,{recursive:true})
 try {for(const width of [1440,390]){
  const app=await installedApp(),context=await browser.newContext({viewport:{width,height:900}})
  let clientContext
  try {
   const page=await context.newPage(),headers={origin:app.origin}
   assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers,data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
   await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
   const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers,data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
   const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
   await page.goto(app.origin+'/app');await page.locator('[name=clientId]').selectOption(client.id)
   for(const [name,value]of Object.entries({title:'Northstar package choices',scope:'Brand strategy and delivery.',terms:'Complete package includes priority support.',optionOne:'Essential',priceOne:'1000',optionTwo:'Growth',priceTwo:'2000',depositPercent:'25'}))await page.locator(`[name=${name}]`).fill(value)
   await page.getByRole('button',{name:'Add package',exact:true}).click()
   const third=page.locator('[data-package-id]').last(),thirdId=await third.getAttribute('data-package-id')
   await third.locator('[data-package-field=label]').fill('Complete');await third.locator('[data-package-field=price]').fill('3000');await page.locator('[name=termsOption]').selectOption(thirdId)
   const middle=page.locator('[data-package-id=two]')
   for(const [label,price,max,editable]of [['Rush delivery','75.25','10',true],['Team training','100','1',false]]){
    await middle.getByRole('button',{name:'Add optional item',exact:true}).click();const item=middle.locator('[data-optional-item]').last()
    for(const [key,value]of Object.entries({label,unitPrice:price,min:'1',max,quantity:'1'}))await item.locator(`[data-item-field=${key}]`).fill(value)
    if(!editable)await item.locator('[data-item-field=editable]').uncheck()
   }
   const capture=async(target,name)=>{await target.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} fits ${width}`);if(screenshots)await target.screenshot({path:join(screenshots,`PRICE-002-${name}-${width}.png`),fullPage:true})}
   await capture(page,'editor')
   await page.getByRole('button',{name:'Prepare proposal',exact:true}).click();await page.getByRole('link',{name:'Northstar package choices',exact:true}).click()
   const state=await(await context.request.get(app.origin+'/api/platter/state')).json(),p=state.proposals.find(p=>p.title==='Northstar package choices');assert.equal(p.options.length,3);assert.equal(p.options[1].optionalItems.length,2)
   await page.reload();assert.equal(await page.locator('[data-package-id]').count(),3);assert.equal(await page.locator('[data-optional-item]').count(),2);await capture(page,'saved')
   await page.getByRole('link',{name:'Preview client page',exact:true}).click()
   if(width===390){await page.getByLabel('Preview width').selectOption('390');await page.getByRole('button',{name:'Change preview width'}).click()}
   const frame=page.frameLocator('iframe'),updatePreview=async()=>{const navigating=page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/app/preview/client?')});await frame.getByRole('button',{name:'Update preview selection'}).click();await(await navigating).waitForLoadState('load')};await frame.getByLabel('Choose one option',{exact:true}).selectOption('two');await updatePreview()
   await frame.getByRole('checkbox',{name:/Add Rush delivery/}).check();await frame.getByLabel('Quantity for Rush delivery').fill('4');await updatePreview()
   assert.match(await frame.getByLabel('Selected total').innerText(),/2,301\.00/);assert.match(await frame.getByLabel('Selected deposit').innerText(),/575\.25/);assert.ok(!(await frame.locator('main').innerText()).includes('Complete package includes priority support.'));await capture(page,'preview');const previewPage=await context.newPage();try{await previewPage.goto(page.frames().find(f=>f.url().includes('/app/preview/client?')).url());await capture(previewPage,'preview-selection')}finally{await previewPage.close()}
   const unchanged=await(await context.request.get(app.origin+'/api/platter/state')).json();assert.equal(unchanged.proposals.find(x=>x.id===p.id).version,1);assert.equal(unchanged.outbox.length,0)
   await page.goto(app.origin+'/app/proposal?id='+p.id);await page.getByRole('button',{name:'Approve this revision',exact:true}).click();await page.getByRole('button',{name:'Send approved proposal',exact:true}).click()
   const sent=await(await context.request.get(app.origin+'/api/platter/state')).json(),path='/p/'+sent.proposals.find(x=>x.id===p.id).shareToken
   clientContext=await browser.newContext({viewport:{width,height:900}});const clientPage=await clientContext.newPage()
   await clientPage.goto(app.origin+path);await clientPage.getByLabel('Review sections for').selectOption('two');await clientPage.getByRole('button',{name:'Review package',exact:true}).click()
   await clientPage.getByRole('checkbox',{name:/Add Rush delivery/}).check();await clientPage.getByLabel('Quantity for Rush delivery').fill('4');await clientPage.getByRole('button',{name:'Review package',exact:true}).click()
   assert.match(await clientPage.getByLabel('Selected total').innerText(),/2,301\.00/)
   await clientPage.getByLabel('Review sections for').selectOption('one');await clientPage.getByRole('button',{name:'Review package',exact:true}).click();assert.match(await clientPage.getByLabel('Selected total').innerText(),/1,000\.00/)
   await clientPage.getByLabel('Review sections for').selectOption('two');await clientPage.getByRole('button',{name:'Review package',exact:true}).click();assert.match(await clientPage.getByLabel('Selected total').innerText(),/2,000\.00/)
   await clientPage.getByRole('checkbox',{name:/Add Rush delivery/}).check();await clientPage.getByLabel('Quantity for Rush delivery').fill('4');await clientPage.getByRole('button',{name:'Review package',exact:true}).click()
   // Remove and re-add the item through the same public review form.
   await clientPage.getByRole('checkbox',{name:/Add Rush delivery/}).uncheck();await clientPage.getByRole('button',{name:'Review package',exact:true}).click();assert.match(await clientPage.getByLabel('Selected total').innerText(),/2,000\.00/)
   await clientPage.getByRole('checkbox',{name:/Add Rush delivery/}).check();await clientPage.getByLabel('Quantity for Rush delivery').fill('4');await clientPage.getByRole('button',{name:'Review package',exact:true}).click()
   await clientPage.getByRole('button',{name:'Send verification code',exact:true}).click()
   const mail=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=mail.outbox.find(x=>x.proposal_id===p.id&&x.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
   await clientPage.getByLabel('Email verification code').fill(code);await clientPage.getByRole('button',{name:'Verify email',exact:true}).click()
   assert.match(await clientPage.getByLabel('Selected total').innerText(),/2,301\.00/);assert.match(await clientPage.getByLabel('Selected deposit').innerText(),/575\.25/)
   await clientPage.getByLabel('Quantity for Rush delivery').fill('11');assert.equal(await clientPage.getByLabel('Quantity for Rush delivery').evaluate(x=>x.validity.rangeOverflow),true);await clientPage.getByLabel('Quantity for Rush delivery').fill('4')
   await capture(clientPage,'client-selection')
   const downloading=clientPage.waitForEvent('download');await clientPage.getByRole('button',{name:'Download unsigned proposal PDF',exact:true}).click();const download=await downloading,pages=await pdfPages(await readFile(await download.path())),text=pages.join(' ')
   for(const value of ['2,301.00','575.25','Rush delivery: 4 x USD 75.25 = USD 301.00'])assert.ok(text.includes(value));for(const pageText of pages)assert.match(pageText,/Not signed, revision 1/)
   assert.ok(!text.includes('Complete package includes priority support.'))
   await clientPage.getByLabel('Your full name').fill('Avery Chen');await clientPage.locator('[name=consent]').check();await clientPage.getByRole('button',{name:'Accept proposal',exact:true}).click()
   assert.match(await clientPage.locator('main').innerText(),/This agreement is complete/);assert.match(await clientPage.getByLabel('Selected total').innerText(),/2,301\.00/);await capture(clientPage,'accepted')
   const final=await(await context.request.get(app.origin+'/api/platter/state')).json(),agreement=final.proposals.find(x=>x.id===p.id).acceptance
   assert.equal(agreement.totalCents,230100);assert.equal(agreement.depositCents,57525);assert.equal(agreement.selection.items[0].quantity,4)
   // PRICE-002 / SIGN-008: record the same selection when the client signs elsewhere.
   const {packageFixture}=await import('./packages-fixture.mjs')
   const paper=await cmd('proposal.prepare',{clientId:client.id,title:'Northstar signed-copy choices',scope:'Signed outside Platter.',depositPercent:25,packages:packageFixture()})
   await cmd('proposal.approve',{id:paper.id,version:1,revision:1});await cmd('proposal.send',{id:paper.id,version:2})
   await page.goto(app.origin+'/app/proposal?id='+paper.id)
   const paperPanel=page.locator('#paper-acceptance'),review=paperPanel.locator('form').filter({has:page.getByRole('button',{name:'Review signed-copy selection',exact:true})})
   await paperPanel.getByLabel('Package recorded from signed copy').selectOption('two');await paperPanel.getByRole('button',{name:'Choose signed package',exact:true}).click()
   await review.getByRole('checkbox',{name:/Add Rush delivery/}).check();await review.getByLabel('Quantity for Rush delivery').fill('4');await review.getByRole('button',{name:'Review signed-copy selection',exact:true}).click()
   assert.match(await paperPanel.getByLabel('Selected total').innerText(),/2,301\.00/);assert.match(await paperPanel.getByLabel('Selected deposit').innerText(),/575\.25/);await capture(page,'upload-selection')
   await paperPanel.getByLabel('Package recorded from signed copy').selectOption('one');await paperPanel.getByRole('button',{name:'Choose signed package',exact:true}).click()
   assert.equal(await review.getByRole('checkbox',{name:/Add Rush delivery/}).isChecked(),false);assert.match(await paperPanel.getByLabel('Selected total').innerText(),/1,000\.00/)
   await paperPanel.getByLabel('Package recorded from signed copy').selectOption('two');await paperPanel.getByRole('button',{name:'Choose signed package',exact:true}).click()
   await review.getByRole('checkbox',{name:/Add Rush delivery/}).check();await review.getByLabel('Quantity for Rush delivery').fill('11');assert.equal(await review.getByLabel('Quantity for Rush delivery').evaluate(x=>x.validity.rangeOverflow),true)
   await review.getByLabel('Quantity for Rush delivery').fill('4');await review.getByRole('button',{name:'Review signed-copy selection',exact:true}).click()
   const upload=paperPanel.locator('form[enctype="multipart/form-data"]')
   await upload.getByLabel('Signer full name').fill('Morgan Lee');await upload.getByLabel('Signed date').fill('2026-10-15')
   await upload.getByLabel('Client-signed copy').setInputFiles({name:'packages-signed.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF Growth with Rush delivery quantity four')});await upload.getByRole('checkbox').check();await capture(page,'upload-form')
   await upload.getByRole('button',{name:'Record accepted by upload',exact:true}).click()
   assert.equal(await page.getByRole('alert').count(),0);assert.match(await page.getByRole('status').innerText(),/Accepted by upload/);assert.match(await page.getByLabel('Selected total').innerText(),/2,301\.00/);assert.match(await page.getByLabel('Selected deposit').innerText(),/575\.25/)
   const paperState=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(x=>x.id===paper.id)
   assert.equal(paperState.acceptance.method,'upload');assert.equal(paperState.acceptance.selection.items[0].quantity,4);assert.equal(paperState.acceptance.totalCents,230100);assert.equal(paperState.acceptance.depositCents,57525)
   await capture(page,'upload-accepted');await page.getByRole('button',{name:'Export invoice CSV',exact:true}).click()
   const invoice=await context.request.get(app.origin+await page.getByRole('link',{name:'Download deposit invoice CSV',exact:true}).getAttribute('href'));assert.equal(invoice.status(),200);assert.match(await invoice.text(),/575\.25/);await capture(page,'upload-invoice')

  }finally{await clientContext?.close();await context.close();await app.close()}
 }}finally{await browser.close()}
}

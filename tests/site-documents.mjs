import { acceptRevenue } from './revenue-fixture.mjs'
import { localeBrowser } from './locale-browser.mjs'
import { collectionBrowser } from './collection-browser.mjs'
import { documentJourney } from './document-journey.mjs'
import { inboundMailFixture } from './inbound-mail-fixture.mjs'
import { templatesJourney } from './templates-journey.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { pdfPages } from './pdf-document.mjs'
import { builtSite, installedApp } from './site-harness.mjs'

test('EDIT-017 owner-selected Spanish invitation, verification, consent and completion preserve authored English through the compiled client', {timeout:120000},()=>localeBrowser())

test('COLLAB-003 desktop and phone compare revisions and restore an earlier draft requiring fresh approval', { timeout: 120000 }, async () => {
 let app, browser
 const screenshots = process.env.PLATTER_SCREENSHOTS
 try {
  browser = await chromium.launch({ headless: true, args: ['--use-mock-keychain', '--password-store=basic'] })
  if (screenshots) await mkdir(screenshots, { recursive: true })
  for (const width of [1440, 390]) {
   app = await installedApp()
   const context = await browser.newContext({ viewport: { width, height: 900 } })
   try {
    const page = await context.newPage()
    const claimed = await context.request.post(app.origin + '/auth/bootstrap', { headers: { origin: app.origin }, data: { token: app.token, displayName: 'Jordan Northstar' }, maxRedirects: 0 })
    assert.equal(claimed.status(), 303)
    await page.goto(app.origin + '/setup');await page.getByRole('checkbox').check();await page.getByRole('button', { name: 'Finish setup' }).click()
    await page.getByRole('link', { name: 'Clients', exact: true }).click()
    await page.locator('input[name="name"]').fill('Northstar Coffee');await page.locator('input[name="email"]').fill('avery@northstar.example');await page.getByRole('button', { name: 'Add client' }).click()
    await page.getByRole('link', { name: 'Proposals', exact: true }).click()
    await page.locator('select[name="clientId"]').selectOption({ label: 'Northstar Coffee' })
    for (const [name, value] of Object.entries({ title: 'Brand photography', scope: 'One studio shoot and edited photographs.', optionOne: 'Studio essentials', priceOne: '2400.00', optionTwo: 'Full campaign', priceTwo: '4200.00', depositPercent: '25' })) await page.locator(`[name="${name}"]`).fill(value)
    await page.getByRole('button', { name: 'Prepare proposal', exact: true }).click()
    await page.getByRole('link', { name: 'Brand photography', exact: true }).click()
    await page.locator('textarea[name="scope"]').fill('Two shoots, including product photographs.');await page.locator('[name="priceOne"]').fill('2800.00');await page.getByRole('button', { name: 'Save revision' }).click()
    await page.locator('textarea[name="scope"]').fill('Three shoots with social assets.');await page.locator('[name="priceOne"]').fill('3600.00');await page.getByRole('button', { name: 'Save revision' }).click()
    await page.getByRole('button', { name: 'Approve this revision' }).click()
    await page.getByLabel('Compare from').selectOption('1');await page.getByLabel('Compare to').selectOption('3');await page.getByRole('button', { name: 'Compare revisions' }).click()
    assert.equal(await page.locator('del').filter({ hasText: 'One studio shoot and edited photographs.' }).count(), 1)
    assert.equal(await page.locator('ins').filter({ hasText: 'Three shoots with social assets.' }).count(), 1)
    assert.equal(await page.locator('del').filter({ hasText: '$2,400.00' }).count(), 1)
    assert.equal(await page.locator('ins').filter({ hasText: '$3,600.00' }).count(), 1)
    const history = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Revision history', exact: true }) })
    assert.equal(await history.getByRole('heading', { name: /^Revision [123]$/ }).count(), 3)
    assert.match(await history.innerText(), /owner@northstar\.example.*UTC/)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    if (screenshots) await page.screenshot({ path: join(screenshots, `COLLAB-003-compare-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Restore revision 1', exact: true }).click()
    assert.equal(await page.locator('textarea[name="scope"]').inputValue(), 'One studio shoot and edited photographs.')
    assert.equal(await page.locator('[name="priceOne"]').inputValue(), '2400.00')
    assert.match(await page.locator('.proposal-status').innerText(), /draft.*Revision 4/is)
    assert.equal(await page.getByRole('button', { name: 'Approve this revision' }).count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Send approved proposal' }).count(), 0)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    if (screenshots) await page.screenshot({ path: join(screenshots, `COLLAB-003-restored-${width}.png`), fullPage: true })
   } finally { await context.close();await app.close();app=undefined }
  }
 } finally { await browser?.close();await app?.close() }
})

test('EDIT-010 desktop and phone upload vendor defaults and MSA, download frozen bytes, replace defaults and accept the original package', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS;if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`EDIT-010-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.getByRole('link',{name:'Vendor documents',exact:true}).click()
    const uploadDefault=async(kind,name,text)=>{const form=page.locator(`form:has(input[name="kind"][value="${kind}"])`);await form.getByLabel('Document file').setInputFiles({name,mimeType:'application/pdf',buffer:Buffer.from(text)});await form.locator('button').click();assert.equal(await page.getByRole('alert').count(),0)}
    await uploadDefault('w9','Northstar-W9.pdf','%PDF original W9');await uploadDefault('insurance','Northstar-insurance.pdf','%PDF original insurance');await capture('settings')
    const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),p=await cmd('proposal.prepare',{clientId:client.id,title:'Northstar autumn campaign',scope:'One studio shoot and usage licence.',terms:'Delivery within 21 days.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    await page.goto(app.origin+'/app/proposal?id='+p.id)
    const form=page.locator('form:has(input[name="file"])');await form.getByLabel('Document file').setInputFiles({name:'Northstar-MSA.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF client MSA')});await form.getByRole('button',{name:'Attach document',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0);await capture('draft-attachments')
    assert.match(await page.locator('.proposal-status').innerText(),/draft.*Revision 2/is)
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();const clientPath=await page.getByRole('link',{name:'Open client proposal',exact:true}).getAttribute('href');await capture('sent-attachments')
    await page.getByRole('link',{name:'Vendor documents',exact:true}).click();await uploadDefault('w9','Northstar-W9-replacement.pdf','%PDF new W9');await uploadDefault('insurance','Northstar-insurance-replacement.pdf','%PDF new insurance');await capture('replacement-settings')
    await page.goto(app.origin+clientPath)
    for(const [filename,bytes] of [['Northstar-W9.pdf','%PDF original W9'],['Northstar-insurance.pdf','%PDF original insurance'],['Northstar-MSA.pdf','%PDF client MSA']]){const link=page.getByRole('link',{name:new RegExp(filename.replaceAll('.','\\.'))});const response=await context.request.get(app.origin+await link.getAttribute('href'));assert.equal(response.status(),200);assert.equal((await response.body()).toString(),bytes);assert.match(response.headers()['content-disposition'],/^attachment;/)}
    assert.equal(await page.getByRole('link',{name:/replacement/}).count(),0);await capture('client-originals')
    await page.getByRole('button',{name:'Send verification code'}).click();const state=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=state.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click();await page.getByRole('radio',{name:/Studio essentials/}).check();await page.getByLabel('Your full name').fill('Avery Chen');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Signed agreement package attachments',exact:true}).count(),1);assert.equal(await page.getByRole('link',{name:/Northstar-W9\.pdf/}).count(),1);assert.equal(await page.getByRole('link',{name:/Northstar-MSA\.pdf/}).count(),1);await capture('accepted-package')
    await page.goto(app.origin+'/app/proposal?id='+p.id);assert.equal(await page.getByRole('heading',{name:'Signed agreement package attachments',exact:true}).count(),1);await capture('owner-accepted-package')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('MIG-006 desktop and phone review original CSVs, finish imports, read records and journals, and undo', {timeout:180000},async()=>{
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs'),{businessCsv,fileHost}=await import('./business-import-fixture.mjs')
 const screenshots=process.env.PLATTER_SCREENSHOTS
 let h,edge,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   edge=await browserEdge()
   h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,alias:{'cloudflare:sockets':'./tests/catalog-socket-edge.ts'},outboundService:r=>fileHost(r)})
   edge.attach(h)
   const context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
   try{
    const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}])
    const page=await context.newPage(),capture=async name=>{await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`MIG-006-${name}-${width}.png`),fullPage:true})}
    await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click();await page.goto(h.origin+'/app/import')
    await capture('empty')
    for(const [kind,format,file]of [['contacts','platter','platter-contacts.csv'],['catalog','pandadoc','pandadoc-catalog.csv']]){
     await page.locator('select[name=kind]').selectOption(kind);await page.locator('select[name=format]').selectOption(format);await page.locator('textarea[name=csv]').first().fill(await businessCsv(file))
     await page.getByRole('button',{name:'Preview business CSV',exact:true}).click()
     const review=page.locator('section').filter({has:page.getByRole('heading',{name:'Review business import',exact:true})})
     assert.match(await review.innerText(),kind==='contacts'?/200/:/50/)
     assert.equal((await h.state()).businessRecords[kind].length,0)
     await capture(kind+'-preview')
     await page.getByRole('button',{name:'Apply reviewed business import',exact:true}).click()
     let steps=0
     while(await page.getByRole('button',{name:'Continue reviewed business import',exact:true}).count()){assert.ok(++steps<100);await page.getByRole('button',{name:'Continue reviewed business import',exact:true}).click()}
     assert.equal((await h.state()).businessRecords[kind].length,kind==='contacts'?200:50)
     await capture(kind+'-applied')
    }
    await page.getByRole('button',{name:'Open business import journal',exact:true}).first().click()
    const journal=page.locator('section').filter({has:page.getByRole('heading',{name:'Business import journal',exact:true})})
    assert.ok(await journal.getByRole('link',{name:/catalog\.csv|contacts\.csv/}).count())
    await capture('journal')
    const data=(await h.state()).businessRecords
    assert.equal(data.companies.length,60);assert.equal(data.contacts.find(c=>c.id==='contact-1').phone,'+1 212 555 0100');assert.equal(data.catalog.find(c=>c.sku==='SKU001').price,'100.12345')
    for(const heading of ['Imported companies','Imported contacts','Imported catalog']){const section=page.locator('section').filter({has:page.getByRole('heading',{name:heading,exact:true})});await section.locator('summary').first().click()}
    await capture('records')
    let steps=0
    while(await page.getByRole('button',{name:/^(Undo business import|Continue business import undo)$/}).count()){assert.ok(++steps<100);await page.getByRole('button',{name:/^(Undo business import|Continue business import undo)$/}).first().click()}
    assert.deepEqual((await h.state()).businessRecords,{companies:[],contacts:[],catalog:[]});await capture('undone')
    await page.locator('select[name=kind]').selectOption('catalog');await page.locator('select[name=format]').selectOption('platter')
    await page.locator('textarea[name=csv]').first().fill('id,name,images\nmissing-art,Brand artwork,https://private.vendor.example/brand.png')
    await page.getByRole('button',{name:'Preview business CSV',exact:true}).click()
    assert.equal(await page.getByRole('button',{name:'Apply reviewed business import',exact:true}).count(),0)
    await capture('unfetched-needs-confirmation')
    await page.getByRole('checkbox',{name:'I confirm importing this file without unfetched images.'}).check()
    await page.getByRole('button',{name:'Review import without unfetched images',exact:true}).click()
    await page.getByRole('button',{name:'Apply reviewed business import',exact:true}).click()
    assert.equal((await h.state()).businessRecords.catalog[0].images[0].status,'not-fetched');await capture('unfetched-confirmed')
    await page.getByRole('button',{name:'Undo business import',exact:true}).click()
    assert.equal((await h.state()).businessRecords.catalog.length,0)

   }finally{await context.close();await h.close();h=null;await edge.close();edge=null}
  }
 }finally{await browser?.close();await h?.close();await edge?.close()}
})

test('EDIT-014 client selects and downloads revision 2 at desktop and phone; owner timeline and per-proposal disable remain authoritative', {timeout:120000}, async()=>{
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try {
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try {
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`EDIT-014-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),offer={clientId:client.id,title:'Brand photography for Northstar Coffee',scope:'One studio shoot, edited photographs, and campaign usage rights.',terms:'Delivery within 30 days, following client feedback.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'}
    const made=await cmd('proposal.prepare',offer);await cmd('proposal.revise',{...offer,id:made.id,version:1,scope:'Two studio shoots, edited photographs, and campaign usage rights.'})
    await page.goto(app.origin+'/app/proposal?id='+made.id);await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();await capture('owner-enabled')
    await page.getByRole('link',{name:'Open client proposal',exact:true}).click();const clientUrl=page.url()
    assert.equal(await page.getByRole('button',{name:'Download unsigned proposal PDF'}).count(),0)
    await page.getByRole('button',{name:'Send verification code'}).click()
    const state=await (await context.request.get(app.origin+'/api/platter/state')).json(),code=state.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click();await page.getByRole('radio',{name:/Full campaign/}).check();await capture('client-selection')
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download unsigned proposal PDF'}).click(),page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/download.pdf')).then(async r=>assert.equal(r.status(),200,r.status()===200?'PDF response':await r.text()))])
    const pages=await pdfPages(await readFile(await download.path()));assert.ok(pages.every(p=>p.includes('Not signed, revision 2')));assert.ok(pages.join(' ').includes('Selected option total: USD 4,200.00'));assert.ok(pages.join(' ').includes('Deposit due: USD 1,050.00'))
    await page.goto(app.origin+'/app/proposal?id='+made.id);assert.match(await page.getByRole('list',{name:'PDF download timeline'}).innerText(),/Revision 2.*two/);await capture('owner-timeline')
    await page.getByRole('button',{name:'Turn off client PDF downloads'}).click();await capture('owner-disabled')
    await page.goto(clientUrl);assert.equal(await page.getByRole('button',{name:'Download unsigned proposal PDF'}).count(),0);await capture('client-disabled')
    assert.equal((await context.request.get(clientUrl+'/download.pdf?optionId=two')).status(),403)
    const after=await (await context.request.get(app.origin+'/api/platter/state')).json(),proposal=after.proposals.find(p=>p.id===made.id)
    assert.equal(proposal.status,'sent');assert.equal(proposal.revision,2);assert.equal(proposal.acceptance,undefined);assert.equal(proposal.pdfDownloads.length,1)
   } finally { await context.close();await app.close();app=undefined }
  }
 } finally { await browser?.close();await app?.close() }
})


test('EDIT-012 desktop and phone duplicate an accepted agreement for Beta Co and approve its separate draft', {timeout:180000},async()=>{
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`EDIT-012-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),beta=await cmd('client.save',{name:'Beta Co',email:'contact@beta.example'})
    const source=await cmd('proposal.prepare',{title:'Brand photography',clientId:client.id,scope:'Studio photography and campaign usage.',terms:'Delivery within two weeks.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    await cmd('proposal.approve',{id:source.id,version:1,revision:1});const invitation=await cmd('proposal.send',{id:source.id,version:2})
    await page.goto(invitation.shareUrl);await page.getByRole('button',{name:'Send verification code'}).click();const state=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=state.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click();await page.getByRole('radio',{name:/Studio essentials/}).check();await page.getByLabel('Your full name').fill('Avery Chen');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1);await capture('source-client')
    await page.goto(app.origin+'/app/proposal?id='+source.id);await page.getByLabel('Copy for client').selectOption(beta.id);await capture('source')
    await page.getByRole('button',{name:'Duplicate proposal',exact:true}).click();assert.notEqual(new URL(page.url()).searchParams.get('id'),source.id)
    assert.equal(await page.getByRole('heading',{name:'Brand photography (copy)',exact:true}).count(),1);assert.match(await page.locator('.proposal-status').innerText(),/draft.*Revision 1/i);assert.match(await page.locator('main').innerText(),/Beta Co/);assert.equal(await page.locator('textarea[name="scope"]').inputValue(),'Studio photography and campaign usage.');assert.equal(await page.locator('[name="priceOne"]').inputValue(),'2400.00');await capture('copy')
    const copyId=new URL(page.url()).searchParams.get('id');const beforeApproval=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name:'proposal.send',input:{id:copyId,version:1}}});assert.equal(beforeApproval.status(),409)
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();await capture('sent-copy')
    const final=await(await context.request.get(app.origin+'/api/platter/state')).json();assert.equal(final.proposals.find(p=>p.id===source.id).status,'accepted');assert.equal(final.proposals.find(p=>p.id===copyId).status,'sent');assert.equal(final.proposals.find(p=>p.id===source.id).acceptance.name,'Avery Chen')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('EDIT-018 desktop and phone preview exact client content, switch widths and select without sending', {timeout:120000}, async()=>{
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp({businessFixture:'fixtures/first-release-aud.ndjson'});const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage()
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const command=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=(await(await context.request.get(app.origin+'/api/platter/state')).json()).clients[0]
    const draft={clientId:client.id,title:'Autumn campaign photography',scope:'Two studio shoots, edited photographs, and a campaign usage licence.',terms:'Delivery within four weeks of approval.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4300.03',depositPercent:'33.33'}
    const p=await command('proposal.prepare',draft)
    const capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`EDIT-018-${name}-${width}.png`),fullPage:true})}
    await page.goto(app.origin+'/app/proposal?id='+p.id);await capture('editor')
    const before=await(await context.request.get(app.origin+'/api/platter/state')).json()
    await page.getByRole('link',{name:'Preview client page',exact:true}).click();await capture('desktop-wrapper')
    const frame=page.frameLocator('iframe[title="Client-page preview"]')
    assert.ok(await page.locator('iframe').evaluate(element=>element.getBoundingClientRect().right<=innerWidth),'EDIT-018 scaled canvas fits the member viewport without clipping client content')
    assert.equal(await frame.locator('body').evaluate(()=>innerWidth),1440)
    assert.match(await frame.locator('main').innerText(),/Revision 1 · Viewing as Northstar Coffee/)
    await frame.getByLabel('Choose one option',{exact:true}).selectOption('two');await Promise.all([page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/app/preview/client?')&&new URL(f.url()).searchParams.get('optionId')==='two'}),frame.getByRole('button',{name:'Update preview selection'}).click()])
    assert.equal(await frame.getByLabel('Selected total').innerText(),'$4,300.03 USD');assert.equal(await frame.getByLabel('Selected deposit').innerText(),'$1,433.20 USD')
    for(const label of ['Accept proposal','Send question to owner','Download unsigned proposal PDF'])assert.equal(await frame.getByRole('button',{name:label,exact:true}).isDisabled(),true)
    assert.equal((await context.request.post(app.origin+`/app/preview/client/action?id=${p.id}&revision=1&name=accept`,{headers:{origin:app.origin},data:{optionId:'two',consent:true}})).status(),403)
    await page.getByLabel('Preview width').selectOption('390');await page.getByRole('button',{name:'Change preview width'}).click()
    assert.equal(await frame.locator('body').evaluate(()=>innerWidth),390)
    await frame.getByLabel('Choose one option',{exact:true}).selectOption('two');await Promise.all([page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/app/preview/client?')&&new URL(f.url()).searchParams.get('optionId')==='two'}),frame.getByRole('button',{name:'Update preview selection'}).click()])
    assert.ok(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    await capture('phone-wrapper')
    const inner=await frame.locator('body').innerText();assert.match(inner,/Two studio shoots/);assert.match(inner,/Delivery within four weeks/)
    if(screenshots)await page.locator('iframe').screenshot({path:join(screenshots,`EDIT-018-phone-client-${width}.png`)})
    const previewPage=await context.newPage();try{await previewPage.goto(app.origin+`/app/preview/client?id=${p.id}&revision=1&optionId=two`);if(screenshots)await previewPage.screenshot({path:join(screenshots,`EDIT-018-client-preview-${width}.png`),fullPage:true})}finally{await previewPage.close()}
    assert.deepEqual(await(await context.request.get(app.origin+'/api/platter/state')).json(),before)
    const anonymous=await browser.newContext();try{assert.equal((await anonymous.request.get(app.origin+`/app/preview/client?id=${p.id}&revision=1`)).status(),401)}finally{await anonymous.close()}
    await page.getByRole('link',{name:'Back to editor',exact:true}).click();await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();await page.getByRole('link',{name:'Open client proposal',exact:true}).click()
    await page.getByRole('button',{name:'Send verification code'}).click()
    const sent=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=sent.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Preview',exact:true}).count(),0);await capture('actual-client')
    assert.match(await page.locator('main').innerText(),/Two studio shoots/);assert.match(await page.locator('main').innerText(),/Delivery within four weeks/)
    await page.getByRole('radio',{name:/Full campaign/}).check();await page.getByLabel('Your full name').fill('Avery Chen');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/\$4,300\.03 USD/);assert.match(await page.locator('main').innerText(),/\$1,433\.20 USD/);await capture('actual-accepted')
    const legacy=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(row=>row.currency==='AUD')
    const copied=await command('proposal.duplicate',{id:legacy.id,version:legacy.version,clientId:client.id})
    await page.goto(app.origin+`/app/preview/client?id=${copied.id}&revision=1&optionId=two`)
    assert.match(await page.locator('main').innerText(),/GST-free in AUD/);assert.match(await page.getByLabel('Selected total').innerText(),/AUD/);await capture('legacy-aud-preview')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('EDIT-009 desktop and phone configure, preview, select, download and accept conditional package sections', {timeout:120000}, async()=>{
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage()
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const command=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=await command('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    const fields={clientId:client.id,title:'Northstar autumn campaign',scope:'Brand strategy, a studio shoot and edited campaign photographs.',terms:'Premium timeline: strategy in week one, delivery in week four.',optionOne:'Standard',priceOne:'2400',optionTwo:'Premium',priceTwo:'4200',depositPercent:'25'}
    const p=await command('proposal.prepare',fields)
    const capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`EDIT-009-${name}-${width}.png`),fullPage:true})}
    await page.goto(app.origin+'/app/proposal?id='+p.id)
    await capture('editor-before');await page.locator('select[name=termsOption]').selectOption('two')
    await page.getByRole('button',{name:'Save revision',exact:true}).click();await capture('editor')
    for(const optionId of ['one','two']){
     await page.goto(app.origin+`/app/preview/client?id=${p.id}&revision=2&optionId=${optionId}`)
     assert.equal((await page.locator('main').innerText()).includes(fields.terms),optionId==='two');await capture('preview-'+optionId)
    }
    await page.goto(app.origin+'/app/proposal?id='+p.id);await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click()
    const state=await(await context.request.get(app.origin+'/api/platter/state')).json(),source=state.proposals.find(r=>r.id===p.id)
    const copy=await command('proposal.duplicate',{id:p.id,version:source.version});await command('proposal.approve',{id:copy.id,version:1,revision:1});await command('proposal.send',{id:copy.id,version:2})
    for(const [id,selection] of [[p.id,'one'],[copy.id,'two']]){
     const data=await(await context.request.get(app.origin+'/api/platter/state')).json(),row=data.proposals.find(r=>r.id===id),path='/p/'+row.shareToken
     await page.goto(app.origin+path);await page.getByRole('button',{name:'Send verification code'}).click()
     const mailState=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=mailState.outbox.find(m=>m.proposal_id===id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
     await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click()
     await page.getByLabel('Review sections for').selectOption(selection);await page.getByRole('button',{name:'Review package',exact:true}).click();assert.equal(new URL(page.url()).pathname,path);assert.equal(await page.getByText('Could not complete this action',{exact:true}).count(),0)
     assert.equal((await page.locator('main').innerText()).includes(fields.terms),selection==='two');await capture('client-'+selection)
     const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download unsigned proposal PDF',exact:true}).click();const pdf=await download
     const text=(await pdfPages(await readFile(await pdf.path()))).join(' ');assert.equal(text.includes(fields.terms),selection==='two');assert.ok(text.includes(fields.scope))
     await page.getByLabel('Your full name').fill('Avery Chen');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
     assert.match(await page.locator('main').innerText(),/This agreement is complete/);assert.equal((await page.locator('main').innerText()).includes(fields.terms),selection==='two');await capture('accepted-'+selection)
    }
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('EDIT-007 desktop and phone client reviews accessible pricing, corrects quantities, downloads attachments and PDF, verifies, comments and accepts by keyboard with WCAG 2.2 AA axe scans', {timeout:180000}, async()=>{
 const { mobileClientJourney } = await import('./mobile-client-journey.mjs')
 await mobileClientJourney()
})

test('PRICE-001 / COLLAB-003 / EDIT-014 / EDIT-018 desktop and phone create grouped line tables, edit and restore, preview, send, download and accept identical server totals', {timeout:180000}, async()=>{
 const {pricingJourney}=await import('./pricing-journey.mjs');await pricingJourney()
})

test('MOB-001 / PRICE-002 / SIGN-008 / EDIT-009 / EDIT-014 / EDIT-018 desktop and phone edit packages, review quantities, download, accept and record signed uploads', {timeout:180000}, async()=>{
 const {packagesJourney}=await import('./packages-journey.mjs');await packagesJourney()
})

test('MOB-001 / EDIT-002 desktop and phone start all five starters, save, replace and start personal templates, preview and accept independent drafts', {timeout:180000}, templatesJourney)


test('MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths', {timeout:180000}, async()=>{
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs')
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   const inbound=inboundMailFixture(),edge=await browserEdge(),mailCalls=[],disputeStatuses=new Map(),disputeUploads=[],disputeDeadline=Math.floor(Date.now()/1000)+86400
   let h,mailboxRefused=false;const mailboxSends=[]
   try{h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,unclaimed:true,auth:{...inbound.settings,AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-1',GOOGLE_MAIL_CLIENT_ID:'synthetic-platter-5501',GOOGLE_MAIL_CLIENT_SECRET:'synthetic-platter-5502',MICROSOFT_MAIL_CLIENT_ID:'synthetic-platter-5503',MICROSOFT_MAIL_CLIENT_SECRET:'synthetic-platter-5504'},outboundService:async request=>{const host=new URL(request.url).hostname;if(['oauth2.googleapis.com','login.microsoftonline.com'].includes(host)){if(mailboxRefused)return Response.json({error:'invalid_grant'},{status:400});return Response.json({access_token:'synthetic-platter-5506',refresh_token:'synthetic-platter-5507',scope:host==='oauth2.googleapis.com'?'openid email https://www.googleapis.com/auth/gmail.send':'User.Read Mail.Send'})}if(host==='gmail.googleapis.com'){if(new URL(request.url).pathname.endsWith('/settings/sendAs'))return Response.json({sendAs:[{sendAsEmail:'connected@synthetic-platter.example',verificationStatus:'accepted'}]});mailboxSends.push({provider:'gmail',body:await request.json()});return Response.json({id:'synthetic-platter-'+(8100+mailboxSends.length)})}if(host==='graph.microsoft.com'){if(request.method==='GET')return Response.json({id:'synthetic-platter-5509',mail:'connected@synthetic-platter.example'});mailboxSends.push({provider:'microsoft',body:await request.json()});return new Response(null,{status:202})}if(host==='files.stripe.com'){const upload=await request.formData();assert.equal(upload.get('purpose'),'dispute_evidence');disputeUploads.push(Buffer.from(await upload.get('file').arrayBuffer()));assert.ok(disputeUploads.at(-1).byteLength>100);return Response.json({id:'synthetic-platter-3601'})}if(host==='api.stripe.com'){if(new URL(request.url).pathname==='/v1/account')return Response.json({id:'synthetic-platter-2700'});const accepted=await h.db.prepare('SELECT * FROM p_acceptances LIMIT 1').first();if(new URL(request.url).pathname.includes('/disputes/')){const id=new URL(request.url).pathname.split('/').at(-1);if(request.method==='GET')return Response.json({id,charge:'synthetic-platter-2701',amount:accepted.deposit_cents,currency:accepted.currency.toLowerCase(),status:disputeStatuses.get(id)??'needs_response',evidence_details:{due_by:disputeDeadline}});assert.equal(new URLSearchParams(await request.text()).get('submit'),'true');disputeStatuses.set(id,'under_review');return Response.json({id,status:'under_review'})}if(request.method==='GET')return Response.json({id:'synthetic-platter-2701',paid:true,status:'succeeded',amount:accepted.deposit_cents,amount_refunded:0,currency:accepted.currency.toLowerCase(),metadata:{platter_proposal_id:accepted.proposal_id,platter_revision:String(accepted.revision)}});const body=new URLSearchParams(await request.text());return Response.json({id:'synthetic-platter-2702',charge:'synthetic-platter-2701',amount:Number(body.get('amount')),status:'succeeded'})}if(host==='api.hubapi.com')return Response.json({portalId:'synthetic-platter-4100'});if(host==='login.salesforce.com')return Response.json({organization_id:'synthetic-platter-4101',user_id:'synthetic-platter-4102'});if(host==='www.googleapis.com')return Response.json({user:{permissionId:'synthetic-platter-4103',emailAddress:'admin@synthetic-platter.example'}});if(host==='slack.com')return Response.json({ok:true,team_id:'synthetic-platter-4104'});if(host==='quickbooks.api.intuit.com')return Response.json({CompanyInfo:{CompanyName:'Synthetic company'}});if(host==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-2200',email:request.headers.get('authorization')==='Bearer synthetic-platter-5506'?'provider@synthetic-platter.example':'sales@synthetic-platter.example',email_verified:true});if(host==='api.resend.com'&&request.method==='GET'){const message=inbound.messages.get(new URL(request.url).pathname.split('/').at(-1));assert.ok(message);return Response.json(message)}assert.equal(host,'api.resend.com');mailCalls.push(await request.json());return Response.json({id:'synthetic-platter-'+mailCalls.length})}});edge.attach(h)}catch(error){await edge.close();throw error}
   app={...h,token:h.auth.SETUP_TOKEN,close:async()=>{await edge.close();await h.close()}}
   const owner=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),sales=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),manager=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),admin=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),editor=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),billing=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),newMember=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),clientContext=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
   try{
    const post=(context,path,data)=>context.request.post(app.origin+path,{headers:{origin:app.origin},data,maxRedirects:0})
    const command=async(context,name,input,status=200)=>{const r=await post(context,'/api/platter/command',{name,input});assert.equal(r.status(),status,await r.text());return r.json()}
    const state=async(context=owner)=>(await context.request.get(app.origin+'/api/platter/state')).json()
    const capture=async(page,name)=>{await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow on '+name+' at '+width);if(screenshots){await page.screenshot({path:join(screenshots,`TEAM-001-${name}-${width}.png`),fullPage:true});await page.screenshot({path:join(screenshots,`TEAM-001-${name}-${width}-viewport.png`)});const heading=name.endsWith('-oauth-mailbox')||name==='mailbox-broken'?'Your mailbox connections':name.endsWith('-sender-attribution')||name.endsWith('-client-reply')||name==='mailbox-fallback'?'Invitation delivery':name.endsWith('-sender-audit')?'Recorded activity':name==='library-audience-consent'?'Shared content library':name==='template-audience-consent'?'Save a personal template':name.endsWith('-recorded-revenue')?'Recorded revenue':name==='admin-workspace-providers'?'Workspace provider connections':name==='approval-discount-settings'?'Approval rules':['manager-optional-costs','manager-selected-costs'].includes(name)?'Internal cost and margin':name.startsWith('billing-dispute')?'Stripe dispute responses':name==='manager-catalog'?'Priced catalog':name==='shared-template-locks'?'Shared templates':name==='manager-invitation'?'Invite a member':name==='team-folders'?'Shared resource folders':null;if(heading)await page.locator('section').filter({has:page.getByRole('heading',{name:heading,exact:true})}).screenshot({path:join(screenshots,`TEAM-001-${name}-${width}-panel.png`)})}}
    assert.equal((await post(owner,'/auth/bootstrap',{token:app.token,displayName:'Synthetic owner'})).status(),303)
    const op=await owner.newPage();await op.goto(app.origin+'/setup');await op.getByRole('checkbox').check();await op.getByRole('button',{name:'Finish setup'}).click()
    const invite=async(context,role)=>{
     const email=role+'@synthetic-platter.example'
     assert.equal((await post(owner,'/auth/invite',{email,displayName:role,role:'member',returnTo:'/app'})).status(),202)
     assert.equal((await post(context,'/auth/magic-link',{email})).status(),202)
     const mail=mailCalls.findLast(m=>m.to.includes(email)),url=mail.text.match(/https?:\/\/[^\s]+\/auth\/confirm\?token=[^\s]+/)[0]
     assert.equal((await post(context,'/auth/confirm',{token:new URL(url).searchParams.get('token')})).status(),303)
     return (await state(context)).actor
    }
    const bp=await invite(billing,'billing'),sp=await invite(sales,'sales'),mp=await invite(manager,'manager'),ep=await invite(editor,'content_editor'),ap=await invite(admin,'admin'),team=await command(owner,'team.create',{name:'East team'})
    await command(owner,'member.set',{operatorId:sp.id,version:0,role:'sales',teams:[team.id]})
    await command(owner,'member.set',{operatorId:mp.id,version:0,role:'manager',teams:[team.id]})
    await command(owner,'member.set',{operatorId:ep.id,version:0,role:'content_editor',teams:[team.id]})
    await command(owner,'member.set',{operatorId:ap.id,version:0,role:'admin',teams:[team.id]})
    await command(owner,'member.set',{operatorId:bp.id,version:0,role:'billing',teams:[]})
    const client=await command(owner,'client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'})
    await op.goto(app.origin+'/app/team');await capture(op,'team')
    await op.goto(app.origin+'/app/approvals');await op.getByLabel('Require approval for every proposal').selectOption('no');await op.getByRole('button',{name:'Save approval policy'}).click()
    await op.getByLabel('Rule name',{exact:true}).fill('Manager above $25,000');await op.getByLabel('First approver').selectOption('role:manager');await op.getByRole('button',{name:'Add approval rule',exact:true}).click();assert.equal(await op.getByRole('alert').count(),0);await capture(op,'approval-settings')
    const settingsPage=await admin.newPage();await settingsPage.goto(app.origin+'/app/settings');await settingsPage.getByLabel('Reminder days after sending',{exact:true}).fill('2, 5');await settingsPage.getByLabel('Default expiry days after sending (empty for no expiry)',{exact:true}).fill('30');await settingsPage.getByRole('button',{name:'Save workspace defaults',exact:true}).click();assert.equal(await settingsPage.getByRole('alert').count(),0);await capture(settingsPage,'admin-defaults');const defaults=(await state(owner)).workspaceDefaults;assert.equal(defaults.expiryDays,30);for(const actor of [sales,manager]){await command(actor,'workspace.defaults',{version:defaults.version,reminderDays:[1],expiryDays:1,paymentMethods:[]},403);assert.deepEqual((await state(owner)).workspaceDefaults,defaults)}
    await settingsPage.getByLabel('QuickBooks Online access token',{exact:true}).fill('synthetic-platter-2201');await settingsPage.getByLabel('QuickBooks company id',{exact:true}).fill('synthetic-platter-2202');const connectForm=settingsPage.locator('form').filter({has:settingsPage.getByRole('button',{name:'Connect QuickBooks Online',exact:true})});await connectForm.getByRole('checkbox').check();await connectForm.getByRole('button',{name:'Connect QuickBooks Online',exact:true}).click();assert.equal(await settingsPage.getByRole('alert').count(),0);await capture(settingsPage,'admin-provider');await settingsPage.getByRole('button',{name:'Disconnect QuickBooks Online',exact:true}).click();assert.equal((await state(owner)).connections.find(c=>c.provider==='quickbooks').status,'disconnected')
    for(const [provider,label] of [['hubspot','HubSpot'],['salesforce','Salesforce'],['google_drive','Google Drive'],['slack','Slack']]){await settingsPage.getByLabel(label+' access token',{exact:true}).fill('synthetic-platter-4110');const f=settingsPage.locator('form').filter({has:settingsPage.getByRole('button',{name:'Connect '+label,exact:true})});await f.getByRole('checkbox').check();await f.getByRole('button').click();assert.equal(await settingsPage.getByRole('alert').count(),0);const c=(await state(owner)).connections.find(c=>c.provider===provider);assert.equal(c.status,'connected');await command(sales,'provider.disconnect',{provider,version:c.version},403);await settingsPage.getByRole('button',{name:'Disconnect '+label,exact:true}).click();assert.equal((await state(owner)).connections.find(c=>c.provider===provider).status,'disconnected')}await capture(settingsPage,'admin-workspace-providers')
    const mailboxPage=await sales.newPage();await mailboxPage.goto(app.origin+'/app/team');await mailboxPage.getByLabel('Google mailbox access token',{exact:true}).fill('synthetic-platter-2203');const mailboxForm=mailboxPage.locator('form').filter({has:mailboxPage.getByRole('button',{name:'Connect Google mailbox',exact:true})});await mailboxForm.getByRole('checkbox').check();await mailboxForm.getByRole('button',{name:'Connect Google mailbox',exact:true}).click();assert.equal(await mailboxPage.getByRole('alert').count(),0);assert.equal((await state(sales)).connections[0].mailboxEmail,sp.email);await capture(mailboxPage,'sales-mailbox')
    const editorPage=await editor.newPage();await editorPage.goto(app.origin+'/app/team');await editorPage.getByRole('link',{name:'Content library',exact:true}).click();await editorPage.getByLabel('Item title',{exact:true}).fill('Synthetic case study');await editorPage.getByLabel('Library text',{exact:true}).fill('A reusable client story');await editorPage.getByRole('button',{name:'Create library item',exact:true}).click();assert.equal(await editorPage.getByRole('alert').count(),0,await editorPage.getByRole('alert').allTextContents());assert.equal((await state(owner)).libraryItems.length,1);const editLibrary=editorPage.locator('form:has(input[name=id])').first();await editLibrary.getByLabel('Library text',{exact:true}).fill('The case study updated by its content editor');await editLibrary.getByRole('button',{name:'Save library item',exact:true}).click();assert.equal(await editorPage.getByRole('alert').count(),0);assert.equal((await state(owner)).libraryItems[0].content,'The case study updated by its content editor');await capture(editorPage,'editor-library')
    const page=await sales.newPage();await page.goto(app.origin+'/app')
    await page.getByLabel('Starter template',{exact:true}).selectOption('starter:consultancy');await page.getByLabel('Client for starter proposal',{exact:true}).selectOption(client.id);await page.getByRole('button',{name:'Start starter proposal',exact:true}).click()
    const draft=(await state(sales)).proposals[0];assert.equal(draft.sales_owner_id,sp.id)
    assert.equal(await page.getByRole('button',{name:'Approve this revision',exact:true}).count(),0)
    for(const input of await page.locator('[data-pricing-field=unitPrice]').all())await input.fill('15000');await page.getByRole('button',{name:'Save revision',exact:true}).click()
    let high=(await state(sales)).proposals[0]
    await command(sales,'proposal.approve',{id:high.id,version:high.version,revision:high.revision},403)
    await capture(page,'sales-awaiting');assert.equal(await page.getByRole('heading',{name:'Internal cost and margin',exact:true}).count(),0)
    await command(owner,'proposal.share',{id:high.id,operatorId:ep.id});await editorPage.goto(app.origin+'/app/proposal?id='+high.id);assert.equal(await editorPage.getByRole('button',{name:'Save revision',exact:true}).count(),1);assert.equal(await editorPage.getByRole('button',{name:'Send approved proposal',exact:true}).count(),0);await command(editor,'proposal.send',{id:high.id,version:high.version},403);await capture(editorPage,'editor-proposal')
    const review=await manager.newPage();await review.goto(app.origin+'/app/proposal?id='+high.id);const costs=review.locator('section').filter({has:review.getByRole('heading',{name:'Internal cost and margin',exact:true})});await costs.getByLabel('Internal unit cost',{exact:true}).first().fill('500');await costs.getByRole('button',{name:'Save internal cost',exact:true}).first().click();assert.equal(await review.getByRole('alert').count(),0);high=(await state(sales)).proposals.find(p=>p.id===high.id);assert.equal((await sales.request.get(app.origin+'/api/platter/internal-pricing.pdf?id='+high.id+'&revision='+high.revision)).status(),403);await capture(review,'manager-costs');await review.getByRole('button',{name:'Approve this revision',exact:true}).click();assert.equal(await review.getByRole('alert').count(),0);await capture(review,'manager-approved')
    await page.reload();await page.getByRole('button',{name:'Send approved proposal',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    const sent=(await state(sales)).proposals.find(p=>p.id===high.id);assert.equal(sent.status,'sent');assert.equal(sent.approved_by,mp.email)
    await capture(page,'sales-sent')
    const path='/p/'+sent.shareToken,clientPage=await clientContext.newPage();await clientPage.goto(app.origin+path);await clientPage.getByRole('button',{name:'Send verification code',exact:true}).click()
    const mail=(await app.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC").bind(high.id).first()).body
    await clientPage.getByLabel('Email verification code',{exact:true}).fill(mail.match(/\b\d{6}\b/)[0]);await clientPage.getByRole('button',{name:'Verify email',exact:true}).click()
    await clientPage.getByLabel('Your question',{exact:true}).fill('Can the project begin next month?');await clientPage.getByRole('button',{name:'Send question to owner',exact:true}).click()
    await page.reload();await page.getByLabel('Answer this question',{exact:true}).fill('Yes, we can begin next month.');await page.getByRole('button',{name:'Send answer to client',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    await clientPage.reload();assert.match(await clientPage.locator('main').innerText(),/Yes, we can begin next month\./)
    await page.getByLabel('Next action',{exact:true}).fill('Call to confirm the start date');await page.getByRole('button',{name:'Save sales follow-up',exact:true}).click();await page.goto(app.origin+'/app')
    assert.match(await page.getByRole('list',{name:'Sales follow-ups',exact:true}).innerText(),/Call to confirm the start date/);await capture(page,'sales-queue')
    await page.goto(app.origin+'/app/proposal?id='+high.id);await page.getByLabel('Template name',{exact:true}).fill('Sales personal template');await page.getByRole('button',{name:'Save personal template',exact:true}).click()
    await page.goto(app.origin+'/app');await page.getByRole('button',{name:'Start from Sales personal template',exact:true}).click();const copy=(await state(sales)).proposals.find(p=>p.id!==high.id);assert.ok(copy);assert.equal(copy.approved_by,null)
    const report=await sales.request.get(app.origin+'/api/platter/pipeline?status=awaiting-approval&sort=value');assert.equal(report.status(),200);assert.equal((await report.json()).count,1)
    await clientPage.getByRole('button',{name:'Stop email reminders',exact:true}).click();assert.match(await clientPage.locator('main').innerText(),/Email reminders are stopped for this revision/);assert.equal((await state(sales)).proposals.find(p=>p.id===high.id).status,'sent');assert.ok(await clientPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(clientPage,'client-reminder-opt-out')
    await clientPage.getByRole('radio').first().check();await clientPage.getByLabel('Your full name',{exact:true}).fill('Synthetic client');await clientPage.getByRole('checkbox').check();await clientPage.getByRole('button',{name:'Accept proposal',exact:true}).click();assert.match(await clientPage.locator('main').innerText(),/Proposal accepted/)
    await command(owner,'provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-2703',webhookSecret:'synthetic-platter-2704',consent:true})
    const billingPage=await billing.newPage();await billingPage.goto(app.origin+'/app/proposal?id='+high.id);await billingPage.getByLabel('Stripe deposit charge id',{exact:true}).fill('synthetic-platter-2701');const bindForm=billingPage.locator('form').filter({has:billingPage.getByRole('button',{name:'Verify and link Stripe deposit',exact:true})});await bindForm.getByRole('checkbox').check();await bindForm.getByRole('button').click();assert.equal(await billingPage.getByRole('alert').count(),0);const payment=(await state(billing)).paymentRecords[0];await command(sales,'payment.refund',{paymentId:payment.id,amount:'100',requestId:'synthetic-platter-2705',reason:'Synthetic refund',consent:true},403)
    await billingPage.getByLabel('Refund amount',{exact:true}).fill('100');await billingPage.getByLabel('Refund reason',{exact:true}).fill('Synthetic partial refund');const refundForm=billingPage.locator('form').filter({has:billingPage.getByRole('button',{name:'Refund Stripe deposit',exact:true})});await refundForm.getByRole('checkbox').check();await refundForm.getByRole('button').click();assert.equal(await billingPage.getByRole('alert').count(),0);assert.equal((await state(billing)).paymentRecords[0].refunds[0].status,'succeeded');await capture(billingPage,'billing-refund')
    await billingPage.getByLabel('Stripe dispute id',{exact:true}).fill('synthetic-platter-3600');await billingPage.getByRole('button',{name:'Verify Stripe dispute',exact:true}).click();assert.equal(await billingPage.getByRole('alert').count(),0);await capture(billingPage,'billing-dispute');await command(sales,'dispute.submit',{disputeId:'synthetic-platter-3600',version:1,requestId:'synthetic-platter-3602',note:'Unauthorized response',consent:true},403)
    await billingPage.getByLabel('Dispute response note',{exact:true}).fill('The service was delivered as accepted.');await billingPage.getByRole('button',{name:'Prepare exact evidence packet',exact:true}).click();assert.equal(await billingPage.getByRole('alert').count(),0)
    const evidenceLink=await billingPage.getByRole('link',{name:'Review exact prepared packet PDF',exact:true}).getAttribute('href'),preview=await billing.request.get(app.origin+evidenceLink);assert.equal(preview.status(),200)
    const previewBytes=await preview.body(),previewHash=Buffer.from(await crypto.subtle.digest('SHA-256',previewBytes)).toString('hex')
    assert.match(await billingPage.locator('main').innerText(),new RegExp(previewHash));assert.equal(disputeUploads.length,0);await capture(billingPage,'billing-dispute-prepared')
    const evidenceForm=billingPage.locator('form').filter({has:billingPage.getByRole('button',{name:'Authorize exact packet',exact:true})});await evidenceForm.getByRole('checkbox').check();await evidenceForm.getByRole('button').click();assert.equal(await billingPage.getByRole('alert').count(),0);assert.equal(disputeUploads.length,0);await capture(billingPage,'billing-dispute-authorized')
    await billingPage.getByRole('button',{name:'Submit authorized packet to Stripe',exact:true}).click();assert.equal(await billingPage.getByRole('alert').count(),0)
    const dispute=(await state(billing)).disputes[0];assert.equal(dispute.status,'under_review');assert.equal(dispute.submissions[0].status,'submitted');assert.equal(disputeUploads.length,1);assert.deepEqual(disputeUploads[0],previewBytes)
    const retained=await billing.request.get(app.origin+await billingPage.getByRole('link',{name:'Download retained submission PDF',exact:true}).getAttribute('href'));assert.equal(retained.status(),200);assert.deepEqual(await retained.body(),previewBytes);assert.equal(previewHash,dispute.submissions[0].document_hash);await capture(billingPage,'billing-dispute-submitted')

    for(const [reportPage,name] of [[page,'sales'],[review,'manager'],[billingPage,'billing']]){await reportPage.goto(app.origin+'/app?view=recorded-revenue&sort=value');const report=reportPage.locator('section').filter({has:reportPage.getByRole('heading',{name:'Recorded revenue',exact:true})});assert.match(await report.innerText(),/Net received/);assert.match(await report.innerText(),/\$8,900\.00 USD/);await capture(reportPage,name+'-recorded-revenue')}
    await op.goto(app.origin+'/app?view=recorded-revenue&sort=value');const exportPanel=op.locator('section').filter({has:op.getByRole('heading',{name:'Report export and email',exact:true})});const financialCsv=await owner.request.get(app.origin+await exportPanel.getByRole('link',{name:'Download recorded revenue CSV',exact:true}).getAttribute('href'));assert.equal(financialCsv.status(),200);assert.match(await financialCsv.text(),/8900\.00/);await exportPanel.getByRole('checkbox').first().check();await exportPanel.getByRole('button',{name:'Schedule report email',exact:true}).click();assert.equal(await op.getByRole('alert').count(),0);assert.ok((await state()).reportSchedules.some(s=>s.filters==='view=recorded-revenue&sort=value'));await capture(op,'owner-recorded-revenue');await op.getByRole('button',{name:'Stop this schedule',exact:true}).click()


    const simple=await command(sales,'template.start',{id:'starter:consultancy',version:1,clientId:client.id});await command(sales,'proposal.document',{id:simple.id,version:1,document:{version:1,blocks:[{id:'warranty',type:'columns',title:'Warranty',text:'Our warranty',second:'Warranty limitations'},{id:'legal',type:'terms',title:'Legal terms',text:'Written approval required'},{id:'notes',type:'text',title:'Notes',text:'Editable notes'}]}});await page.goto(app.origin+'/app/proposal?id='+simple.id);assert.equal(await page.getByRole('button',{name:'Send proposal',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Approve this revision',exact:true}).count(),0);await capture(page,'sales-unruled');await page.getByRole('button',{name:'Send proposal',exact:true}).click();assert.equal((await state(sales)).proposals.find(p=>p.id===simple.id).status,'sent')
    await op.goto(app.origin+'/app/team');const folderForm=op.locator('form').filter({has:op.getByRole('button',{name:'Create shared folder',exact:true})});await folderForm.getByLabel('Folder name',{exact:true}).fill('East templates');await folderForm.getByRole('checkbox',{name:'East team',exact:true}).check();await folderForm.getByRole('checkbox',{name:'I authorize this folder’s visibility for its contents.',exact:true}).check();await folderForm.getByRole('button').click();assert.equal(await op.getByRole('alert').count(),0);const folder=(await state(owner)).resourceFolders.find(f=>f.name==='East templates');await capture(op,'team-folders')
    await review.goto(app.origin+'/app/team');const inviteForm=review.locator('form').filter({has:review.getByRole('button',{name:'Send member invitation',exact:true})});await inviteForm.getByLabel('New member name',{exact:true}).fill('New salesperson');await inviteForm.getByLabel('New member email',{exact:true}).fill('delegated@synthetic-platter.example');await inviteForm.getByLabel('New member role',{exact:true}).selectOption('sales');await inviteForm.getByRole('checkbox',{name:'East team',exact:true}).check();await inviteForm.getByRole('button').click();assert.equal(await review.getByRole('alert').count(),0);await capture(review,'manager-invitation');const delegatedMail=mailCalls.findLast(m=>m.to.includes('delegated@synthetic-platter.example')),delegatedToken=new URL(delegatedMail.text.match(/https?:\/\/[^\s]+\/auth\/confirm\?token=[^\s]+/)[0]).searchParams.get('token');const admission=await post(newMember,'/auth/confirm',{token:delegatedToken});assert.equal(admission.status(),303,await admission.text());const joined=await state(newMember);assert.equal(joined.actor.role,'sales');assert.deepEqual(joined.teams.map(t=>t.id),[team.id]);const joinedPage=await newMember.newPage();await joinedPage.goto(app.origin+'/app/team');await capture(joinedPage,'invited-sales-member')
    await command(owner,'proposal.share',{id:simple.id,operatorId:ep.id});await editorPage.goto(app.origin+'/app/proposal?id='+simple.id);const sharedForm=editorPage.locator('form').filter({has:editorPage.getByRole('button',{name:'Save shared template',exact:true})});await sharedForm.getByLabel('Shared template name',{exact:true}).fill('Shared legal');await sharedForm.getByLabel('Resource folder',{exact:true}).selectOption(folder.id);await sharedForm.getByRole('checkbox').check();await sharedForm.getByRole('button').click();assert.equal(await editorPage.getByRole('alert').count(),0)
    await editorPage.goto(app.origin+'/app');const lockForm=editorPage.locator('form').filter({has:editorPage.getByRole('button',{name:'Save template locks',exact:true})});await lockForm.getByRole('checkbox',{name:'Block: Warranty',exact:true}).check();await lockForm.getByRole('checkbox',{name:'Block: Legal terms',exact:true}).check();await lockForm.getByRole('checkbox',{name:'terms',exact:true}).check();await lockForm.getByRole('button').click();assert.equal(await editorPage.getByRole('alert').count(),0);await capture(editorPage,'shared-template-locks')
    const policy=(await state(owner)).approvalSettings.policy;await command(owner,'approval.rule',{version:policy.version,name:'Legal changes',position:1,condition:{kind:'termsEdited'},approvers:['person:'+ap.id]})
    await page.goto(app.origin+'/app');await page.getByRole('button',{name:'Start from Shared legal',exact:true}).click();const locked=(await state(sales)).proposals.find(p=>p.lockedSections?.includes('terms'));assert.ok(locked);const originalTerms=locked.terms
    await page.getByLabel('Terms',{exact:true}).fill('Changed payment terms');const refusal=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('proposal.revise'));await page.getByRole('button',{name:'Save revision',exact:true}).click();assert.equal((await refusal).status(),403);assert.equal((await state(sales)).proposals.find(p=>p.id===locked.id).terms,originalTerms);await capture(page,'sales-locked-refusal')
    await page.goto(app.origin+'/app/proposal?id='+locked.id)
    const warranty=page.locator('[data-block-id="warranty"]'),legal=page.locator('[data-block-id="legal"]')
    assert.equal(await warranty.getByLabel('First column',{exact:true}).isDisabled(),true);assert.equal(await warranty.getByLabel('Second column',{exact:true}).isDisabled(),true);assert.equal(await legal.getByLabel('Block text',{exact:true}).isDisabled(),true)
    assert.equal(await warranty.getByRole('button',{name:'Delete block',exact:true}).isDisabled(),true)
    assert.equal(await page.locator('[data-block-id="notes"]').getByLabel('Block text',{exact:true}).isEnabled(),true)
    const move=warranty.getByRole('button',{name:'Move down',exact:true}),tooltip=warranty.getByRole('tooltip').filter({hasText:'Move down'})
    await move.focus();assert.equal(await tooltip.isVisible(),true);await move.hover();await page.waitForTimeout(350);assert.equal(await tooltip.isVisible(),true)
    await move.click();await page.waitForFunction(()=>document.querySelector('[data-document-editor]').dataset.saveState==='saved')
    const movedLocked=(await state(sales)).proposals.find(p=>p.id===locked.id);assert.equal(movedLocked.document.blocks[1].id,'warranty');assert.equal(movedLocked.document.blocks[1].second,'Warranty limitations')
    const forbidden=structuredClone(movedLocked.document);forbidden.blocks.find(b=>b.id==='warranty').second='Forbidden edit'
    await command(sales,'proposal.document',{id:locked.id,version:movedLocked.version,document:forbidden},403)
    await capture(page,'sales-rich-block-locks')
    await command(sales,'proposal.share',{id:locked.id,operatorId:ep.id});await command(editor,'proposal.unlock',{id:locked.id,version:movedLocked.version,section:'block:warranty'},403);await command(editor,'proposal.unlock',{id:locked.id,version:movedLocked.version,section:'terms'},403)
    await editorPage.goto(app.origin+'/app/proposal?id='+locked.id);assert.equal(await editorPage.getByRole('button',{name:'Unlock Block: Warranty in this proposal',exact:true}).count(),0)
    await command(sales,'proposal.share',{id:locked.id,operatorId:ep.id,shared:false});await command(editor,'proposal.document',{id:locked.id,version:movedLocked.version,document:movedLocked.document},403)
    await settingsPage.goto(app.origin+'/app/proposal?id='+locked.id);await settingsPage.getByRole('button',{name:'Unlock Block: Warranty in this proposal',exact:true}).click();assert.equal(await settingsPage.getByRole('alert').count(),0)
    await settingsPage.getByRole('button',{name:'Unlock Block: Legal terms in this proposal',exact:true}).click();assert.equal(await settingsPage.getByRole('alert').count(),0)
    await capture(settingsPage,'admin-rich-block-unlocks')
    await settingsPage.goto(app.origin+'/app/proposal?id='+locked.id);await settingsPage.getByRole('button',{name:'Unlock terms in this proposal',exact:true}).click();assert.equal(await settingsPage.getByRole('alert').count(),0);await settingsPage.locator('[data-block-id=legal]').getByLabel('Block text',{exact:true}).fill('Amended rich legal terms');await settingsPage.waitForFunction(()=>document.querySelector('[data-document-editor]').dataset.saveState==='saved');await settingsPage.getByLabel('Terms',{exact:true}).fill('Changed payment terms');await settingsPage.getByRole('button',{name:'Save revision',exact:true}).click();assert.equal(await settingsPage.getByRole('alert').count(),0);const unlocked=(await state(sales)).proposals.find(p=>p.id===locked.id);assert.equal(unlocked.approval.required,true);assert.equal(unlocked.approval.complete,false);assert.equal(unlocked.approval.steps[0].name,'Legal changes');await command(sales,'proposal.send',{id:locked.id,version:unlocked.version},409);await capture(settingsPage,'admin-unlocked-legal-review');await settingsPage.getByRole('button',{name:'Approve this revision',exact:true}).click();await command(sales,'proposal.send',{id:locked.id,version:unlocked.version+1});const unlockAudit=await owner.request.get(app.origin+'/api/platter/audit?action=proposal.unlock');assert.ok((await unlockAudit.json()).rows.some(r=>r.actor_id===ap.id&&r.subject===locked.id))

    await review.goto(app.origin+'/app/team');await review.getByRole('link',{name:'Catalog items and prices',exact:true}).click();const createItem=review.locator('form').filter({has:review.getByRole('button',{name:'Create catalog item',exact:true})});await createItem.getByLabel('Item name',{exact:true}).fill('Synthetic catalog service');await createItem.getByLabel('SKU',{exact:true}).fill('synthetic-platter-3200');await createItem.getByLabel('Item description',{exact:true}).fill('Reviewed service description');await createItem.getByLabel('Unit',{exact:true}).selectOption('hour');await createItem.getByLabel('USD unit price',{exact:true}).fill('100');await createItem.getByLabel('Internal unit cost (optional)',{exact:true}).fill('25');await createItem.getByRole('button').click();assert.equal(await review.getByRole('alert').count(),0);const catalog=(await state(manager)).catalogItems[0];await capture(review,'manager-catalog')
    const catalogDraft=await command(sales,'template.start',{id:'starter:consultancy',version:1,clientId:client.id});await page.goto(app.origin+'/app/proposal?id='+catalogDraft.id);const addItem=page.locator('form').filter({has:page.getByRole('button',{name:'Add Synthetic catalog service to proposal',exact:true})});await addItem.getByLabel('Catalog quantity',{exact:true}).fill('2');await addItem.getByRole('button').click();assert.equal(await page.getByRole('alert').count(),0);assert.equal((await state(sales)).proposals.find(p=>p.id===catalogDraft.id).options[0].tables.at(-1).lines[0].unitPrice,'100.00');assert.equal(await page.getByRole('heading',{name:'Internal cost and margin',exact:true}).count(),0);await capture(page,'sales-catalog-draft');await page.getByRole('button',{name:'Send proposal',exact:true}).click();const sentCatalog=(await state(sales)).proposals.find(p=>p.id===catalogDraft.id),frozenCatalog=JSON.stringify(sentCatalog.options)
    const editItem=review.locator('form').filter({has:review.getByRole('button',{name:'Save catalog item',exact:true})});await editItem.getByLabel('USD unit price',{exact:true}).fill('150');await editItem.getByRole('button').click();assert.equal(await review.getByRole('alert').count(),0);assert.equal(JSON.stringify((await state(sales)).proposals.find(p=>p.id===catalogDraft.id).options),frozenCatalog);const newCatalogDraft=await command(sales,'template.start',{id:'starter:consultancy',version:1,clientId:client.id});await command(sales,'catalog.insert',{id:newCatalogDraft.id,version:1,catalogId:catalog.id,catalogVersion:2,optionId:'one',quantity:'2'});assert.equal((await state(sales)).proposals.find(p=>p.id===newCatalogDraft.id).options[0].tables.at(-1).lines[0].unitPrice,'150.00')
    const optionalDraft=await command(sales,'proposal.prepare',{clientId:client.id,title:'Synthetic optional costing',scope:'Public delivery',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'100',optionalItems:[{id:'rush',label:'Rush delivery',unitPrice:'10',min:1,max:5,quantity:2,editable:true}]},{id:'alternative',label:'Alternative',price:'200'}],pricingTables:[{optionId:'main',name:'Services',lines:[{name:'Delivery work',description:'Public delivery',quantity:'1',unit:'project',unitPrice:'100'}]}]});await review.goto(app.origin+'/app/proposal?id='+optionalDraft.id);const optionalCosts=review.locator('section').filter({has:review.getByRole('heading',{name:'Internal cost and margin',exact:true})});for(const [index,value] of ['40','3.17','80'].entries()){await optionalCosts.getByLabel('Internal unit cost',{exact:true}).nth(index).fill(value);await optionalCosts.getByRole('button',{name:'Save internal cost',exact:true}).nth(index).click();assert.equal(await review.getByRole('alert').count(),0)}assert.equal(await review.getByLabel('Displayed package margin',{exact:true}).textContent(),'USD 60.00');await capture(review,'manager-optional-costs');await review.getByLabel('Total for package',{exact:true}).selectOption('alternative');await review.getByRole('button',{name:'View total margin',exact:true}).click();assert.equal(await review.getByLabel('Displayed package margin',{exact:true}).textContent(),'USD 120.00')
    await command(sales,'proposal.send',{id:optionalDraft.id,version:4});const optionalOffer=(await state(sales)).proposals.find(p=>p.id===optionalDraft.id),optionalPath='/p/'+optionalOffer.shareToken;assert.equal(Object.hasOwn(optionalOffer,'internalPricing'),false);await clientPage.goto(app.origin+optionalPath);await clientPage.getByRole('button',{name:'Send verification code',exact:true}).click();const optionalCode=(await app.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC").bind(optionalDraft.id).first()).body.match(/\b\d{6}\b/)[0];await clientPage.getByLabel('Email verification code',{exact:true}).fill(optionalCode);await clientPage.getByRole('button',{name:'Verify email',exact:true}).click();assert.equal((await post(clientContext,optionalPath+'/action?name=accept',{name:'Casey Synthetic',optionId:'main',items:[{id:'rush',quantity:3}],consent:true})).status(),200);const clientData=await clientContext.request.get(app.origin+optionalPath+'/data.json');assert.equal(clientData.status(),200);const clientPayload=await clientData.json();assert.equal(clientPayload.selection.totalCents,13000);assert.doesNotMatch(JSON.stringify(clientPayload),/internalPricing|unitCost|margin|owner_email|owner_id|token/);await review.goto(app.origin+'/app/proposal?id='+optionalDraft.id);assert.equal(await review.getByLabel('Displayed package margin',{exact:true}).textContent(),'USD 80.49');await capture(review,'manager-selected-costs')
    await op.goto(app.origin+'/app/approvals');await op.getByLabel('Rule name',{exact:true}).fill('Owner above 15% discount');await op.getByLabel('Sequence order',{exact:true}).fill('2');await op.getByLabel('Condition',{exact:true}).selectOption('discountOver');await op.getByLabel('Percentage threshold (discount or margin rule)',{exact:true}).fill('15');await op.getByLabel('First approver',{exact:true}).selectOption('role:owner');await op.getByRole('button',{name:'Add approval rule',exact:true}).click();assert.equal(await op.getByRole('alert').count(),0);await capture(op,'approval-discount-settings')
    const discounted=await command(sales,'proposal.prepare',{clientId:client.id,title:'Synthetic $30,000 approval',scope:'Public delivery',depositPercent:'25',packages:[{id:'main',label:'Delivery',price:'30000'}]});await page.goto(app.origin+'/app/proposal?id='+discounted.id);await page.getByLabel('Package discount (%)',{exact:true}).fill('20');await page.getByRole('button',{name:'Save revision',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0);let discountRow=(await state(sales)).proposals.find(p=>p.id===discounted.id);assert.equal(discountRow.options[0].cents,2400000);assert.equal(discountRow.approval.steps.length,2);await capture(page,'sales-discount-awaiting')
    await review.goto(app.origin+'/app/proposal?id='+discounted.id);await review.getByRole('button',{name:'Approve this revision',exact:true}).click();assert.equal(await review.getByRole('alert').count(),0);await page.reload();await page.getByLabel('Scope of work',{exact:true}).fill('Changed after manager approval');await page.getByRole('button',{name:'Save revision',exact:true}).click();discountRow=(await state(sales)).proposals.find(p=>p.id===discounted.id);assert.ok(discountRow.approval.steps.every(s=>!s.done));await command(sales,'proposal.send',{id:discounted.id,version:discountRow.version},409);await review.reload();await review.getByRole('button',{name:'Approve this revision',exact:true}).click();await op.goto(app.origin+'/app/proposal?id='+discounted.id);await op.getByRole('button',{name:'Approve this revision',exact:true}).click();assert.equal(await op.getByRole('alert').count(),0);await capture(op,'owner-discount-approved');await page.reload();await page.getByRole('button',{name:'Send approved proposal',exact:true}).click();discountRow=(await state(sales)).proposals.find(p=>p.id===discounted.id);assert.equal(discountRow.status,'sent')
    const discountedPath='/p/'+discountRow.shareToken;await clientPage.goto(app.origin+discountedPath);assert.match(await clientPage.locator('main').innerText(),/20% off/);assert.doesNotMatch(await clientPage.locator('main').innerText(),/Internal cost/);await capture(clientPage,'client-discount-offer');await clientPage.getByRole('button',{name:'Send verification code',exact:true}).click();const discountCode=(await app.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC").bind(discounted.id).first()).body.match(/\b\d{6}\b/)[0];await clientPage.getByLabel('Email verification code',{exact:true}).fill(discountCode);await clientPage.getByRole('button',{name:'Verify email',exact:true}).click();await clientPage.getByRole('radio').check();await clientPage.getByLabel('Your full name',{exact:true}).fill('Synthetic client');await clientPage.getByRole('checkbox').check();await clientPage.getByRole('button',{name:'Accept proposal',exact:true}).click();assert.match(await clientPage.locator('main').innerText(),/Proposal accepted/);assert.equal((await state(sales)).proposals.find(p=>p.id===discounted.id).acceptance.totalCents,2400000);await capture(clientPage,'client-discount-accepted')
    const sharedLegal=(await state(owner)).templates.find(t=>t.name==='Shared legal')
    const foreignDraft=await command(owner,'template.start',{id:sharedLegal.id,version:sharedLegal.version,clientId:client.id,title:'Out-of-team shared proposal'})
    await command(owner,'proposal.share',{id:foreignDraft.id,operatorId:mp.id})
    await review.goto(app.origin+'/app/proposal?id='+foreignDraft.id)
    assert.equal(await review.getByRole('button',{name:'Save revision',exact:true}).count(),1)
    assert.equal(await review.getByRole('button',{name:/^(Send|Approve|Unlock)/}).count(),0)
    await capture(review,'out-of-team-manager')
    await command(owner,'proposal.share',{id:foreignDraft.id,operatorId:mp.id,shared:false})
    assert.equal((await manager.request.get(app.origin+'/app/proposal?id='+foreignDraft.id)).status(),403)
    const audienceFolder=await command(owner,'folder.save',{kind:'library',name:'East audience',teams:[team.id],shareConsent:true})
    const audienceItem=await command(editor,'library.save',{title:'East audience item',kind:'bio',content:'Approved team biography',folderId:audienceFolder.id})
    await editorPage.goto(app.origin+'/app/library')
    const audienceForm=editorPage.locator('form').filter({has:editorPage.locator('input[name=id][value="'+audienceItem.id+'"]')})
    await audienceForm.getByLabel('Resource folder',{exact:true}).selectOption('')
    await audienceForm.getByRole('button',{name:'Save library item',exact:true}).click()
    assert.equal(await editorPage.getByRole('alert').count(),1)
    assert.equal((await state(editor)).libraryItems.find(i=>i.id===audienceItem.id).folder_id,audienceFolder.id)
    await audienceForm.getByRole('checkbox').check()
    await audienceForm.getByLabel('Resource folder',{exact:true}).selectOption('')
    await audienceForm.getByRole('button',{name:'Save library item',exact:true}).click()
    assert.equal(await editorPage.getByRole('alert').count(),0)
    assert.equal((await state(editor)).libraryItems.find(i=>i.id===audienceItem.id).folder_id,null)
    await capture(editorPage,'library-audience-consent')
    await editorPage.goto(app.origin+'/app/proposal?id='+simple.id)
    await editorPage.getByText('Replace an existing personal template',{exact:true}).click()
    const replaceShared=editorPage.locator('form').filter({has:editorPage.getByRole('button',{name:'Replace Shared legal with this revision',exact:true})})
    await replaceShared.getByLabel('Resource folder',{exact:true}).selectOption('')
    await replaceShared.getByRole('button').click()
    assert.equal(await editorPage.getByRole('alert').count(),1)
    assert.equal((await state(editor)).templates.find(t=>t.id===sharedLegal.id).folder_id,folder.id)
    await editorPage.getByText('Replace an existing personal template',{exact:true}).click()
    await replaceShared.getByLabel('Resource folder',{exact:true}).selectOption('')
    await replaceShared.getByRole('checkbox').check()
    await replaceShared.getByRole('button').click()
    assert.equal(await editorPage.getByRole('alert').count(),0)
    assert.equal((await state(editor)).templates.find(t=>t.id===sharedLegal.id).folder_id,null)
    await capture(editorPage,'template-audience-consent')
    await sales.route(/https:\/\/(accounts\.google\.com|login\.microsoftonline\.com)\//,async route=>{
     const requestUrl=new URL(route.request().url()),callback=app.origin+'/api/platter/mailbox/callback?'+new URLSearchParams({state:requestUrl.searchParams.get('state'),code:'synthetic-platter-5510'})
     assert.equal(requestUrl.searchParams.get('code_challenge_method'),'S256')
     await route.fulfill({contentType:'text/html',body:'<a href="'+callback.replaceAll('&','&amp;')+'">Authorize synthetic provider</a>'})
    })
    for(const [provider,label] of [['gmail','Google mailbox'],['microsoft','Microsoft mailbox']]){
     await mailboxPage.goto(app.origin+'/app/team')
     const oauthForm=mailboxPage.locator('form').filter({has:mailboxPage.getByRole('button',{name:'Authorize '+label,exact:true})})
     await oauthForm.getByLabel('Sending address (optional)',{exact:true}).fill('connected@synthetic-platter.example')
     await oauthForm.getByRole('checkbox').check();await oauthForm.getByRole('button').click()
     await capture(mailboxPage,provider+'-authorization')
     await mailboxPage.getByRole('link',{name:'Continue to provider',exact:true}).click()
     await mailboxPage.getByRole('link',{name:'Authorize synthetic provider',exact:true}).click()
     assert.equal((await state(sales)).connections.find(c=>c.provider===provider).mailboxEmail,'connected@synthetic-platter.example')
     await capture(mailboxPage,provider+'-oauth-mailbox')
     const outgoing=await command(sales,'template.start',{id:'starter:consultancy',version:1,clientId:client.id})
     await page.goto(app.origin+'/app/proposal?id='+outgoing.id);await page.getByRole('checkbox',{name:/Allow one client email reply/}).check();await page.getByRole('button',{name:'Send this invitation',exact:true}).click()
     assert.equal(await page.getByRole('alert').count(),0);const receipt=(await state(sales)).proposals.find(p=>p.id===outgoing.id).mailAttributions[0]
     assert.equal(receipt.route,provider);assert.equal(receipt.sender_address,'connected@synthetic-platter.example');assert.equal(receipt.outcome,'accepted')
     assert.match(await page.locator('main').innerText(),/connected@synthetic-platter.example/);await capture(page,provider+'-sender-attribution')
     const wire=mailboxSends.at(-1).body,replyAddress=provider==='gmail'?Buffer.from(wire.raw,'base64url').toString('utf8').match(/\r\nReply-To: ([^\r\n]+)/)[1]:wire.message.replyTo[0].emailAddress.address
     const reply=await inbound.deliver(h,replyAddress,'client@synthetic-platter.example','Client reply to '+provider+': Monday works for us.')
     assert.equal(reply.status,201,reply.text);await page.reload();assert.match(await page.locator('main').innerText(),/Monday works for us/)
     const replyText=await page.locator('main').innerText();assert.match(replyText,/Claimed From: client@synthetic-platter.example/);assert.match(replyText,/Resend SPF: pass · DKIM: pass/);assert.match(replyText,/From address is not proven client identity/);assert.match(replyText,/does not approve, sign or change the proposal/);assert.equal((await state(sales)).proposals.find(p=>p.id===outgoing.id).status,'sent');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(page,provider+'-client-reply')
     assert.equal((await inbound.deliver(h,replyAddress,'client@synthetic-platter.example','Out of office',{message:{headers:{'Auto-Submitted':'auto-replied'}}})).status,204)
     assert.equal((await state(owner)).replyCapNotices.filter(n=>n.proposal_id===outgoing.id).length,1)
     for(let i=0;i<2;i++)assert.equal((await inbound.deliver(h,replyAddress,'client@synthetic-platter.example','Another reply')).status,409)
     await op.goto(app.origin+'/app');assert.equal((await state(owner)).replyCapNotices.filter(n=>n.proposal_id===outgoing.id).length,1);assert.match(await op.locator('main').innerText(),/Email reply limits/);assert.ok(await op.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(op,provider+'-reply-limit')
     const remindVersion=(await state(sales)).proposals.find(p=>p.id===outgoing.id).version;await command(sales,'reminder.configure',{id:outgoing.id,version:remindVersion,enabled:false,timeZone:'America/Los_Angeles'})
     await command(sales,'reminder.send',{id:outgoing.id,requestId:'synthetic-platter-manual-'+provider,subject:'Manual '+provider+' follow-up',message:'Please review the proposed start date.'});await page.reload();assert.match(await page.locator('main').innerText(),/Manual email reminder/);assert.match(await page.locator('main').innerText(),/Please review the proposed start date/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await capture(page,provider+'-manual-reminder')
     await op.goto(app.origin+'/app/audit?action=mail.client-reply&subject='+outgoing.id);assert.match(await op.locator('main').innerText(),/An email sender \(identity unproven\)/);await capture(op,provider+'-reply-audit')
     await op.goto(app.origin+'/app/audit?action=mail.accepted&subject='+outgoing.id);assert.match(await op.locator('main').innerText(),/connected@synthetic-platter.example/);await capture(op,provider+'-sender-audit')
    }
    assert.equal(mailboxSends.length,4)
    mailboxRefused=true
    const fallbackDraft=await command(sales,'template.start',{id:'starter:consultancy',version:1,clientId:client.id})
    await page.goto(app.origin+'/app/proposal?id='+fallbackDraft.id);await page.getByRole('button',{name:'Send proposal',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/Mailbox unavailable; sent through the installation sender/);assert.equal(mailboxSends.length,4);await capture(page,'mailbox-fallback')
    await mailboxPage.goto(app.origin+'/app/team');assert.match(await mailboxPage.locator('main').innerText(),/broken/);await capture(mailboxPage,'mailbox-broken')
   }finally{await owner.close();await sales.close();await manager.close();await admin.close();await editor.close();await clientContext.close();await newMember.close();await billing.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('APPROVE-002 email preview and decision links work under a member session at desktop and phone widths', {timeout:120000},async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS;if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp({scheduled:true});const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage()
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic approver'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const response=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(response.status(),200,await response.text());return response.json()}
    const client=await cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'})
    const p=await cmd('proposal.prepare',{clientId:client.id,title:'Notification preview',scope:'Scope reviewed from an email notification',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
    await cmd('notification.request',{id:p.id,version:1,consent:true})
    const mail=await app.db.prepare('SELECT * FROM p_notification_outbox WHERE proposal_id=?').bind(p.id).first()
    const preview=mail.body.match(/https?:\/\/[^\s]+\/app\/preview[^\s]+/)[0]
    assert.equal((await page.goto(preview+'&width='+width)).status(),200)
    await page.frameLocator('iframe[title="Client-page preview"]').getByRole('heading',{name:'Notification preview',exact:true}).waitFor()
    assert.match(await page.locator('main').innerText(),/Revision 1/)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'preview fits the viewport')
    if(screenshots)await page.screenshot({path:join(screenshots,'APPROVE-002-preview-'+width+'.png'),fullPage:true})
    const decision=mail.body.match(/Review and decide: (https?:\/\/[^\s]+)/)[1]
    assert.equal((await page.goto(decision)).status(),200)
    const iconOnly=await page.locator('button,a[role="button"]').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()).map(n=>n.outerHTML));assert.deepEqual(iconOnly,[],'the notification destination has no icon-only controls')
    await page.getByLabel('Rejection note',{exact:true}).fill('Please revise this exact offer')
    await page.getByRole('button',{name:'Reject revision',exact:true}).click()
    await page.getByText('Rejected. Save a new revision before requesting approval again.',{exact:true}).waitFor()
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'decision fits the viewport')
    if(screenshots){await page.screenshot({path:join(screenshots,'APPROVE-002-decision-'+width+'.png'),fullPage:true});await page.getByRole('heading',{name:'Revision approvals',exact:true}).locator('..').screenshot({path:join(screenshots,'APPROVE-002-approval-panel-'+width+'.png')})}
    const decisions=(await app.db.prepare('SELECT * FROM p_approval_decisions WHERE proposal_id=?').bind(p.id).all()).results;assert.equal(decisions.length,1);assert.equal(decisions[0].revision,1);assert.equal(decisions[0].note,'Please revise this exact offer')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('EDIT-001 ordered blocks, brand, autosave, drag and keyboard reorder, undo, reload and matching client PDF at desktop and phone widths', {timeout:180000}, documentJourney)

test('EDIT-003 linked and detached library insertion, frozen sending and scoped usage at desktop and phone widths',{timeout:180000},async()=>{
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp()
   const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),request=context.request
    const bootstrap=await request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic owner'},maxRedirects:0});assert.equal(bootstrap.status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const r=await request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const state=async()=>{const r=await request.get(app.origin+'/api/platter/state');assert.equal(r.status(),200);return r.json()}
    const capture=async name=>{await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow '+name);if(screenshots){await page.screenshot({path:join(screenshots,`EDIT-003-${name}-${width}.png`),fullPage:true});const target=['search','rich-library'].includes(name)?page.locator('section').filter({has:page.getByRole('heading',{name:'Shared content library',exact:true})}):name==='rich-preview'?page.locator('[aria-label="Proposal document"]'):name==='rich-insertion'?page.locator('section').filter({has:page.getByRole('heading',{name:'Insert library content',exact:true})}):name==='insertion'?page.locator('section').filter({has:page.getByRole('heading',{name:'Insert library content',exact:true})}):name==='usage'?page.locator('section').filter({has:page.getByRole('heading',{name:'Shared content library',exact:true})}):name==='frozen'?page.locator('[aria-label="Proposal document"]'):page.locator('[data-document-editor]');await target.screenshot({path:join(screenshots,`EDIT-003-${name}-${width}-panel.png`)})}}
    await page.goto(app.origin+'/app/library');await page.getByLabel('Item title',{exact:true}).fill('Synthetic case study');await page.getByLabel('Content type',{exact:true}).selectOption('case_study');await page.getByLabel('Library text',{exact:true}).fill('Original client story');await page.getByLabel('Tags (comma separated)',{exact:true}).fill('studio, reusable');await page.getByRole('button',{name:'Create library item',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    const client=await cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'})
    const make=title=>cmd('proposal.prepare',{title,clientId:client.id,scope:'Synthetic project scope',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25'})
    const linked=await make('Linked draft'),detached=await make('Detached draft'),sent=await make('Sent story')
    for(const [p,mode] of [[linked,'linked'],[detached,'detached'],[sent,'linked']]){
     await page.goto(app.origin+'/app/proposal?id='+p.id)
     const insertion=page.locator('section').filter({has:page.getByRole('heading',{name:'Insert library content',exact:true})})
     await insertion.getByLabel('Copy mode',{exact:true}).selectOption(mode);await insertion.getByRole('checkbox').check();await insertion.getByRole('button',{name:'Insert library item',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
     assert.equal(await page.getByLabel('Block text',{exact:true}).inputValue(),'Original client story')
     // Every icon-only block tool has the seed's delayed hover and immediate focus tooltip.
     const tool=page.getByRole('button',{name:'Duplicate block',exact:true});await tool.focus();assert.equal(await tool.evaluate(el=>getComputedStyle(document.getElementById(el.getAttribute('aria-describedby'))).visibility),'visible')
     await tool.blur();await page.mouse.move(0,0);await page.waitForTimeout(350);await tool.hover();await page.waitForTimeout(350);assert.equal(await tool.evaluate(el=>getComputedStyle(document.getElementById(el.getAttribute('aria-describedby'))).visibility),'visible')
     if(mode==='linked'&&p.id===linked.id)await capture('insertion')
    }
    let p=(await state()).proposals.find(p=>p.id===sent.id);await cmd('proposal.approve',{id:p.id,version:p.version,revision:p.revision});p=(await state()).proposals.find(p=>p.id===sent.id);await cmd('proposal.send',{id:p.id,version:p.version})
    await page.goto(app.origin+'/app/library');const edit=page.locator('form:has(input[name=id])').first();await edit.getByLabel('Library text',{exact:true}).fill('Updated client story');await edit.getByRole('button',{name:'Save library item',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    const content=await page.locator('main').innerText();for(const title of ['Linked draft','Detached draft','Sent story'])assert.ok(content.includes(title));assert.match(content,/detached/);assert.match(content,/frozen/);assert.match(content,/Changed/);await capture('usage')
    for(const [proposal,text] of [[linked,'Updated client story'],[detached,'Original client story'],[sent,'Original client story']]){
     await page.goto(app.origin+'/app/proposal?id='+proposal.id)
     if(proposal.id===sent.id)assert.match(await page.locator('[aria-label="Proposal document"]').innerText(),new RegExp(text))
     else assert.equal(await page.getByLabel('Block text',{exact:true}).inputValue(),text)
     await capture(proposal.id===linked.id?'linked':proposal.id===detached.id?'detached':'frozen')
    }
    await page.goto(app.origin+'/app/library');await page.getByLabel('Search library',{exact:true}).fill('SYNTHETIC');await page.getByLabel('Filter by tag',{exact:true}).fill('studio');await page.getByRole('button',{name:'Search library',exact:true}).click();assert.equal(await page.getByRole('heading',{name:'Synthetic case study',exact:true}).count(),1);await capture('search')
    await page.getByLabel('Search library',{exact:true}).fill('no matching content');await page.getByRole('button',{name:'Search library',exact:true}).click();assert.equal(await page.getByRole('heading',{name:'Synthetic case study',exact:true}).count(),0)
    const source=await cmd('proposal.prepare',{title:'Reusable media source',clientId:client.id,scope:'Synthetic source',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25',pricingTables:[{optionId:'one',name:'Services',lines:[{name:'Workshop',quantity:'2',unit:'hour',unitPrice:'10.01'}]}]})
    const upload=async(name,mimeType,buffer)=>{const response=await request.post(app.origin+'/app/document-media',{headers:{origin:app.origin,accept:'application/json'},multipart:{id:source.id,version:'1',consent:'yes',file:{name,mimeType,buffer}}});assert.equal(response.status(),200,await response.text());return (await response.json()).media}
    const image=await upload('synthetic-platter-1.png','image/png',await readFile('public/brand/apple-touch-icon.png')),video=await upload('synthetic-platter-1.webm','video/webm',await readFile('fixtures/editor/synthetic-platter-1.webm'))
    await cmd('proposal.document',{id:source.id,version:1,document:{version:1,blocks:[{id:'image',type:'image',title:'Studio image',text:'Library image',assetId:image.id,alt:'Synthetic studio mark'},{id:'video',type:'video',title:'Studio video',text:'Library video',assetId:video.id,posterId:image.id,alt:'Synthetic studio introduction'},{id:'pricing',type:'pricing',title:'Services',text:'Library pricing',optionId:'one',tableIndex:0}]}})
    const rich=await make('Rich library draft')
    for(const kind of ['image','video','pricing']){
     await page.goto(app.origin+'/app/library');const create=page.locator('section').filter({has:page.getByRole('heading',{name:'Create library item',exact:true})});await create.getByLabel('Item title',{exact:true}).fill('Reusable '+kind);await create.getByLabel('Content type',{exact:true}).selectOption(kind);await create.getByLabel('Source block',{exact:true}).selectOption(source.id+':'+kind);await create.getByLabel('Tags (comma separated)',{exact:true}).fill('rich, studio');await create.locator('[name=shareConsent]').check();await create.getByRole('button',{name:'Create library item',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0);await capture('rich-library')
     const item=(await state()).libraryItems.find(i=>i.title==='Reusable '+kind)
     await page.goto(app.origin+'/app/proposal?id='+rich.id);const insertion=page.locator('section').filter({has:page.getByRole('heading',{name:'Insert library content',exact:true})});await insertion.getByLabel('Library item',{exact:true}).selectOption(item.id+':1');await insertion.getByLabel('Pricing package',{exact:true}).selectOption('two');await insertion.locator('[name=consent]').check();await capture('rich-insertion');await insertion.getByRole('button',{name:'Insert library item',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    }
    const richView=(await state()).proposals.find(p=>p.id===rich.id);assert.equal(richView.options[1].cents,2002);assert.equal(richView.document.blocks.length,3)
    await page.goto(app.origin+`/app/preview/client?id=${rich.id}&revision=${richView.revision}&optionId=two`)
    // Preview is a session-protected public door with the exact retained media.
    const preview=page.locator('[aria-label="Proposal document"]');await preview.locator('img').first().evaluate(img=>img.decode());const player=preview.locator('video');await player.evaluate(video=>video.play());await page.waitForFunction(()=>document.querySelector('[aria-label="Proposal document"] video')?.currentTime>0);await player.evaluate(video=>video.pause());assert.match(await preview.innerText(),/Workshop/);await capture('rich-preview')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('deposit collection settings, retained signatures, required and due completion at desktop and phone widths',{timeout:180000},()=>collectionBrowser())

test('COLLAB-002 internal comment, resolution and dated assignment work at desktop and phone widths', {timeout:120000},async()=>{
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp({scheduled:true,outboundService:async request=>{const url=new URL(request.url);if(url.pathname==='/api/auth.test')return Response.json({ok:true,team_id:'synthetic-platter-9010'});if(url.pathname==='/api/conversations.info')return Response.json({ok:true,channel:{id:'synthetic-platter-9011',is_member:true}});throw Error('Unexpected provider request')}})
   const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage()
    const claimed=await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic member'},maxRedirects:0});assert.equal(claimed.status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=await cmd('client.save',{name:'Synthetic client',email:'synthetic-platter-9001@example.com'})
    const p=await cmd('proposal.prepare',{clientId:client.id,title:'Synthetic collaboration',scope:'Public scope',optionOne:'One',priceOne:'100',optionTwo:'Two',priceTwo:'200',depositPercent:25,document:{version:1,blocks:[{id:'synthetic-platter-9002',type:'text',title:'Public section',text:'Public text'}]}})
    await page.goto(app.origin+'/app/proposal?id='+p.id)
    const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Internal collaboration',exact:true})})
    const capture=async name=>{await page.evaluate(async()=>{await document.fonts.ready});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await panel.screenshot({path:join(screenshots,`COLLAB-002-${name}-${width}.png`)})}
    await panel.getByText('Add internal comment',{exact:true}).click()
    const comment=panel.locator('form').filter({has:page.getByRole('button',{name:'Post internal comment',exact:true})})
    await comment.getByLabel('Block',{exact:true}).selectOption('pricing')
    await comment.getByLabel('Internal comment',{exact:true}).fill('synthetic-platter-private-browser')
    await comment.getByLabel('Mention colleague',{exact:true}).selectOption({label:'Synthetic member'})
    await comment.getByRole('checkbox').check();await comment.getByRole('button',{name:'Post internal comment',exact:true}).click()
    await page.waitForLoadState('load');assert.match(await panel.innerText(),/synthetic-platter-private-browser/);await capture('comment')
    await panel.getByRole('button',{name:'Resolve thread',exact:true}).click();await page.waitForLoadState('load');assert.match(await panel.innerText(),/Resolved/);await capture('resolved')
    await panel.getByText('Assign a section',{exact:true}).click()
    const assignment=panel.locator('form').filter({has:page.getByRole('button',{name:'Assign section',exact:true})})
    await assignment.getByLabel('Block',{exact:true}).selectOption('block:synthetic-platter-9002')
    await assignment.getByLabel('Assignment due date',{exact:true}).fill('2030-03-04');await assignment.getByRole('checkbox').check();await assignment.getByRole('button',{name:'Assign section',exact:true}).click()
    await page.waitForLoadState('load');assert.match(await panel.innerText(),/2030-03-04/);await capture('assigned')
    const stored=await (await context.request.get(app.origin+'/api/platter/state')).json(),threads=stored.proposals[0].collaboration.threads
    assert.equal(threads.length,2);assert.ok(threads.find(t=>t.kind==='comment').resolved_at);assert.equal(threads.find(t=>t.kind==='assignment').block_id,'block:synthetic-platter-9002')
    // Audit the existing document controls on the same changed proposal screen.
    const tools=page.locator('.document-tool button:not(:disabled)'),count=await tools.count();assert.ok(count>0)
    for(let i=0;i<count;i++){const tool=tools.nth(i);assert.equal(await tool.evaluate(node=>{node.focus();return getComputedStyle(document.getElementById(node.getAttribute('aria-describedby'))).visibility}),'visible')}
    const tool=tools.first(),tip=page.locator('#'+await tool.getAttribute('aria-describedby'));await page.locator('h1').click();await tool.hover();await page.waitForTimeout(350);assert.equal(await tip.isVisible(),true)
    await tool.focus()
    if(screenshots)await page.locator('.document-editor').screenshot({path:join(screenshots,`COLLAB-002-tooltip-${width}.png`)})
    await cmd('provider.connect',{provider:'slack',version:0,token:'synthetic-platter-9012',consent:true})
    const route=await cmd('notification.route',{provider:'slack',event:'followup',kind:'channel',destination:'synthetic-platter-9011',consent:true})
    await page.goto(app.origin+'/app/settings')
    const settings=page.locator('section').filter({has:page.getByRole('heading',{name:'Internal collaboration notices',exact:true})})
    assert.match(await settings.innerText(),/verified chat destination/)
    await settings.getByLabel('Verified chat route',{exact:true}).selectOption(route.id)
    await settings.getByRole('checkbox').check();await settings.getByRole('button',{name:'Authorize collaboration route',exact:true}).click()
    assert.match(await settings.innerText(),/authorized/)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    if(screenshots)await settings.screenshot({path:join(screenshots,`COLLAB-002-settings-${width}.png`)})
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('PRICE-003 and PRICE-002 recurring line editing, preview, client selection and frozen agreement use the same amounts',{timeout:180000},async()=>{
 const {recurringBrowserJourney}=await import('./recurring-browser.mjs')
 await recurringBrowserJourney()
})

test('EDIT-004 and EDIT-005 native variable fill, editable Word import, fixed-page fields and document downloads', {timeout:120000},async()=>{
 const {documentImportBrowser}=await import('./document-import-browser.mjs');await documentImportBrowser()
})


test('REPORT-004 booked snapshots and independent receipt periods export and schedule the visible report', {timeout:120000}, async()=>{
 const {harness}=await import('./harness.mjs')
 const screenshots=process.env.PLATTER_SCREENSHOTS
 let browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   const h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',unclaimed:true})
   const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const bootstrap=await context.request.post(h.origin+'/auth/bootstrap',{headers:{origin:h.origin},data:{token:h.auth.SETUP_TOKEN,displayName:'Synthetic owner'},maxRedirects:0})
    assert.equal(bootstrap.status(),303)
    const owner=bootstrap.headers()['set-cookie'].split(';')[0],page=await context.newPage()
    await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const app={...h,owner,cmd:(name,input,cookie=owner)=>h.cmd(name,input,cookie),state:(cookie=owner)=>h.state(cookie)}
    const client=await app.cmd('client.save',{name:'Reporting client',email:h.auth.OWNER_EMAIL})
    const first=await acceptRevenue(app,{clientId:client.id}),later=await acceptRevenue(app,{clientId:client.id,term:24,date:'2099-04-01',title:'Two-year care'})
    for(const [id,amount,receivedOn] of [[first.id,'2500','2099-03-31'],[first.id,'1200','2099-04-01'],[later.id,'2400','2099-06-30']])await app.cmd('payment.record',{id,amount,receivedOn,method:'wire',reference:'synthetic-platter-4500',consent:true})
    await page.goto(h.origin+'/app?view=recorded-revenue')
    const ownerId=(await app.state()).actor.id
    await page.getByLabel('Currency',{exact:true}).selectOption('USD');await page.getByLabel('Owner',{exact:true}).selectOption(ownerId)
    for(const [label,value] of [['Booked from (UTC)','2099-01-15'],['Booked through (UTC)','2099-03-31'],['Received from','2099-04-01'],['Received through','2099-06-30']])await page.getByLabel(label,{exact:true}).fill(value)
    await page.getByRole('button',{name:'Filter pipeline',exact:true}).click()
    const report=page.locator('section').filter({has:page.getByRole('heading',{name:'Recorded revenue',exact:true})})
    if(width===1440){
     assert.equal(await report.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'2')
     const totals=report.locator('.line-totals');assert.match(await totals.innerText(),/Booked one-off value\s+\$2,500\.00 USD/);assert.match(await totals.innerText(),/Booked first-year value\s+\$16,900\.00 USD/);assert.match(await totals.innerText(),/Received payments\s+\$3,600\.00 USD/)
     assert.equal(await page.getByLabel('Booked through (UTC)',{exact:true}).inputValue(),'2099-03-31');assert.equal(await page.getByLabel('Received from',{exact:true}).inputValue(),'2099-04-01')
    }
    await page.evaluate(()=>document.fonts.ready)
    if(screenshots){await report.screenshot({path:join(screenshots,'REPORT-004-periods-'+width+'.png')});await page.screenshot({path:join(screenshots,'REPORT-004-screen-'+width+'.png'),fullPage:true})}
    const exports=page.locator('section').filter({has:page.getByRole('heading',{name:'Report export and email',exact:true})})
    const csv=await context.request.get(h.origin+await exports.getByRole('link',{name:'Download recorded revenue CSV',exact:true}).getAttribute('href'))
    if(width===1440){assert.equal(csv.status(),200);assert.match(await csv.text(),/Total \(2 proposals\),,,,,USD,16900\.00,,,,2500\.00,16900\.00,3600\.00/)}
    await exports.getByRole('checkbox').first().check();await exports.getByRole('button',{name:'Schedule report email',exact:true}).click()
    if(width===1440){assert.equal(await page.getByRole('alert').count(),0);const saved=(await app.state()).reportSchedules[0],filters=new URLSearchParams(saved.filters);assert.equal(filters.get('receivedFrom'),'2099-04-01');assert.equal(filters.get('bookedTo'),'2099-03-31');assert.equal(filters.get('owner'),ownerId);assert.equal(filters.get('currency'),'USD');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
    await page.getByRole('button',{name:'Stop this schedule',exact:true}).click()
   }finally{await context.close();await h.close()}
  }
 }finally{await browser?.close()}
})

test('PRICE-005 native owner-configured tax settings, selected quantities and frozen agreement', {timeout:120000},async()=>{
 const {taxesBrowserJourney}=await import('./packages-journey.mjs')
 const browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 try{await taxesBrowserJourney(browser,process.env.PLATTER_SCREENSHOTS)}finally{await browser.close()}
})


test('CAT-001 reviewed CSV promotion and explicit recurring insertion preserve independent defaults', {timeout:180000},async()=>{
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs'),{catalogBrowser}=await import('./catalog-browser.mjs')
 const mail=[]
 const edge=await browserEdge(),h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-1'},outboundService:async request=>{assert.equal(new URL(request.url).hostname,'api.resend.com');mail.push(await request.json());return Response.json({id:'synthetic-platter-'+(6500+mail.length)})}});edge.attach(h)
 let browser,owner,sales
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  owner=await browser.newContext({viewport:{width:1440,height:900},ignoreHTTPSErrors:true});sales=await browser.newContext({viewport:{width:1440,height:900},ignoreHTTPSErrors:true})
  const putCookie=async(context,cookie)=>{const [name,value]=cookie.split('=');await context.addCookies([{name,value,url:h.origin}])}
  await putCookie(owner,h.owner)
  const op=await owner.newPage();await op.goto(h.origin+'/setup');await op.getByRole('checkbox').check();await op.getByRole('button',{name:'Finish setup'}).click()
  assert.equal((await h.send('/auth/invite',{email:h.auth.MAIL_FROM,displayName:'Synthetic sales',role:'member',returnTo:'/app'},h.owner)).status,202)
  assert.equal((await h.send('/auth/magic-link',{email:h.auth.MAIL_FROM})).status,202)
  const message=mail.findLast(m=>m.to.includes(h.auth.MAIL_FROM)),link=message.text.match(/https?:\/\/[^\s]+\/auth\/confirm\?token=[^\s]+/)[0]
  const confirmed=await h.send('/auth/confirm',{token:new URL(link).searchParams.get('token')});assert.equal(confirmed.status,303);await putCookie(sales,confirmed.cookie)
  const client=await h.cmd('client.save',{name:'Synthetic catalog client',email:h.auth.OWNER_EMAIL})
  const command=async(context,name,input,status=200)=>{const response=await context.request.post(h.origin+'/api/platter/command',{headers:{origin:h.origin},data:{name,input}});assert.equal(response.status(),status,await response.text());return response.json()}
  const state=async(context=owner)=>(await context.request.get(h.origin+'/api/platter/state')).json()
  const page=await sales.newPage(),review=await owner.newPage()
  await catalogBrowser({origin:h.origin,owner,sales,op,page,review,command,state,capture:async()=>{},client,width:1440})
 }finally{await owner?.close();await sales?.close();await browser?.close();await edge.close();await h.close()}
})

test('AUTO-002 Settings authorizes Drive archiving and shows completed and held jobs with safe reconciliation', {timeout:120000},async()=>{
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs'),{driveFixture,driveToken,driveRoot,completeDriveAgreement}=await import('./drive-fixture.mjs')
 const fake=driveFixture(),edge=await browserEdge(),h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,outboundService:fake.outboundService});edge.attach(h)
 let browser,context
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true})
  const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}])
  const page=await context.newPage();await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  await page.goto(h.origin+'/app/settings')
  const connection=page.locator('article').filter({has:page.getByRole('heading',{name:'Google Drive',exact:true})})
  await connection.getByLabel('Google Drive access token').fill(driveToken);await connection.getByRole('checkbox').check();await connection.getByRole('button',{name:'Connect Google Drive',exact:true}).click()
  const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Completed document archiving',exact:true})})
  await panel.getByLabel('Drive destination folder id').fill(driveRoot);await panel.getByLabel('Archive naming pattern').fill('{client} - {title} - r{revision}');await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Authorize Drive archiving',exact:true}).click()
  assert.equal(await page.getByRole('alert').count(),0);assert.match(await panel.innerText(),/Archiving is authorized/)
  const signed=await completeDriveAgreement(h),fire=async()=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'*/15 * * * *'})
  await page.reload();await panel.getByRole('button',{name:'Process queued archives',exact:true}).click()
  assert.match(await panel.getByRole('list',{name:'Document archive history'}).innerText(),/Synthetic archive agreement[\s\S]*complete/)
  fake.setUncertain(true);await completeDriveAgreement(h,'Uncertain archive agreement',signed.client.id);await fire();await page.reload()
  assert.match(await panel.innerText(),/held/);assert.equal(await panel.getByRole('button',{name:'Reconcile archive',exact:true}).count(),1)
  assert.equal(await panel.getByLabel('Archive naming pattern').inputValue(),'{client} - {title} - r{revision}')
  const posts=fake.calls.filter(c=>c.method==='POST').length
  await panel.getByRole('button',{name:'Reconcile archive',exact:true}).click()
  assert.equal(await page.getByRole('alert').count(),0);assert.equal(await panel.getByRole('button',{name:'Reconcile archive',exact:true}).count(),0)
  assert.equal(fake.calls.filter(c=>c.method==='POST').length,posts)
  assert.equal(await panel.getByRole('listitem').count(),2)
  assert.ok(await panel.locator('button,input').evaluateAll(nodes=>nodes.every(node=>parseFloat(getComputedStyle(node).fontSize)>=13)))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots){
   await mkdir(screenshots,{recursive:true});await documentFonts(page)
   await panel.screenshot({path:join(screenshots,'AUTO-002-settings-1440.png')})
   await page.setViewportSize({width:390,height:900});await documentFonts(page)
   await panel.screenshot({path:join(screenshots,'AUTO-002-settings-390.png')})
  }
  await page.setViewportSize({width:1440,height:1000})
  await panel.getByRole('button',{name:'Revoke archiving authorization',exact:true}).click()
  assert.match(await panel.innerText(),/Archiving is inactive/)
 }finally{await context?.close();await browser?.close();await edge.close();await h.close()}
})
async function documentFonts(page){await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))})}

test('MIG-007 owner uploads exported ZIPs, reviews report ambiguity, downloads read-only originals and undoes the move-in', {timeout:180000},async()=>{
 const {moveinFixture,hash}=await import('./document-movein-fixture.mjs'),fixture=await moveinFixture()
 let app,browser
 try{
  app=await installedApp()
  browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage()
  const capture=async phase=>{
   if(!process.env.PLATTER_SCREENSHOTS)return
   await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true})
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000})
    await page.evaluate(async()=>{await document.fonts.ready})
    await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'MIG-007-'+phase+'-'+width+'.png'),fullPage:true})
   }
   await page.setViewportSize({width:1440,height:1000})
  }
  assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic platter owner'},maxRedirects:0})).status(),303)
  await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  await page.goto(app.origin+'/app/import')
  await page.getByLabel('Move-in name',{exact:true}).fill('Synthetic exported documents')
  await page.getByRole('button',{name:'Start document move-in',exact:true}).click()
  let section=page.locator('section').filter({has:page.getByRole('heading',{name:'Synthetic exported documents',exact:true})})
  const id=await section.locator('[data-document-upload]').getAttribute('data-movein')
  const api=async(name,input)=>{
   const response=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name:'document-import.'+name,input:{id,...input}}})
   assert.equal(response.status(),200,await response.text());return response.json()
  }
  const file=fixture.zips[0],sha256=hash(file.bytes),half=Math.floor(file.bytes.length/2)
  await api('upload-start',{filename:file.filename,sha256,size:file.bytes.length})
  await api('upload-chunk',{sha256,position:0,base64:file.bytes.subarray(0,half).toString('base64')})
  await page.reload();assert.match(await section.innerText(),/Upload interrupted/)
  await section.getByLabel('Exported files').setInputFiles(fixture.zips.map(z=>({name:z.filename,mimeType:'application/zip',buffer:z.bytes})))
  await section.getByRole('button',{name:'Upload or resume files',exact:true}).click()
  await page.waitForURL('**/app/import')
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-document-upload]')).every(f=>!f.querySelector('input[type=file]').files.length))
  await section.getByRole('button',{name:'Preview document move-in',exact:true}).click()
  assert.equal(await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).count(),0)
  assert.match(await section.innerText(),/Arrived agreements\s+4\s+Held for review\s+2\s+Unmapped items\s+2/)
  const select=section.locator('select[name^="match:"]').filter({has:page.locator('option[value="'+hash(fixture.originals[2])+'"]')})
  await select.selectOption(hash(fixture.originals[2]))
  await section.getByRole('button',{name:'Review report matches',exact:true}).click()
  assert.match(await section.innerText(),/Arrived agreements\s+4\s+Held for review\s+1\s+Unmapped items\s+2/)
  await capture('review')
  await section.getByRole('button',{name:'Apply reviewed document move-in',exact:true}).click()
  const retained=page.locator('section').filter({has:page.getByRole('heading',{name:'Retained imported originals',exact:true})})
  assert.equal(await retained.getByRole('link',{name:'Download original PDF',exact:true}).count(),5)
  assert.equal(await retained.getByText('Read-only retained agreement',{exact:true}).count(),4)
  for(const bytes of fixture.originals){
   const response=await context.request.get(app.origin+'/api/platter/imported-original?document='+hash(bytes))
   assert.equal(response.status(),200);assert.deepEqual(await response.body(),bytes)
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await capture('retained')
  await section.getByRole('button',{name:'Open document journal',exact:true}).click()
  assert.match(await section.innerText(),/5 document changes recorded/)
  assert.ok(await section.getByRole('link',{name:/Download uploads/}).count()>=3)
  await capture('journal')
  await section.getByRole('button',{name:'Undo document move-in',exact:true}).click()
  assert.equal(await page.getByRole('heading',{name:'Retained imported originals',exact:true}).count(),0)
  assert.match(await section.innerText(),/Import undone/)
  await context.close()
 }finally{await browser?.close();await app?.close()}
})

test('HAND-001 Settings authorizes Asana delivery and displays completed and uncertain handoffs', {timeout:120000},async()=>{
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs'),{handoffFixture,asanaToken,asanaWorkspace,asanaTeam,completeHandoffAgreement}=await import('./handoff-fixture.mjs')
 const fake=handoffFixture(),edge=await browserEdge(),h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,outboundService:fake.outboundService});edge.attach(h)
 let browser,context
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true})
  const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}])
  const page=await context.newPage();await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  await page.goto(h.origin+'/app/settings')
  const connection=page.locator('article').filter({has:page.getByRole('heading',{name:'Asana',exact:true})})
  await connection.getByLabel('Asana access token').fill(asanaToken);await connection.getByRole('checkbox').check();await connection.getByRole('button',{name:'Connect Asana',exact:true}).click()
  const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Delivery handoff',exact:true})})
  await panel.getByLabel('Asana workspace id').fill(asanaWorkspace);await panel.getByLabel('Asana destination team id').fill(asanaTeam);await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Authorize Asana handoff',exact:true}).click()
  assert.equal(await page.getByRole('alert').count(),0);assert.match(await panel.innerText(),/Asana handoff is authorized/)
  const signed=await completeHandoffAgreement(h)
  await page.reload();await panel.getByRole('button',{name:'Process queued handoffs',exact:true}).click()
  const history=panel.getByRole('list',{name:'Delivery handoff history'})
  assert.match(await history.innerText(),/Synthetic handoff agreement[\s\S]*complete/)
  assert.equal(fake.projects.length,1);assert.equal(fake.tasks.length,4)
  await history.getByText('Provider write history',{exact:true}).click()
  assert.match(await history.innerText(),new RegExp(fake.tasks[3].gid));assert.equal((await context.request.get(h.origin+'/api/platter/agreement.pdf?id='+signed.proposal.id)).status(),200)
  fake.setUncertain('project');await completeHandoffAgreement(h,'Uncertain delivery handoff',signed.client.id)
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date(),cron:'*/15 * * * *'});await page.reload()
  assert.match(await history.innerText(),/Uncertain delivery handoff[\s\S]*held/)
  assert.equal(await panel.getByRole('button',{name:/retry/i}).count(),0)
  const posts=fake.calls.filter(c=>c.method==='POST').length
  await page.reload();assert.equal(fake.calls.filter(c=>c.method==='POST').length,posts)
  assert.equal(await panel.getByLabel('Asana workspace id').inputValue(),asanaWorkspace)
  assert.ok(await panel.locator('button,input,p,summary').evaluateAll(nodes=>nodes.every(node=>parseFloat(getComputedStyle(node).fontSize)>=13)))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  if(process.env.PLATTER_SCREENSHOTS){
   await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true});await documentFonts(page)
   await panel.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'HAND-001-settings-1440.png')})
   await page.setViewportSize({width:390,height:900});await documentFonts(page)
   await panel.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'HAND-001-settings-390.png')})
   await page.setViewportSize({width:1440,height:1000})
  }
  await panel.getByRole('button',{name:'Revoke handoff authorization',exact:true}).click();assert.match(await panel.innerText(),/Asana handoff is inactive/)
 }finally{await context?.close();await browser?.close();await edge.close();await h.close()}
})

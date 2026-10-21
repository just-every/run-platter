import { templatesJourney } from './templates-journey.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { pdfPages } from './pdf-document.mjs'
import { builtSite, installedApp } from './site-harness.mjs'

test('SITE-001 built homepage opens run instructions, Markdown docs work without JavaScript, installed root remains the Lobby', { timeout: 120000 }, async () => {
  let site, app, browser
  const screenshots = process.env.PLATTER_SCREENSHOTS
  try {
    site = await builtSite()
    browser = await chromium.launch({ headless: true, args: ['--use-mock-keychain', '--password-store=basic'] })
    if (screenshots) await mkdir(screenshots, { recursive: true })
    const capture = async (page, name, width) => { if (screenshots) await page.screenshot({ path: join(screenshots, `SITE-001-${name}-${width}.png`), fullPage: true }) }
    const docsHeading = (await readFile('docs/README.md', 'utf8')).match(/^# (.+)$/m)[1]
    for (const width of [1440, 390]) {
      app = await installedApp()
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false })
      try {
        const page = await context.newPage()
        assert.equal((await page.goto(site.origin)).status(), 200)
        await capture(page, 'home', width)
        await page.locator('main a[href="/run"]').first().click()
        assert.equal(new URL(page.url()).pathname, '/run')
        assert.ok(await page.locator('main').innerText())
        await capture(page, 'run', width)
        assert.equal((await page.goto(site.origin + '/docs')).status(), 200)
        assert.equal(await page.getByRole('heading', { level: 1 }).innerText(), docsHeading)
        await page.locator('nav[aria-label="Documentation"] a[href="/docs/proposals"]').click()
        assert.equal(new URL(page.url()).pathname, '/docs/proposals')
        assert.ok(await page.locator('article').innerText())
        await capture(page, 'docs-proposals', width)
        await page.goto(site.origin + '/docs')
        await capture(page, 'docs', width)
        assert.equal((await page.goto(app.origin)).status(), 200)
        await page.locator('main a[href="/setup"]').click()
        assert.equal(new URL(page.url()).pathname, '/signin')
        const claimed = await context.request.post(app.origin + '/auth/bootstrap', {
          headers: { origin: app.origin }, data: { token: app.token, displayName: 'Jordan Northstar' }, maxRedirects: 0,
        })
        assert.equal(claimed.status(), 303)
        await page.goto(app.origin)
        await capture(page, 'installed', width)
        await page.locator('main a[href^="/signin"]').click()
        assert.equal(new URL(page.url()).pathname, '/signin')
      } finally { await context.close(); await app.close(); app = undefined }
    }
  } finally { await browser?.close(); await app?.close(); await site?.close() }
})

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

test('PRICE-008 legacy AUD agreement and new USD owner/client screens show exact currency at desktop and phone widths', { timeout: 120000 }, async () => {
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try {
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp({businessFixture:'fixtures/first-release-aud.rer'})
   const context=await browser.newContext({viewport:{width,height:900}})
   try {
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`PRICE-008-${name}-${width}.png`),fullPage:true})}
    const claimed=await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0});assert.equal(claimed.status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.getByRole('link',{name:'Legacy AUD campaign agreement',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/GST-free in AUD/);assert.match(await page.locator('main').innerText(),/\$4,200\.00 AUD/);assert.match(await page.locator('main').innerText(),/\$1,050\.00 AUD/)
    await capture('legacy-agreement')
    const state=await (await context.request.get(app.origin+'/api/platter/state')).json()
    const created=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name:'proposal.prepare',input:{clientId:state.clients[0].id,title:'New US brand campaign',scope:'One studio shoot with edited photographs and usage licence.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'}}});assert.equal(created.status(),200)
    const proposal=await created.json()
    await page.goto(app.origin+'/app/proposal?id='+proposal.id)
    assert.match(await page.locator('main').innerText(),/USD/);assert.ok(!(await page.locator('main').innerText()).includes('GST-free'))
    await capture('usd-draft')
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click()
    await page.getByRole('link',{name:'Open client proposal',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/\$4,200\.00 USD/);await capture('usd-invitation')
    await page.getByRole('button',{name:'Send verification code'}).click()
    const sent=await (await context.request.get(app.origin+'/api/platter/state')).json(),code=sent.outbox.find(message=>message.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click()
    await page.getByRole('radio',{name:/Full campaign/}).check();await page.getByLabel('Your full name').fill('Avery Chen');await page.getByRole('checkbox').check();await capture('usd-verified')
    await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1)
    assert.match(await page.locator('main').innerText(),/\$4,200\.00 USD/);assert.match(await page.locator('main').innerText(),/\$1,050\.00 USD/);await capture('usd-accepted')
   } finally {await context.close();await app.close();app=undefined}
  }
 } finally {await browser?.close();await app?.close()}
})

test('NEG-001 desktop and phone negotiate, approve, send and accept the changed offer with client comparison', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{
     await page.waitForLoadState('load')
     await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(null))))})
     const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth).map(n=>({tag:n.tagName,class:n.className,width:n.getBoundingClientRect().width}))}))
     assert.ok(geometry.scrollWidth<=geometry.width,JSON.stringify(geometry))
     if(screenshots)await page.screenshot({path:join(screenshots,`NEG-001-${name}-${width}.png`),fullPage:true})
    }
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.getByRole('link',{name:'Clients',exact:true}).click();await page.locator('[name="name"]').fill('Northstar Coffee');await page.locator('[name="email"]').fill('avery@northstar.example');await page.getByRole('button',{name:'Add client'}).click()
    await page.getByRole('link',{name:'Proposals',exact:true}).click();await page.locator('[name="clientId"]').selectOption({label:'Northstar Coffee'})
    for(const [name,value] of Object.entries({title:'Autumn campaign photography',scope:'One studio shoot and usage licence.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'}))await page.locator(`[name="${name}"]`).fill(value)
    await page.getByRole('button',{name:'Prepare proposal',exact:true}).click();await page.getByRole('link',{name:'Autumn campaign photography',exact:true}).click()
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click()
    const original=await page.getByRole('link',{name:'Open client proposal',exact:true}).getAttribute('href')
    await page.locator('[name="scope"]').fill('Two shoots with product styling and a campaign licence.');await page.locator('[name="priceOne"]').fill('2800')
    await capture('negotiate')
    await page.getByRole('button',{name:'Prepare negotiated revision'}).click()
    assert.match(await page.locator('.proposal-status').innerText(),/draft.*Revision 2/is);assert.equal(await page.getByRole('button',{name:'Send approved proposal'}).count(),0)
    await capture('draft')
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();await capture('sent')
    assert.equal((await context.request.get(app.origin+original)).status(),404)
    await page.getByRole('link',{name:'Open client proposal',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Changes since your previous offer'}).count(),1)
    assert.match(await page.locator('del').allTextContents().then(x=>x.join(' ')),/2,400/);assert.match(await page.locator('ins').allTextContents().then(x=>x.join(' ')),/2,800/)
    await capture('client-comparison')
    await page.getByRole('button',{name:'Send verification code'}).click()
    const state=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=state.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click()
    await page.getByRole('radio',{name:/Studio essentials/}).check();await page.getByLabel('Your full name').fill('Avery Chen');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1);assert.match(await page.locator('main').innerText(),/\$2,800\.00 USD/);await capture('accepted')
    const final=await(await context.request.get(app.origin+'/api/platter/state')).json();assert.equal(final.proposals[0].acceptance.revision,2)
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('EDIT-016 / REPORT-001 desktop and phone pipeline filters, value sort, totals and clear filters use recorded proposal data', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),command=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200);return r.json()}
    const capture=async name=>{await page.evaluate(()=>document.fonts.ready.then(()=>null));if(screenshots)await page.screenshot({path:join(screenshots,`REPORT-001-${name}-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const client=await command('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),fixture=[]
    for(const [title,price,status] of [['Brand identity','2400','draft'],['Seasonal product photography','4200','approved'],['Campaign launch','6800','approved']]){
     const made=await command('proposal.prepare',{clientId:client.id,title,scope:title==='Brand identity'?'Brand guidelines.':'Creative [campaign] for Northstar Coffee, including planning and a studio production day.',optionOne:'Studio essentials',priceOne:'1200',optionTwo:'Full campaign',priceTwo:price,depositPercent:'25'})
     if(status==='approved')await command('proposal.approve',{id:made.id,version:1,revision:1})
     fixture.push({...made,title,price,status})
    }
    await page.goto(app.origin+'/app')
    assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'3');assert.match(await page.locator('[data-pipeline-total="USD"]').innerText(),/13,400\.00 USD/)
    await capture('all')
    await page.getByLabel('Owner',{exact:true}).selectOption({label:'owner@northstar.example'});await page.getByLabel('Status',{exact:true}).selectOption('approved');await page.getByLabel('Sort by',{exact:true}).selectOption('value');await page.getByLabel('Direction',{exact:true}).selectOption('desc');await page.getByRole('button',{name:'Filter pipeline'}).click()
    assert.deepEqual(await page.locator('[data-proposal-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-proposal-id'))),[fixture[2].id,fixture[1].id]);assert.match(await page.locator('[data-pipeline-total="USD"]').innerText(),/11,000\.00 USD/)
    await capture('filtered')
    await page.getByLabel('Search proposal text',{exact:true}).fill('CREATIVE   [campaign]')
    await page.getByRole('button',{name:'Filter pipeline'}).click()
    assert.deepEqual(await page.locator('[data-proposal-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-proposal-id'))),[fixture[2].id,fixture[1].id])
    assert.equal(await page.getByLabel('Search proposal text',{exact:true}).inputValue(),'CREATIVE   [campaign]')
    const csvHref=await page.getByRole('link',{name:'Download pipeline CSV',exact:true}).getAttribute('href')
    const csv=await(await context.request.get(app.origin+csvHref)).text()
    assert.ok(csv.includes('Seasonal product photography'));assert.ok(csv.includes('Campaign launch'));assert.ok(!csv.includes('Brand identity'));assert.ok(csv.includes('Total (2 proposals),,,,,USD,11000.00'))
    await page.getByRole('checkbox',{name:/owner@northstar.example/}).check()
    await page.getByRole('button',{name:'Schedule report email',exact:true}).click()
    const schedules=(await(await context.request.get(app.origin+'/api/platter/state')).json()).reportSchedules
    assert.equal(new URLSearchParams(schedules.at(-1).filters).get('q'),'CREATIVE   [campaign]')
    await page.goto(app.origin+'/app?'+new URLSearchParams(schedules.at(-1).filters))
    await capture('body-search')
    await page.getByLabel('Search proposal text',{exact:true}).fill('not in any offer')
    await page.getByRole('button',{name:'Filter pipeline'}).click();assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'0');await capture('search-empty')
    await page.getByRole('link',{name:'Clear filters',exact:true}).click()
    assert.equal(await page.getByLabel('Search proposal text',{exact:true}).inputValue(),'')
    assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'3')
    await page.getByLabel('Minimum value',{exact:true}).fill('100000');await page.getByRole('button',{name:'Filter pipeline'}).click();assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'0');await capture('empty')
    await page.getByRole('link',{name:'Clear filters',exact:true}).click();assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'3')
    await page.getByRole('link',{name:'Brand identity',exact:true}).click();assert.equal(await page.locator('[name="title"]').inputValue(),'Brand identity')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('TEAM-004 owner searches audit actions and downloads the same filtered activity at desktop and phone widths', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),command=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200);return r.json()}
    const capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`TEAM-004-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const client=await command('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    const proposal=await command('proposal.prepare',{clientId:client.id,title:'Autumn campaign photography',scope:'Campaign planning, a studio production day and edited photographs.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    await command('proposal.approve',{id:proposal.id,version:1,revision:1});await command('proposal.send',{id:proposal.id,version:2})
    await page.goto(app.origin+'/app');await page.getByRole('link',{name:'Audit log',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Audit log',exact:true}).count(),1);assert.ok(await page.getByRole('heading',{name:'proposal.send',exact:true}).count());await capture('all')
    await page.getByLabel('Subject ID',{exact:true}).fill(proposal.id);await page.getByLabel('Action',{exact:true}).fill('proposal.approve');await page.getByRole('button',{name:'Search audit log'}).click()
    assert.equal(await page.getByRole('heading',{name:'proposal.approve',exact:true}).count(),1);assert.equal(await page.getByRole('heading',{name:'proposal.send',exact:true}).count(),0);await capture('filtered')
    const csv=await context.request.get(app.origin+await page.getByRole('link',{name:'Download audit CSV'}).getAttribute('href'));assert.equal(csv.status(),200);assert.match(await csv.text(),/proposal.approve/);assert.ok(!(await csv.text()).includes('proposal.send'))
    await page.getByLabel('Search activity',{exact:true}).fill('no matching activity');await page.getByRole('button',{name:'Search audit log'}).click();assert.match(await page.locator('main').innerText(),/No activity matches/);await capture('empty')
    await page.getByRole('link',{name:'Clear search'}).click();assert.ok(await page.getByRole('heading',{name:'proposal.send',exact:true}).count());await capture('cleared')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('AI-003 desktop and phone owners review MCP requests, approve/send explicitly, and dismiss stale requests', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),command=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200);return r.json()}
    const capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`AI-003-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const client=await command('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),key=await command('agent.create',{label:'Campaign drafting assistant'})
    let id=0
    const rpc=async(method,params={})=>{const r=await context.request.post(app.origin+'/api/platter/agent/mcp',{headers:{authorization:'Bearer '+key.token,accept:'application/json, text/event-stream','mcp-protocol-version':'2025-06-18'},data:{jsonrpc:'2.0',id:++id,method,params}});assert.equal(r.status(),200);const v=await r.json();assert.ok(!v.error);return v.result}
    const tool=async(name,args)=>{const r=await rpc('tools/call',{name,arguments:args});assert.ok(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text)}
    await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'Browser acceptance MCP client',version:'1'}})
    await page.getByRole('link',{name:'Agent access',exact:true}).click();assert.match(await page.locator('main').innerText(),/No send requests yet/);await capture('empty')
    const offer={clientId:client.id,title:'Autumn campaign photography',scope:'Campaign planning, studio production and edited photographs.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:25}
    const p=await tool('prepare_proposal',offer);await tool('request_send',{id:p.id,revision:1});await page.reload()
    assert.match(await page.locator('main').innerText(),/Ready for review/);await capture('pending')
    await page.getByRole('link',{name:offer.title,exact:true}).click();assert.equal(await page.getByRole('button',{name:'Approve this revision'}).count(),1)
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click()
    await page.getByRole('link',{name:'Agent access',exact:true}).click();await page.getByRole('button',{name:'Mark request fulfilled'}).click();assert.match(await page.locator('main').innerText(),/fulfilled/);await capture('fulfilled')
    const other=await tool('prepare_proposal',{...offer,title:'Winter campaign concept'});await tool('request_send',{id:other.id,revision:1});await tool('revise_proposal',{...offer,id:other.id,version:1,title:'Winter campaign concept',scope:'A changed draft awaits a new owner review.'})
    await page.reload();assert.match(await page.locator('main').innerText(),/Stale request/);await capture('stale')
    await page.getByRole('button',{name:'Dismiss request',exact:true}).click();assert.match(await page.locator('main').innerText(),/dismissed/);assert.equal(await page.getByRole('button',{name:'Dismiss request',exact:true}).count(),0);await capture('dismissed')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('NEG-002 desktop and phone client suggests two terms edits; firm accepts one, rejects one and sends revision two', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS;if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`NEG-002-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const response=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(response.status(),200,await response.text());return response.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    const p=await cmd('proposal.prepare',{clientId:client.id,title:'Northstar autumn campaign',scope:'One studio shoot and usage licence.',terms:'Delivery in 14 days. Usage for one year.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    await page.goto(app.origin+'/app/proposal?id='+p.id);await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click()
    await page.getByRole('button',{name:'Allow terms suggestions'}).click();await capture('enabled')
    const ownerPath=app.origin+'/app/proposal?id='+p.id;await page.getByRole('link',{name:'Open client proposal',exact:true}).click();const old=page.url()
    await page.getByRole('button',{name:'Send verification code'}).click()
    const state=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=state.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click()
    for(const [original,replacement] of [['14 days','21 days'],['one year','forever']]){await page.getByLabel('Existing text',{exact:true}).fill(original);await page.getByLabel('Suggested replacement',{exact:true}).fill(replacement);await page.getByRole('button',{name:'Submit text suggestion'}).click()}
    assert.match(await page.locator('main').innerText(),/Delivery in 14 days/);await capture('client-suggestions')
    await page.goto(ownerPath)
    const suggestion=word=>page.locator('article').filter({has:page.locator('ins',{hasText:word})})
    // Action forms follow each tracked article.
    await suggestion('21 days').locator('xpath=following-sibling::form[1]').getByRole('button',{name:'Accept suggestion',exact:true}).click()
    await suggestion('forever').locator('xpath=following-sibling::form[1]').getByRole('button',{name:'Reject suggestion',exact:true}).click()
    assert.match(await page.locator('.proposal-status').innerText(),/draft.*Revision 2/is);assert.match(await page.locator('main').innerText(),/Delivery in 21 days\. Usage for one year\./);assert.equal(await page.getByRole('button',{name:'Send approved proposal'}).count(),0);await capture('reviewed-draft')
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();await capture('sent')
    assert.equal((await context.request.get(old)).status(),404)
    await page.getByRole('link',{name:'Open client proposal',exact:true}).click();assert.match(await page.locator('main').innerText(),/Delivery in 21 days\. Usage for one year\./);assert.equal(await page.getByRole('heading',{name:'Changes since your previous offer'}).count(),1);await capture('client-revision-two')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
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

test('SEND-002 desktop and phone show provider delivery and preserve bounce notice until explicit correction', {timeout:120000}, async()=>{
 const {harness}=await import('./harness.mjs'),{resendEvents}=await import('./delivery-provider.mjs'),{browserEdge}=await import('./browser-edge.mjs')
 const screenshots=process.env.PLATTER_SCREENSHOTS
 let browser,h,edge
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   const events=resendEvents(),calls=[]
   edge=await browserEdge()
   h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'network-edge-key',MAIL_WEBHOOK_KEY:events.key},outboundService:async req=>{calls.push(await req.json());return Response.json({id:'browser-mail-'+calls.length})}})
   edge.attach(h)
   const context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
   try{
    const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}])
    const page=await context.newPage(),capture=async name=>{await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`SEND-002-${name}-${width}.png`),fullPage:true})}
    await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.goto(h.origin+'/app')
    assert.ok((await page.locator('body').innerText()).includes('Clients'),page.url()+': '+await page.locator('body').innerText())
    await page.getByRole('link',{name:'Clients',exact:true}).click()
    await page.locator('[name="name"]').fill('Northstar Coffee');await page.locator('[name="email"]').fill('avery@northstar.example');await page.getByRole('button',{name:'Add client'}).click()
    await page.getByRole('link',{name:'Proposals',exact:true}).click()
    await page.locator('[name="clientId"]').selectOption({label:'Northstar Coffee'})
    for(const [name,value] of Object.entries({title:'Autumn brand campaign',scope:'Two studio shoots and edited product photographs.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'}))await page.locator(`[name="${name}"]`).fill(value)
    await page.getByRole('button',{name:'Prepare proposal',exact:true}).click();await page.getByRole('link',{name:'Autumn brand campaign',exact:true}).click()
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click()
    const id=(await h.state()).proposals[0].id,proposalUrl=h.origin+'/app/proposal?id='+id
    assert.match(await page.getByRole('list',{name:'Invitation delivery history'}).innerText(),/Accepted by provider/i);await capture('accepted')
    assert.equal((await events.emit(h,'browser-mail-1','email.delivery_delayed',{at:Date.now()-5000})).status,200)
    await page.goto(proposalUrl);assert.match(await page.getByRole('list',{name:'Invitation delivery history'}).innerText(),/Delivery delayed/i);await capture('deferred')
    assert.equal((await events.emit(h,'browser-mail-1','email.delivered',{at:Date.now()-4000})).status,200)
    await page.reload();assert.match(await page.getByRole('list',{name:'Invitation delivery history'}).innerText(),/Delivery reported/i);await capture('delivered')
    assert.equal((await events.emit(h,'browser-mail-1','email.bounced',{at:Date.now()-3000})).status,200)
    await page.reload();assert.match(await page.getByRole('list',{name:'Invitation delivery history'}).innerText(),/Bounced/i);await capture('bounced')
    await page.getByRole('link',{name:'Proposals',exact:true}).click()
    const inbox=page.getByRole('list',{name:'Sender bounce notices'})
    assert.match(await inbox.innerText(),/Unread/);assert.match(await inbox.innerText(),/Open follow-up/);await capture('notice-open')
    await page.getByRole('button',{name:'Mark notice as read'}).click();assert.match(await inbox.innerText(),/Open follow-up/);await capture('notice-read')
    await page.getByLabel('Correct recipient email').fill('avery.chen@northstar.example');await page.getByRole('button',{name:'Correct address and send fresh invitation'}).click()
    assert.deepEqual(calls.at(-1).to,['avery.chen@northstar.example']);assert.match(await inbox.innerText(),/Closed/);assert.equal(await page.getByRole('button',{name:'Close follow-up',exact:true}).count(),0);await capture('notice-corrected')
    await page.goto(proposalUrl);assert.match(await page.getByRole('list',{name:'Invitation delivery history'}).innerText(),/avery.chen@northstar.example/);await capture('corrected-invitation')
   }finally{await context.close();await h.close();h=null;await edge.close();edge=null}
  }
 }finally{await browser?.close();await h?.close();await edge?.close()}
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

test('SIGN-008 desktop and phone record a client-signed copy as accepted by upload and export its deposit', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS;if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`SIGN-008-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),p=await cmd('proposal.prepare',{clientId:client.id,title:'Northstar autumn campaign',scope:'One studio shoot and usage licence.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    await page.goto(app.origin+'/app/proposal?id='+p.id);await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();const clientPath=await page.getByRole('link',{name:'Open client proposal',exact:true}).getAttribute('href')
    const form=page.locator('form[action^="/app/paper-acceptance"]');assert.equal(await page.getByRole('heading',{name:'Record acceptance signed outside Platter',exact:true}).count(),1)
    await form.getByRole('radio',{name:/Full campaign/}).check();await form.getByLabel('Signer full name').fill('Morgan Lee');await form.getByLabel('Signed date').fill('2026-10-15')
    await form.getByLabel('Client-signed copy').setInputFiles({name:'Northstar-signed.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF client signed copy')});await capture('record-form')
    await form.getByRole('checkbox').check()
    await form.getByRole('button',{name:'Record accepted by upload',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    assert.match(await page.getByRole('status').innerText(),/Accepted by upload/);assert.match(await page.locator('.proposal-status').innerText(),/accepted/i)
    const accepted=page.locator('section.panel:has(h2:text-is("Client acceptance"))');assert.match(await accepted.innerText(),/Morgan Lee[\s\S]*Full campaign[\s\S]*\$4,200\.00 USD[\s\S]*\$1,050\.00 USD[\s\S]*Accepted by upload: signed outside Platter\. Platter did not verify this signature\.[\s\S]*2026-10-15/)
    assert.doesNotMatch(await accepted.innerText(),/Morgan Lee · avery@/,'the client mailbox is not shown as the paper signer')
    const copy=accepted.getByRole('link',{name:/Northstar-signed\.pdf/});const file=await context.request.get(app.origin+await copy.getAttribute('href'));assert.equal(file.status(),200);assert.equal((await file.body()).toString(),'%PDF client signed copy')
    assert.equal(await page.getByRole('heading',{name:'Record acceptance signed outside Platter',exact:true}).count(),0);await capture('accepted-by-upload')
    await page.getByRole('button',{name:'Export invoice CSV',exact:true}).click();const invoice=page.getByRole('link',{name:'Download deposit invoice CSV',exact:true});const csv=await context.request.get(app.origin+await invoice.getAttribute('href'));assert.match(await csv.text(),/1050\.00/);await capture('deposit-export')
    await page.goto(app.origin+clientPath);assert.equal(await page.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Accept proposal'}).count(),0);await capture('client-accepted')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('REPORT-005 desktop and phone export the filtered pipeline CSV and schedule weekly email in the installation time zone', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS;if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`REPORT-005-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    for(const [title,price] of [['Spring catalogue','3234.56'],['Autumn campaign','4200']]){const p=await cmd('proposal.prepare',{clientId:client.id,title,scope:'One studio shoot.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:price,depositPercent:'25'});await cmd('proposal.approve',{id:p.id,version:1,revision:1});await cmd('proposal.send',{id:p.id,version:2})}
    await page.goto(app.origin+'/app');await page.getByLabel('Status').selectOption('sent');await page.getByLabel('Sort by').selectOption('value');await page.getByLabel('Direction').selectOption('desc');await page.getByRole('button',{name:'Filter pipeline'}).click()
    const total=await page.locator('[data-pipeline-total="USD"]').innerText();assert.equal(total,'$7,434.56 USD')
    const href=await page.getByRole('link',{name:'Download pipeline CSV',exact:true}).getAttribute('href');const csv=await(await context.request.get(app.origin+href)).text()
    assert.deepEqual(csv.trim().split('\r\n').map(l=>l.split(',')[0]),['Title','Autumn campaign','Spring catalogue','Total (2 proposals)']);assert.match(csv,/USD,7434\.56,/);await capture('export')
    const panel=page.locator('section.panel:has(h2:text-is("Report export and email"))')
    assert.equal(await panel.getByLabel('Installation time zone').inputValue(),'UTC');await panel.getByLabel('Installation time zone').fill('America/New_York');await panel.getByRole('button',{name:'Save time zone',exact:true}).click();assert.equal(await page.getByRole('alert').count(),0)
    await panel.getByLabel('Frequency').selectOption('weekly');await panel.getByLabel('Day (weekly)').selectOption('1');await panel.getByLabel('Hour (America/New_York)').selectOption('8')
    await panel.getByRole('checkbox',{name:/Jordan Northstar/}).check();await panel.getByRole('button',{name:'Schedule report email',exact:true}).click()
    assert.equal(await page.getByRole('alert').count(),0)
    const schedules=page.getByRole('list',{name:'Report schedules'});assert.match(await schedules.innerText(),/Weekly on Monday at 08:00 America\/New_York[\s\S]*status=sent&sort=value&direction=desc[\s\S]*owner@northstar\.example/);assert.match(await schedules.innerText(),/No runs yet/);await capture('scheduled')
    await schedules.getByRole('button',{name:'Stop this schedule'}).click();assert.match(await page.locator('section.panel:has(h2:text-is("Report export and email"))').innerText(),/No report email is scheduled/);await capture('stopped')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
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


test('SEND-004 expired offer requests reopening and owner extends same links at desktop and phone', {timeout:120000}, async()=>{
 let app,browser;const screenshots=process.env.PLATTER_SCREENSHOTS
 try {
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp({scheduled:true});const context=await browser.newContext({viewport:{width,height:900}})
   try {
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`SEND-004-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    await app.fireCron(Date.parse('2027-03-01T15:00:00Z'));await cmd('report.time-zone',{timeZone:'America/New_York'})
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),made=await cmd('proposal.prepare',{clientId:client.id,title:'Spring campaign offer',scope:'Two studio shoots and edited campaign photographs.',terms:'Delivery after client review.',optionOne:'Studio',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    await page.goto(app.origin+'/app/proposal?id='+made.id);await page.getByLabel('Expiry type').selectOption('days');await page.getByLabel('Expiry period in calendar days').fill('7');await page.getByLabel('Warning lead days (leave blank for no warning)').fill('1');await page.getByRole('button',{name:'Save expiry',exact:true}).click();await capture('configured')
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();await page.getByRole('link',{name:'Open client proposal',exact:true}).click();const clientUrl=page.url()
    assert.match(await page.locator('main').innerText(),/2027-03-08.*America\/New_York/);await capture('client-live')
    await app.fireCron(Date.parse('2027-03-08T05:00:00Z'));await page.reload();assert.equal(await page.getByRole('heading',{name:'This proposal has expired',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Accept proposal',exact:true}).count(),0);await capture('client-expired')
    await page.getByRole('button',{name:'Send verification code'}).click();const state=await (await context.request.get(app.origin+'/api/platter/state')).json(),code=state.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click();await page.getByRole('button',{name:'Request reopening',exact:true}).click();assert.match(await page.locator('main').innerText(),/request to reopen.*saved/is);await capture('requested')
    await page.goto(app.origin+'/app?status=expired');assert.match(await page.locator('main').innerText(),/1 proposals match/);await capture('pipeline-expired')
    await page.getByRole('link',{name:'Spring campaign offer',exact:true}).click();assert.match(await page.locator('main').innerText(),/Waiting for your response/);await page.getByLabel('Expiry type').selectOption('date');await page.getByLabel('Expiry date in installation time').fill('2027-03-15');await page.getByRole('button',{name:'Save expiry',exact:true}).click();await capture('owner-reopened')
    await page.goto(clientUrl);assert.equal(await page.getByRole('heading',{name:'This proposal has expired',exact:true}).count(),0);await page.getByRole('radio',{name:/Full campaign/}).check();await page.getByLabel('Your full name').fill('Avery Chen');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click();assert.equal(await page.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1);await capture('accepted')
    await app.fireCron(Date.parse('2027-04-01T04:00:00Z'));await page.reload();assert.equal(await page.getByRole('heading',{name:'This proposal has expired',exact:true}).count(),0);assert.equal((await (await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(p=>p.id===made.id).status,'accepted')
    const legacy=await cmd('proposal.prepare',{clientId:client.id,title:'Legacy Northstar offer',scope:'An earlier studio campaign.',optionOne:'Studio',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    await cmd('proposal.approve',{id:legacy.id,version:1,revision:1});await cmd('proposal.send',{id:legacy.id,version:2})
    // Provision a historical schema fixture, then exercise all controls through the built page.
    await app.db.prepare('DELETE FROM p_expiry WHERE proposal_id=?').bind(legacy.id).run()
    await page.goto(app.origin+'/app/proposal?id='+legacy.id);assert.match(await page.locator('main').innerText(),/No original send time is recorded/);await capture('legacy-unknown-send')
    await page.getByLabel('Expiry type').selectOption('days');await page.getByLabel('Expiry period in calendar days').fill('7');await page.getByRole('button',{name:'Save expiry',exact:true}).click();assert.match(await page.locator('main').innerText(),/no recorded send time/)
    await page.getByLabel('Expiry type').selectOption('date');await page.getByLabel('Expiry date in installation time').fill('2027-04-08');await page.getByRole('button',{name:'Save expiry',exact:true}).click();await capture('legacy-explicit-date')

   } finally {await context.close();await app.close();app=undefined}
  }
 } finally {await browser?.close();await app?.close()}
})

test('MOB-001 / FOLLOW-004 invited client asks exact sent sections; owner queue answers and agreement retains threads on desktop and phone', {timeout:120000}, async()=>{
 let app,browser;const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']});if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`FOLLOW-004-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),made=await cmd('proposal.prepare',{clientId:client.id,title:'Autumn campaign photography',scope:'Two studio shoots and edited photographs for the autumn launch.',terms:'Delivery within ten business days after client review.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    await page.goto(app.origin+'/app/proposal?id='+made.id);await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();await page.getByRole('link',{name:'Open client proposal',exact:true}).click();const clientUrl=page.url()
    assert.equal(await page.getByRole('button',{name:'Send question to owner'}).count(),0);await page.getByRole('button',{name:'Send verification code'}).click()
    const state=await (await context.request.get(app.origin+'/api/platter/state')).json(),code=state.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click();await capture('client-ready')
    for(const [section,body] of [['scope','Does the campaign include close-up product photographs?'],['pricing','Is the deposit included in the full campaign price?'],['terms','Can the review meeting happen on a Friday?']]){await page.getByLabel('Question about').selectOption(section);await page.getByLabel('Your question',{exact:true}).fill(body);await page.getByRole('button',{name:'Send question to owner'}).click()}
    let questionOffer=(await (await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(p=>p.id===made.id)
    await cmd('expiry.set',{id:made.id,version:questionOffer.version,mode:'date',date:'2020-01-01'});await page.goto(clientUrl)
    assert.equal(await page.getByRole('button',{name:'Accept proposal',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Send question to owner'}).count(),1);await capture('expired-discussion')
    questionOffer=(await (await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(p=>p.id===made.id)
    await cmd('expiry.remove',{id:made.id,version:questionOffer.version});await page.goto(clientUrl)
    await capture('client-questions');await page.goto(app.origin+'/app');const queue=page.locator('section').filter({has:page.getByRole('heading',{name:'Open client questions',exact:true})});assert.equal(await queue.getByRole('link',{name:'Autumn campaign photography'}).count(),3);await capture('owner-queue')
    await queue.getByRole('link',{name:'Autumn campaign photography'}).first().click();await page.getByLabel('Answer this question').first().fill('Yes. The two shoots include close-up product photographs and full campaign usage.');await page.getByRole('button',{name:'Send answer to client'}).first().click();assert.match(await page.locator('main').innerText(),/include close-up product photographs and full campaign usage/);await capture('owner-answer')
    await page.goto(clientUrl);assert.match(await page.locator('main').innerText(),/include close-up product photographs and full campaign usage/);await capture('client-answer')
    await page.getByRole('radio',{name:/Full campaign/}).check();await page.getByLabel('Your full name').fill('Avery Chen');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click();assert.equal(await page.getByRole('heading',{name:'Agreement question history',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Send question to owner'}).count(),0);assert.match(await page.locator('main').innerText(),/review meeting happen on a Friday/);await capture('agreement-history')
    const final=await (await context.request.get(app.origin+'/api/platter/state')).json();assert.equal(final.proposals.find(p=>p.id===made.id).questions.length,3);assert.equal(final.openQuestions.length,2);assert.equal(final.outbox.filter(m=>m.subject.startsWith('Answer to your question:')).length,1)
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})


test('FOLLOW-005 / SEND-010 / FOLLOW-002 desktop and phone withdraw, inspect revoked offer and audit, then approve a new revision', {timeout:180000}, async()=>{
 let browser,app
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp()
   const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`SEND-010-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.getByRole('link',{name:'Clients',exact:true}).click();await page.locator('[name="name"]').fill('Northstar Coffee');await page.locator('[name="email"]').fill('avery@northstar.example');await page.getByRole('button',{name:'Add client'}).click()
    await page.getByRole('link',{name:'Proposals',exact:true}).click();await page.locator('[name="clientId"]').selectOption({label:'Northstar Coffee'})
    for(const [name,value]of Object.entries({title:'Brand photography',scope:'Studio photography and campaign usage.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'}))await page.locator(`[name="${name}"]`).fill(value)
    await page.getByRole('button',{name:'Prepare proposal',exact:true}).click();await page.getByRole('link',{name:'Brand photography',exact:true}).click();await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click()
    const original=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals[0],oldPath='/p/'+original.shareToken
    const ownerUrl=app.origin+'/app/proposal?id='+original.id;await page.goto(app.origin+oldPath);await page.getByRole('button',{name:'Send verification code'}).click()
    const mailState=await(await context.request.get(app.origin+'/api/platter/state')).json(),code=mailState.outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click();await page.getByLabel('Your question').fill('Can we start the studio shoot next month?');await page.getByRole('button',{name:'Send question to owner'}).click();await page.goto(ownerUrl)
    await capture('send');await page.getByLabel('Withdrawal reason').fill('Sent to the wrong client');await page.getByRole('button',{name:'Withdraw proposal',exact:true}).click()
    assert.match(await page.locator('.proposal-status').innerText(),/withdrawn/i);assert.match(await page.locator('main').innerText(),/Sent to the wrong client/);assert.match(await page.locator('main').innerText(),/Can we start the studio shoot next month/);assert.equal(await page.getByRole('button',{name:'Send answer to client'}).count(),0);await capture('withdrawn')
    const proposalUrl=app.origin+'/app/proposal?id='+original.id
    assert.equal((await page.goto(app.origin+oldPath)).status(),410);assert.equal(await page.getByRole('heading',{name:'Proposal withdrawn',exact:true}).count(),1);assert.equal(await page.getByRole('link',{name:'owner@northstar.example'}).count(),1);assert.ok(!(await page.locator('main').innerText()).includes('Studio photography'));await capture('revoked')
    await page.goto(app.origin+'/app/audit?action=proposal.withdraw');assert.match(await page.locator('main').innerText(),/Sent to the wrong client/);await capture('audit')
    await page.goto(app.origin+'/app?status=withdrawn');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');await capture('pipeline')
    await page.goto(proposalUrl);await page.getByRole('button',{name:'Prepare negotiated revision'}).click()
    await page.getByLabel('Next action',{exact:true}).fill('Call Avery about the corrected offer');await page.getByLabel('Due date',{exact:true}).fill('2027-03-11');await page.getByRole('button',{name:'Save sales follow-up',exact:true}).click()
    assert.equal(await page.getByLabel('Next action',{exact:true}).inputValue(),'Call Avery about the corrected offer')
    const salesScreenshots=process.env.PLATTER_SALES_SCREENSHOTS
    if(salesScreenshots){await mkdir(salesScreenshots,{recursive:true});await page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Next sales action',exact:true})}).screenshot({path:join(salesScreenshots,`FOLLOW-002-negotiated-${width}.png`)})}
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();assert.equal(await page.getByRole('button',{name:'Send answer to client'}).count(),0);await capture('reissued')
    assert.equal((await context.request.get(app.origin+oldPath)).status(),410)
    await page.getByRole('link',{name:'Open client proposal',exact:true}).click();assert.equal(await page.getByRole('heading',{name:'Verify your email',exact:true}).count(),1);await capture('new-offer')
    await page.getByRole('button',{name:'Send verification code'}).click()
    const newState=await(await context.request.get(app.origin+'/api/platter/state')).json(),newCode=newState.outbox.find(m=>m.proposal_id===original.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(newCode);await page.getByRole('button',{name:'Verify email',exact:true}).click()
    await page.getByLabel('Decline reason',{exact:true}).fill('Budget');await capture('decline-client')
    await page.getByRole('button',{name:'Decline proposal',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Proposal withdrawn',exact:true}).count(),1);assert.ok(!(await page.locator('main').innerText()).includes('Studio photography'))
    await page.goto(proposalUrl);const outcome=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Proposal outcome',exact:true})})
    assert.match(await outcome.innerText(),/declined/);assert.match(await outcome.innerText(),/Budget/);assert.equal(await page.getByRole('button',{name:'Send fresh client link',exact:true}).count(),0);await capture('declined-owner');if(screenshots)await outcome.screenshot({path:join(screenshots,`FOLLOW-005-declined-panel-${width}.png`)})
    await page.goto(app.origin+'/app?status=declined');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.match(await page.locator('[data-pipeline-total="USD"]').innerText(),/4,200/);assert.equal(await page.locator('[data-proposal-id]').count(),1);await capture('declined-pipeline')
    const cmd=async(name,input)=>{const response=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(response.status(),200,await response.text());return response.json()}
    const lost=await cmd('proposal.prepare',{clientId:original.client_id,title:'Cancelled campaign',scope:'A campaign cancelled before work began.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
    await cmd('proposal.approve',{id:lost.id,version:1,revision:1});const lostShare=await cmd('proposal.send',{id:lost.id,version:2})
    await page.goto(app.origin+'/app/proposal?id='+lost.id);await page.getByLabel('Lost reason',{exact:true}).fill('Project cancelled');await page.getByRole('button',{name:'Mark proposal lost',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/Project cancelled/);await capture('lost-owner');if(screenshots)await page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Proposal outcome',exact:true})}).screenshot({path:join(screenshots,`FOLLOW-005-lost-panel-${width}.png`)})
    const lostState=await(await context.request.get(app.origin+'/api/platter/state')).json();assert.ok(!lostState.outbox.some(m=>m.proposal_id===lost.id&&m.subject.startsWith('Proposal withdrawn:')));assert.ok(!lostState.followups.rows.some(r=>r.id===lost.id||r.id===original.id))
    assert.equal((await context.request.get(lostShare.shareUrl)).status(),410)
    await page.goto(app.origin+'/app?status=lost');assert.equal(await page.locator('[data-proposal-id]').count(),1);assert.match(await page.locator('[data-proposal-id]').innerText(),/Cancelled campaign/);await capture('lost-pipeline')
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
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
   app=await installedApp({businessFixture:'fixtures/first-release-aud.rer'});const context=await browser.newContext({viewport:{width,height:900}})
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

test('MOB-001 / FOLLOW-002 desktop and phone schedule, notify, complete, dismiss and reopen sales actions with due pipeline reporting', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),command=async(name,input)=>{const response=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(response.status(),200,await response.text());return response.json()}
    const capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`FOLLOW-002-${name}-${width}.png`),fullPage:true})}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const client=await command('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    const made=await command('proposal.prepare',{clientId:client.id,title:'Spring campaign photography',scope:'Two production days and a campaign usage licence for Northstar Coffee.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Complete campaign',priceTwo:'6800',depositPercent:'25'})
    await page.goto(app.origin+'/app/proposal?id='+made.id)
    await page.getByLabel('Next action',{exact:true}).fill('Call Avery about the production dates');await page.getByLabel('Due date',{exact:true}).fill('2020-03-10');await page.getByRole('button',{name:'Save sales follow-up',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/Call Avery about the production dates/);await capture('scheduled')
    await page.getByRole('button',{name:'Notify sales owner',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Complete sales follow-up',exact:true}).count(),1)
    await page.goto(app.origin+'/app');assert.equal(await page.locator('[data-followup-id]').count(),1)
    await page.getByLabel('Due follow-up',{exact:true}).selectOption('yes');await page.getByLabel('Sort by',{exact:true}).selectOption('dueDate');await page.getByRole('button',{name:'Filter pipeline'}).click()
    assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.match(await page.locator('[data-pipeline-total="USD"]').innerText(),/6,800\.00 USD/);await capture('queue-and-pipeline')
    await page.getByRole('link',{name:'Follow up: Spring campaign photography',exact:true}).click();await page.getByLabel('Logged action',{exact:true}).fill('Called Avery and agreed on the production dates.');await page.getByRole('button',{name:'Complete sales follow-up',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/Sales follow-up closed/);assert.match(await page.locator('main').innerText(),/Called Avery and agreed/);await capture('completed')
    await page.getByLabel('Next action',{exact:true}).fill('Confirm the location');await page.getByLabel('Due date',{exact:true}).fill('2027-03-11');await page.getByRole('button',{name:'Save sales follow-up',exact:true}).click()
    await page.getByLabel('Dismissal reason',{exact:true}).fill('Avery confirmed the location by email.');await page.getByRole('button',{name:'Dismiss sales follow-up',exact:true}).click();assert.match(await page.locator('main').innerText(),/Sales follow-up closed/);await capture('dismissed')
    await page.goto(app.origin+'/app');assert.equal(await page.locator('[data-followup-id]').count(),0)
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


test('SEND-006 desktop and phone rehearse to self, then edit invitations, fresh links and negotiated sends with exact retained history', {timeout:180000},async()=>{
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp()
   const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage()
    const claimed=await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0});assert.equal(claimed.status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const response=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(response.status(),200,await response.text());return response.json()}
    const client=await cmd('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'})
    const made=await cmd('proposal.prepare',{clientId:client.id,title:'Photography rehearsal',scope:'A studio photography session.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
    await page.goto(app.origin+'/app/proposal?id='+made.id)
    const composer=page.locator('section').filter({has:page.getByRole('heading',{name:'Test the proposal email',exact:true})})
    await composer.getByLabel('Test subject',{exact:true}).fill('Proposal for Northstar')
    await composer.getByLabel('Test message',{exact:true}).fill('Hi Avery, please review the photography scope.')
    assert.match(await composer.innerText(),/owner@northstar.example/)
    if(screenshots)await page.screenshot({path:join(screenshots,`SEND-006-composer-${width}.png`),fullPage:true})
    await composer.getByRole('button',{name:'Send test to me',exact:true}).click()
    await page.getByText('Test queued to your sign-in address. No client invitation was sent.',{exact:true}).waitFor()
    assert.match(await page.locator('.proposal-status').innerText(),/draft.*Revision 1/is)
    assert.equal(await page.getByRole('button',{name:'Approve this revision'}).count(),1)
    assert.equal(await page.getByRole('button',{name:'Send approved proposal'}).count(),0)
    assert.equal(await page.getByRole('heading',{name:'Test-send timeline'}).count(),1)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    if(screenshots)await page.screenshot({path:join(screenshots,`SEND-006-tested-${width}.png`),fullPage:true})
    const state=await (await context.request.get(app.origin+'/api/platter/state')).json()
    assert.equal(state.outbox.length,1)
    const mail=state.outbox[0]
    assert.equal(mail.recipient,'owner@northstar.example');assert.equal(mail.subject,'[Test] Proposal for Northstar')
    assert.ok(mail.body.startsWith('Hi Avery, please review the photography scope.\n\n'))
    const preview=mail.body.match(/https?:\/\/[^\s]+/)[0]
    assert.equal(new URL(preview).pathname,'/app/preview')
    await page.goto(preview)
    await page.getByText(/Preview · Revision 1 · Viewing as Northstar Coffee/).waitFor()
    assert.match(await page.frameLocator('iframe[title="Client-page preview"]').locator('main').innerText(),/Preview only/)
    if(screenshots)await page.screenshot({path:join(screenshots,`SEND-006-preview-${width}.png`),fullPage:true})
    const signedOut=await browser.newContext()
    try{assert.equal((await signedOut.request.get(preview)).status(),401)}finally{await signedOut.close()}
    await page.goto(app.origin+'/app/proposal?id='+made.id)
    await page.getByRole('button',{name:'Approve this revision'}).click()
    await page.getByText('Review invitation email',{exact:true}).click()
    await page.getByLabel('Invitation subject',{exact:true}).fill('Photography for {client.company}')
    await page.getByLabel('Invitation message',{exact:true}).fill('Hi Avery, please review the photography scope.')
    await page.getByRole('button',{name:'Send approved proposal'}).click()
    await page.getByText('Fill the variable before sending: client.company',{exact:true}).waitFor()
    assert.equal(await page.getByLabel('Invitation message',{exact:true}).inputValue(),'Hi Avery, please review the photography scope.')
    await page.getByLabel('Invitation subject',{exact:true}).fill('Photography for Northstar')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    if(screenshots){await page.screenshot({path:join(screenshots,`SEND-006-invitation-${width}.png`),fullPage:true});await page.locator('#invitation-'+made.id).screenshot({path:join(screenshots,`SEND-006-invitation-panel-${width}.png`)})}
    await page.getByRole('button',{name:'Send approved proposal'}).click()
    const history=page.locator('section').filter({has:page.getByRole('heading',{name:'Invitation email history',exact:true})})
    await history.getByRole('heading',{name:'Photography for Northstar',exact:true}).waitFor()
    assert.match(await history.innerText(),/Hi Avery, please review the photography scope\./)
    let delivered=await (await context.request.get(app.origin+'/api/platter/state')).json()
    let live=delivered.proposals.find(p=>p.id===made.id)
    const firstPath='/p/'+live.shareToken
    let invitation=delivered.outbox.find(m=>m.subject==='Photography for Northstar')
    assert.equal(invitation.recipient,'avery@northstar.example')
    assert.equal(invitation.body,'Hi Avery, please review the photography scope.\n\n'+app.origin+firstPath)
    assert.equal(live.revision,1);assert.equal(live.status,'sent')
    if(screenshots)await page.screenshot({path:join(screenshots,`SEND-006-invited-${width}.png`),fullPage:true})
    await page.getByText('Review invitation email',{exact:true}).click()
    await page.getByLabel('Invitation subject',{exact:true}).fill('Fresh photography invitation')
    await page.getByLabel('Invitation message',{exact:true}).fill('Avery, please use this new link.')
    await page.getByRole('button',{name:'Send fresh client link',exact:true}).click()
    assert.equal((await context.request.get(app.origin+firstPath)).status(),404)
    delivered=await (await context.request.get(app.origin+'/api/platter/state')).json()
    live=delivered.proposals.find(p=>p.id===made.id)
    assert.equal(live.invitationMessages.length,2)
    const next=await cmd('proposal.negotiate',{id:made.id,version:live.version,clientId:client.id,title:'Photography rehearsal',scope:'A studio photography session with a second location.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
    await page.goto(app.origin+'/app/proposal?id='+made.id)
    await page.getByRole('button',{name:'Approve this revision'}).click()
    await page.getByText('Review invitation email',{exact:true}).click()
    await page.getByLabel('Invitation subject',{exact:true}).fill('Revised photography scope')
    await page.getByLabel('Invitation message',{exact:true}).fill('Hi Avery, the second location is included.')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    if(screenshots){await page.screenshot({path:join(screenshots,`SEND-006-revision-composer-${width}.png`),fullPage:true});await page.locator('#invitation-'+made.id).screenshot({path:join(screenshots,`SEND-006-revision-panel-${width}.png`)})}
    await page.getByRole('button',{name:'Send approved proposal'}).click()
    await history.getByRole('heading',{name:'Revised photography scope',exact:true}).waitFor()
    delivered=await (await context.request.get(app.origin+'/api/platter/state')).json()
    live=delivered.proposals.find(p=>p.id===made.id)
    assert.equal(live.revision,next.revision);assert.equal(live.invitationMessages.length,3)
    invitation=delivered.outbox.find(m=>m.subject==='Revised photography scope')
    assert.equal(invitation.body,'Hi Avery, the second location is included.\n\n'+app.origin+'/p/'+live.shareToken)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    if(screenshots)await page.screenshot({path:join(screenshots,`SEND-006-revision-invited-${width}.png`),fullPage:true})
   }finally{await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

test('MOB-001 / TEAM-001 / APPROVE-003 sales templates, sends, answers and queues with manager approval at desktop and phone widths', {timeout:180000}, async()=>{
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs')
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   const edge=await browserEdge(),mailCalls=[]
   let h
   try{h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',origin:edge.origin,unclaimed:true,auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-1'},outboundService:async request=>{const host=new URL(request.url).hostname;if(host==='quickbooks.api.intuit.com')return Response.json({CompanyInfo:{CompanyName:'Synthetic company'}});if(host==='openidconnect.googleapis.com')return Response.json({sub:'synthetic-platter-2200',email:'sales@synthetic-platter.example',email_verified:true});assert.equal(host,'api.resend.com');mailCalls.push(await request.json());return Response.json({id:'synthetic-platter-'+mailCalls.length})}});edge.attach(h)}catch(error){await edge.close();throw error}
   app={...h,token:h.auth.SETUP_TOKEN,close:async()=>{await edge.close();await h.close()}}
   const owner=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),sales=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),manager=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),admin=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),editor=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true}),clientContext=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
   try{
    const post=(context,path,data)=>context.request.post(app.origin+path,{headers:{origin:app.origin},data,maxRedirects:0})
    const command=async(context,name,input,status=200)=>{const r=await post(context,'/api/platter/command',{name,input});assert.equal(r.status(),status,await r.text());return r.json()}
    const state=async(context=owner)=>(await context.request.get(app.origin+'/api/platter/state')).json()
    const capture=async(page,name)=>{await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow on '+name+' at '+width);if(screenshots){await page.screenshot({path:join(screenshots,`TEAM-001-${name}-${width}.png`),fullPage:true});await page.screenshot({path:join(screenshots,`TEAM-001-${name}-${width}-viewport.png`)})}}
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
    const sp=await invite(sales,'sales'),mp=await invite(manager,'manager'),ep=await invite(editor,'content_editor'),ap=await invite(admin,'admin'),team=await command(owner,'team.create',{name:'East team'})
    await command(owner,'member.set',{operatorId:sp.id,version:0,role:'sales',teams:[team.id]})
    await command(owner,'member.set',{operatorId:mp.id,version:0,role:'manager',teams:[team.id]})
    await command(owner,'member.set',{operatorId:ep.id,version:0,role:'content_editor',teams:[team.id]})
    await command(owner,'member.set',{operatorId:ap.id,version:0,role:'admin',teams:[team.id]})
    const client=await command(owner,'client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'})
    await op.goto(app.origin+'/app/team');await capture(op,'team')
    await op.goto(app.origin+'/app/approvals');await op.getByLabel('Require approval for every proposal').selectOption('no');await op.getByRole('button',{name:'Save approval policy'}).click()
    await op.getByLabel('Rule name',{exact:true}).fill('Manager above $25,000');await op.getByLabel('First approver').selectOption('role:manager');await op.getByRole('button',{name:'Add approval rule',exact:true}).click();assert.equal(await op.getByRole('alert').count(),0);await capture(op,'approval-settings')
    const settingsPage=await admin.newPage();await settingsPage.goto(app.origin+'/app/settings');await settingsPage.getByLabel('Reminder days after sending',{exact:true}).fill('2, 5');await settingsPage.getByLabel('Default expiry days after sending (empty for no expiry)',{exact:true}).fill('30');await settingsPage.getByRole('button',{name:'Save workspace defaults',exact:true}).click();assert.equal(await settingsPage.getByRole('alert').count(),0);await capture(settingsPage,'admin-defaults');const defaults=(await state(owner)).workspaceDefaults;assert.equal(defaults.expiryDays,30);for(const actor of [sales,manager]){await command(actor,'workspace.defaults',{version:defaults.version,reminderDays:[1],expiryDays:1,paymentMethods:[]},403);assert.deepEqual((await state(owner)).workspaceDefaults,defaults)}
    await settingsPage.getByLabel('QuickBooks Online access token',{exact:true}).fill('synthetic-platter-2201');await settingsPage.getByLabel('QuickBooks company id',{exact:true}).fill('synthetic-platter-2202');const connectForm=settingsPage.locator('form').filter({has:settingsPage.getByRole('button',{name:'Connect QuickBooks Online',exact:true})});await connectForm.getByRole('checkbox').check();await connectForm.getByRole('button',{name:'Connect QuickBooks Online',exact:true}).click();assert.equal(await settingsPage.getByRole('alert').count(),0);await capture(settingsPage,'admin-provider');await settingsPage.getByRole('button',{name:'Disconnect QuickBooks Online',exact:true}).click();assert.equal((await state(owner)).connections.find(c=>c.provider==='quickbooks').status,'disconnected')
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
    const simple=await command(sales,'template.start',{id:'starter:consultancy',version:1,clientId:client.id});await page.goto(app.origin+'/app/proposal?id='+simple.id);assert.equal(await page.getByRole('button',{name:'Send proposal',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Approve this revision',exact:true}).count(),0);await capture(page,'sales-unruled');await page.getByRole('button',{name:'Send proposal',exact:true}).click();assert.equal((await state(sales)).proposals.find(p=>p.id===simple.id).status,'sent')
   }finally{await owner.close();await sales.close();await manager.close();await admin.close();await editor.close();await clientContext.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

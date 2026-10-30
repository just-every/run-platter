import {smsReenableBrowser} from './sms-reenable-browser.mjs'
import {smsInstallerJourney} from './sms-installer-journey.mjs'
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
        if (width === 1440) {
          for (const document of ['contract', 'acceptance']) {
            assert.equal((await page.goto(site.origin + '/docs/' + document)).status(), 200)
            assert.doesNotMatch(await page.locator('article').innerText(), /<!--|Generated from CONTRACT\.md by contract-docs/)
          }
        }
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

test('PRICE-008 legacy AUD agreement and new USD owner/client screens show exact currency at desktop and phone widths', { timeout: 120000 }, async () => {
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try {
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp({businessFixture:'fixtures/first-release-aud.ndjson'})
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
    const capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});if(screenshots)await page.screenshot({path:join(screenshots,`REPORT-001-${name}-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify({name,width,overflow:await page.locator('body *').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().right>innerWidth).map(n=>({tag:n.tagName,text:n.textContent.slice(0,100),class:n.className,width:n.getBoundingClientRect().width,right:n.getBoundingClientRect().right})).slice(0,12))}))}
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const client=await command('client.save',{name:'Northstar Coffee',email:'avery@northstar.example'}),fixture=[]
    for(const [title,price,status] of [['Brand identity','2400','draft'],['Seasonal product photography','4200','approved'],['Campaign launch','6800','approved']]){
     const made=await command('proposal.prepare',{clientId:client.id,title,scope:title==='Brand identity'?'Brand guidelines.':'Creative [campaign] for Northstar Coffee, including planning and a studio production day.',optionOne:'Studio essentials',priceOne:'1200',optionTwo:'Full campaign',priceTwo:price,depositPercent:'25'})
     if(status==='approved')await command('proposal.approve',{id:made.id,version:1,revision:1})
     fixture.push({...made,title,price,status})
    }
    const source=fixture[1];await command('template.save',{id:source.id,version:2,name:'Campaign body template'})
    const unrelated=fixture[0];await command('template.save',{id:unrelated.id,version:1,name:'Unrelated personal template'})
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
    assert.equal(await page.getByRole('heading',{name:'Campaign body template',exact:true}).count(),1);assert.equal(await page.getByRole('heading',{name:'Unrelated personal template',exact:true}).count(),0);assert.equal(await page.locator('[data-template-search-count]').getAttribute('data-template-search-count'),'1')
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
    const team=await command('team.create',{name:'Search review team'})
    await page.goto(app.origin+'/app/team');const folderForm=page.locator('form').filter({has:page.locator('select[name=kind]')});await folderForm.locator('[name=kind]').selectOption('proposal');await folderForm.getByLabel('Folder name',{exact:true}).fill('Campaign review folder');await folderForm.getByRole('checkbox',{name:'Search review team',exact:true}).check();await folderForm.getByRole('checkbox',{name:/I authorize this folder/}).check();await folderForm.getByRole('button',{name:'Create shared folder',exact:true}).click();await capture('proposal-folder-settings')
    const folders=(await(await context.request.get(app.origin+'/api/platter/state')).json()).resourceFolders,folder=folders.find(f=>f.name==='Campaign review folder')
    await page.goto(app.origin+'/app/proposal?id='+fixture[0].id);const filing=page.locator('form[action*="name=proposal.folder"]');await filing.getByLabel('Resource folder',{exact:true}).selectOption(folder.id);await filing.getByRole('checkbox',{name:/I confirm this folder audience/}).check();await filing.getByRole('button',{name:'File proposal',exact:true}).click();await capture('filed-proposal')
    await page.goto(app.origin+'/app');await page.getByLabel('Proposal folder',{exact:true}).selectOption(folder.id);await page.getByRole('button',{name:'Filter pipeline',exact:true}).click();assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.equal(await page.locator('[data-proposal-id]').getAttribute('data-proposal-id'),fixture[0].id);await capture('folder-search')

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
    assert.match(await page.getByRole('status').filter({hasText:'Accepted by upload'}).innerText(),/Accepted by upload/);assert.match(await page.locator('.proposal-status').innerText(),/accepted/i)
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

test('REPORT-005 / REPORT-006 desktop and phone export the filtered pipeline CSV and schedule weekly email in the installation time zone', {timeout:120000}, async()=>{
 let app,browser
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  const screenshots=process.env.PLATTER_SCREENSHOTS;if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp();const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`REPORT-005-006-${name}-${width}.png`),fullPage:true})}
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
  browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440]){
   const crmWrites=[]
   app=await installedApp({scheduled:true,outboundService:async request=>{const url=new URL(request.url);assert.equal(url.hostname,'api.hubapi.com');if(url.pathname==='/account-info/v3/details')return Response.json({portalId:'synthetic-platter-9950'});if(url.pathname==='/crm/v3/pipelines/deals')return Response.json({results:[{id:'synthetic-platter-9951',stages:[{id:'synthetic-platter-9952',metadata:{isClosed:'true',probability:'1'}},{id:'synthetic-platter-9953',metadata:{isClosed:'true',probability:'0'}}]}]});const id=url.pathname.split('/').at(-1);if(request.method==='GET')return Response.json({id,properties:{pipeline:'synthetic-platter-9951'}});const body=await request.json();crmWrites.push(body);return Response.json({id,properties:body.properties})}})
   const context=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await context.newPage(),capture=async name=>{
     await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
     if(screenshots){
      for(const shownWidth of [1440,390]){
       await page.setViewportSize({width:shownWidth,height:900})
       await page.screenshot({path:join(screenshots,`SEND-010-${name}-${shownWidth}.png`),fullPage:true})
      }
      await page.setViewportSize({width,height:900})
     }
    }
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const cmd=async(name,input)=>{const response=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(response.status(),200,await response.text());return response.json()}
    await cmd('provider.connect',{provider:'hubspot',version:0,token:'synthetic-platter-9954',consent:true})
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
    const receiptState=await(await context.request.get(app.origin+'/api/platter/state')).json(),receipt=receiptState.proposals.find(p=>p.id===original.id).withdrawals[0]
    assert.equal(receipt.reason,'Sent to the wrong client');assert.equal(receipt.actor_id,receiptState.actor.id)
    const auditRows=(await(await context.request.get(app.origin+'/api/platter/audit?action=proposal.withdraw')).json()).rows
    assert.equal(auditRows.length,1);assert.equal(auditRows[0].reason,receipt.reason);assert.equal(auditRows[0].actor_id,receipt.actor_id);assert.equal(auditRows[0].occurred_at,receipt.withdrawn_at)
    await page.goto(app.origin+'/app/audit?action=proposal.withdraw');assert.match(await page.locator('main').innerText(),/Sent to the wrong client/);assert.match(await page.locator('.audit-what').innerText(),/Jordan Northstar/);await capture('audit')
    await page.goto(app.origin+'/app?status=withdrawn');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.equal(await page.locator('[data-pipeline-total="USD"]').innerText(),'$4,200.00 USD');assert.match(await page.locator('[data-proposal-id="'+original.id+'"]').innerText(),/Prepare a new revision/);await capture('pipeline')
    await page.goto(proposalUrl);await page.getByRole('button',{name:'Prepare negotiated revision'}).click()
    await page.getByLabel('Next action',{exact:true}).fill('Call Avery about the corrected offer');await page.getByLabel('Due date',{exact:true}).fill('2027-03-11');await page.getByRole('button',{name:'Save sales follow-up',exact:true}).click()
    assert.equal(await page.getByLabel('Next action',{exact:true}).inputValue(),'Call Avery about the corrected offer')
    const salesScreenshots=process.env.PLATTER_SALES_SCREENSHOTS
    if(salesScreenshots){await mkdir(salesScreenshots,{recursive:true});await page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Next sales action',exact:true})}).screenshot({path:join(salesScreenshots,`FOLLOW-002-negotiated-${width}.png`)})}
    await page.getByRole('button',{name:'Approve this revision'}).click();await page.getByRole('button',{name:'Send approved proposal'}).click();assert.equal(await page.getByRole('button',{name:'Send answer to client'}).count(),0);await capture('reissued')
    assert.equal((await context.request.get(app.origin+oldPath)).status(),410)
    const reissuedState=await(await context.request.get(app.origin+'/api/platter/state')).json(),reissued=reissuedState.proposals.find(p=>p.id===original.id)
    assert.equal(reissued.revision,2);assert.deepEqual(reissued.withdrawals,[receipt]);assert.notEqual(reissued.shareToken,original.shareToken)
    await page.goto(app.origin+'/app?status=withdrawn');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'0');assert.equal(await page.locator('[data-pipeline-total]').count(),0);await capture('post-reissue-report')
    await page.goto(app.origin+'/app?status=sent');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.equal(await page.locator('[data-pipeline-total="USD"]').innerText(),'$4,200.00 USD')
    await page.goto(proposalUrl)
    await page.getByText('CRM outcome sync',{exact:true}).click()
    const authorize=page.locator('form:has(input[name="dealId"])')
    for(const [name,value] of Object.entries({dealId:'synthetic-platter-9955',pipelineId:'synthetic-platter-9951',wonStage:'synthetic-platter-9952',lostStage:'synthetic-platter-9953'}))await authorize.locator(`[name=${name}]`).fill(value)
    await authorize.getByRole('checkbox').check();await capture('crm-consent');if(screenshots)await authorize.screenshot({path:join(screenshots,`FOLLOW-005-crm-consent-panel-${width}.png`)});await authorize.getByRole('button',{name:'Authorize CRM outcome sync',exact:true}).click()
    await page.getByRole('link',{name:'Open client proposal',exact:true}).click();assert.equal(await page.getByRole('heading',{name:'Verify your email',exact:true}).count(),1);await capture('new-offer')
    await page.getByRole('button',{name:'Send verification code'}).click()
    const newState=await(await context.request.get(app.origin+'/api/platter/state')).json(),newCode=newState.outbox.find(m=>m.proposal_id===original.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await page.getByLabel('Email verification code').fill(newCode);await page.getByRole('button',{name:'Verify email',exact:true}).click()
    await page.getByLabel('Decline reason',{exact:true}).fill('Budget');await capture('decline-client')
    await page.getByRole('button',{name:'Decline proposal',exact:true}).click()
    assert.equal(await page.getByRole('heading',{name:'Proposal withdrawn',exact:true}).count(),1);assert.ok(!(await page.locator('main').innerText()).includes('Studio photography'))
    assert.deepEqual(crmWrites,[{properties:{dealstage:'synthetic-platter-9953'}}])
    await page.goto(proposalUrl);const outcome=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Proposal outcome',exact:true})})
    assert.match(await outcome.innerText(),/declined/);assert.match(await outcome.innerText(),/Budget/);assert.equal(await page.getByRole('button',{name:'Send fresh client link',exact:true}).count(),0);await capture('declined-owner');if(screenshots)await outcome.screenshot({path:join(screenshots,`FOLLOW-005-declined-panel-${width}.png`)})
    await page.goto(app.origin+'/app?status=declined');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.match(await page.locator('[data-pipeline-total="USD"]').innerText(),/4,200/);assert.equal(await page.locator('[data-proposal-id]').count(),1);await capture('declined-pipeline')
    const lost=await cmd('proposal.prepare',{clientId:original.client_id,title:'Cancelled campaign',scope:'A campaign cancelled before work began.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
    await cmd('proposal.approve',{id:lost.id,version:1,revision:1});const lostShare=await cmd('proposal.send',{id:lost.id,version:2})
    await page.goto(app.origin+'/app/proposal?id='+lost.id);await page.getByLabel('Lost reason',{exact:true}).fill('Project cancelled');await page.getByRole('button',{name:'Mark proposal lost',exact:true}).click()
    assert.match(await page.locator('main').innerText(),/Project cancelled/);await capture('lost-owner');if(screenshots)await page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Proposal outcome',exact:true})}).screenshot({path:join(screenshots,`FOLLOW-005-lost-panel-${width}.png`)})
    const lostState=await(await context.request.get(app.origin+'/api/platter/state')).json();assert.ok(!lostState.outbox.some(m=>m.proposal_id===lost.id&&m.subject.startsWith('Proposal withdrawn:')));assert.ok(!lostState.followups.rows.some(r=>r.id===lost.id||r.id===original.id))
    assert.equal((await context.request.get(lostShare.shareUrl)).status(),410)
    await page.goto(app.origin+'/app?status=lost');assert.equal(await page.locator('[data-proposal-id]').count(),1);assert.match(await page.locator('[data-proposal-id]').innerText(),/Cancelled campaign/);await capture('lost-pipeline')
    await page.goto(app.origin+'/app/settings');await page.getByLabel('Outcome reasons, one per line').fill('Budget\nTiming\nSigned outside');await page.getByRole('button',{name:'Save outcome reasons',exact:true}).click();await capture('outcome-settings')
    const won=await cmd('proposal.prepare',{clientId:original.client_id,title:'Won by explicit override',scope:'An explicitly recorded business outcome.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
    await cmd('proposal.approve',{id:won.id,version:1,revision:1});const wonShare=await cmd('proposal.send',{id:won.id,version:2})
    await page.goto(app.origin+'/app/proposal?id='+won.id)
    await page.getByLabel('Won reason',{exact:true}).selectOption('Signed outside');await page.getByRole('button',{name:'Mark proposal won',exact:true}).click()
    const wonState=await(await context.request.get(app.origin+'/api/platter/state')).json(),wonRow=wonState.proposals.find(p=>p.id===won.id)
    assert.equal(wonRow.pipelineStatus,'won');assert.equal(wonRow.acceptance,undefined);assert.match(await page.locator('main').innerText(),/Signed outside/);assert.equal((await context.request.get(wonShare.shareUrl)).status(),410);await capture('won-owner')
    await page.goto(app.origin+'/app?status=won');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.match(await page.locator('[data-pipeline-total="USD"]').innerText(),/4,200/);await capture('won-pipeline')
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

test('FOLLOW-001 / FOLLOW-006 sender controls, template delivery overrides, preview dates, manual email and inactive copies at desktop and phone widths', {timeout:120000}, async()=>{const {remindersJourney}=await import('./reminders-journey.mjs');await remindersJourney()})


test('SIGN-006 SMS-code verification and SIGN-005 signed downloads work in the compiled client at desktop and phone widths', {timeout:120000},async()=>{
 const {harness}=await import('./harness.mjs'),{browserEdge}=await import('./browser-edge.mjs')
 let browser
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  if(process.env.PLATTER_SCREENSHOTS)await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true})
  await smsInstallerJourney(browser)
  for(const width of [1440,390]){
   let h,edge,context
   const texts=[],mail=[]
   try{
    edge=await browserEdge()
    h=await harness({entry:'dist/server/index.js',origin:edge.origin,assetsDirectory:'dist/client',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9400',TWILIO_ACCOUNT_SID:'synthetic-platter-9401',TWILIO_AUTH_TOKEN:'synthetic-platter-9402',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
     if(new URL(request.url).hostname==='api.twilio.com'){texts.push(Object.fromEntries(new URLSearchParams(await request.text())));return Response.json({sid:'synthetic-platter-'+(9403+texts.length)},{status:201})}
     mail.push(await request.json());return Response.json({id:'synthetic-platter-'+(9404+mail.length)})
    }})
    edge.attach(h)
    const finish=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(finish.status,303)
    await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-01T12:00:00Z'),cron:'*/15 * * * *'})
    const client=await h.cmd('client.save',{name:'Synthetic client',email:'client@synthetic-platter.example'})
    const p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Text verified agreement',scope:'Synthetic studio scope',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
    await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});let sent,row
    const controls=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
    try{
     await controls.addCookies([{name:h.owner.split('=')[0],value:h.owner.slice(h.owner.indexOf('=')+1),url:h.origin}])
     const sender=await controls.newPage();await sender.goto(h.origin+'/app/proposal?id='+p.id)
     await sender.getByLabel('Invitation delivery',{exact:true}).selectOption('sms')
     if(process.env.PLATTER_SCREENSHOTS)await sender.locator('section').filter({has:sender.getByRole('heading',{name:'Review invitation email',exact:true})}).screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`SEND-008-text-only-${width}.png`)})
     await sender.getByRole('button',{name:'Send this invitation',exact:true}).click()
     row=(await h.state()).proposals.find(row=>row.id===p.id);sent={shareUrl:h.origin+'/p/'+row.shareToken}
     assert.equal(row.status,'sent');assert.equal(row.invitationMessages.length,0);assert.equal(mail.length,0,'preparing text-only delivery sends no email')
     const smsPanel=sender.locator('section').filter({has:sender.getByRole('heading',{name:'SMS Settings',exact:true})})
     await smsPanel.getByText('Inspect SMS consent and texts',{exact:true}).click()
     assert.match(await smsPanel.innerText(),/SMS is inactive/)
     assert.equal((await h.state()).proposals.find(r=>r.id===p.id).sms.assents.length,0,'loading Settings cannot authorize SMS')
     const record=async(reenable=false)=>{
      const button=reenable?'Record new assent and re-enable SMS':'Record assent and authorize SMS'
      await smsPanel.getByText(reenable?'Record new assent to re-enable':'Record recipient assent',{exact:true}).click()
      const form=smsPanel.locator('form').filter({has:sender.getByRole('button',{name:button,exact:true})})
      await form.getByLabel('US mobile number',{exact:true}).fill('(202) 555-0129')
      await form.getByLabel('Sending firm',{exact:true}).fill('Synthetic Platter firm')
      for(const label of ['Proposal invitations','Proposal reminders','Identity verification codes','Agreement completion notices'])await form.getByLabel(label,{exact:true}).check()
      await form.getByLabel('Recipient assent time with UTC offset',{exact:true}).fill(reenable?'2030-06-01T12:01:00Z':'2030-06-01T11:55:00Z')
      await form.getByLabel('Assent collection method',{exact:true}).fill('Recipient signed instruction')
      await form.getByLabel('Recipient evidence supporting the entry',{exact:true}).fill('synthetic-platter-9405')
      await form.getByLabel('Recipient IANA time zone',{exact:true}).fill('Etc/UTC')
      await form.locator('input[name=consent]').check()
      if(reenable)await form.locator('input[name=reenableConsent]').check()
      await form.getByRole('button',{name:button,exact:true}).click()
      assert.equal(await sender.getByRole('alert').count(),0)
      await smsPanel.getByText('Inspect SMS consent and texts',{exact:true}).click()
     }
     await record()
     assert.match(await smsPanel.innerText(),/SMS is authorized/)
     await smsPanel.getByText('Synthetic Platter firm · +12025550129 · revision 1 · active',{exact:true}).click()
     assert.ok((await smsPanel.innerText()).includes('synthetic-platter-9405'))
     assert.equal(await sender.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
     assert.equal(await smsPanel.locator('button:not([title])').evaluateAll(nodes=>nodes.every(node=>node.textContent.trim().length>0)),true,'SMS controls have visible labels')
     if(width===1440)assert.equal(await smsPanel.locator('input,textarea,select,button,p,summary,dt,dd,label,legend').evaluateAll(nodes=>nodes.every(n=>parseFloat(getComputedStyle(n).fontSize)>=13)),true,'SMS Settings text is at least 13 pixels')
     if(process.env.PLATTER_SCREENSHOTS)await smsPanel.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`SEND-008-assent-${width}.png`)})
     await smsPanel.getByRole('button',{name:'Revoke SMS authorization',exact:true}).click()
     await smsPanel.getByText('Inspect SMS consent and texts',{exact:true}).click()
     assert.match(await smsPanel.innerText(),/SMS is inactive/)
     assert.equal((await h.state()).proposals.find(r=>r.id===p.id).sms.revocations.length,1)
     if(process.env.PLATTER_SCREENSHOTS)await smsPanel.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`SEND-008-revoked-${width}.png`)})
     await record()
     await smsReenableBrowser(h,sender,smsPanel,record,width)
    }finally{await controls.close()}
    await h.cmd('signer.method',{id:p.id,version:row.version,method:'SMS code'})
    context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
    const page=await context.newPage();assert.equal((await page.goto(sent.shareUrl)).status(),200)
    await page.getByRole('heading',{name:'Verify by text',exact:true}).waitFor()
    assert.equal(await page.locator('input[name="code"]').getAttribute('autocomplete'),'one-time-code')
    if(process.env.PLATTER_SCREENSHOTS)await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`SIGN-006-request-${width}.png`),fullPage:true})
    await page.getByRole('button',{name:'Send verification code',exact:true}).click();assert.equal(texts.length,1)
    await page.getByLabel('Text verification code',{exact:true}).fill(texts[0].Body.match(/\b\d{6}\b/)[0])
    await page.getByRole('button',{name:'Verify text code',exact:true}).click()
    await page.getByRole('heading',{name:'Accept this proposal',exact:true}).waitFor()
    await page.locator('input[name="optionId"][value="one"]').check()
    await page.getByLabel('Your full name',{exact:true}).fill('Avery Chen')
    await page.locator('input[name="consent"]').check()
    await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
    await page.getByRole('heading',{name:'Agreement downloads',exact:true}).waitFor()
    assert.equal(texts.length,2,'the explicitly consented completion follows SMS signing once')
    assert.ok(texts[1].Body.includes(sent.shareUrl))
    assert.ok((await page.locator('main').innerText()).includes('Platter e-signature after text-code verification'))
    const download=page.waitForEvent('download');await page.getByRole('link',{name:'Signed agreement PDF',exact:true}).click();const file=await download;assert.equal(file.suggestedFilename(),'agreement.pdf')
    const certificateDownload=page.waitForEvent('download');await page.getByRole('link',{name:'Certificate of completion',exact:true}).click();assert.equal((await certificateDownload).suggestedFilename(),'certificate.pdf')
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
    // All current client controls have visible text; none needs an icon-only tooltip.
    for(const button of await page.locator('button').all())assert.ok((await button.innerText()).trim(),'client controls have visible labels')
    if(process.env.PLATTER_SCREENSHOTS)await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`SIGN-006-complete-${width}.png`),fullPage:true})
    const ownerContext=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
    try{await ownerContext.addCookies([{name:h.owner.split('=')[0],value:h.owner.slice(h.owner.indexOf('=')+1),url:h.origin}]);const ownerPage=await ownerContext.newPage();await ownerPage.goto(h.origin+'/app/proposal?id='+p.id);await ownerPage.getByText('Inspect SMS consent and texts',{exact:true}).click();assert.match(await ownerPage.locator('main').innerText(),/completion · accepted/);assert.ok((await ownerPage.locator('main').innerText()).includes('Platter e-signature after text-code verification'));assert.equal(await ownerPage.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);if(process.env.PLATTER_SCREENSHOTS)await ownerPage.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`SIGN-006-owner-${width}.png`),fullPage:true})}finally{await ownerContext.close()}
    const completed=await h.cmd('proposal.prepare',{clientId:client.id,title:'Mailbox completion attachments',scope:'Exact retained scope',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'})
    await h.cmd('proposal.approve',{id:completed.id,version:1,revision:1})
    const completionShare=await h.cmd('proposal.send',{id:completed.id,version:2})
    await page.goto(completionShare.shareUrl)
    await page.getByRole('button',{name:'Send verification code',exact:true}).click()
    await page.getByLabel('Email verification code',{exact:true}).fill(mail.at(-1).text.match(/\b\d{6}\b/)[0])
    await page.getByRole('button',{name:'Verify email',exact:true}).click()
    await page.getByRole('heading',{name:'Accept this proposal',exact:true}).waitFor()
    await page.locator('input[name="optionId"][value="one"]').check()
    await page.getByLabel('Your full name',{exact:true}).fill('Synthetic signer')
    await page.locator('input[name="consent"]').check()
    await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
    await page.getByRole('heading',{name:'Agreement downloads',exact:true}).waitFor()
    const completionMail=mail.filter(m=>m.subject==='Agreement complete: Mailbox completion attachments')
    const attachmentDownload=async label=>{const waiting=page.waitForEvent('download');await page.getByRole('link',{name:label,exact:true}).click();return readFile(await (await waiting).path())}
    const agreement=await attachmentDownload('Signed agreement PDF'),certificate=await attachmentDownload('Certificate of completion')
    if(width===1440){assert.equal(completionMail.length,2);assert.deepEqual(completionMail.map(m=>m.to[0]).sort(),[['client','synthetic-platter.example'].join('@'),h.auth.OWNER_EMAIL].sort());for(const m of completionMail){assert.deepEqual(m.attachments.map(a=>a.filename),['agreement.pdf','certificate.pdf']);assert.deepEqual(Buffer.from(m.attachments[0].content,'base64'),agreement);assert.deepEqual(Buffer.from(m.attachments[1].content,'base64'),certificate)}}
    if(process.env.PLATTER_SCREENSHOTS)await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`SIGN-005-completion-${width}.png`),fullPage:true})
    const firmContext=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true})
    try{await firmContext.addCookies([{name:h.owner.split('=')[0],value:h.owner.slice(h.owner.indexOf('=')+1),url:h.origin}]);const firm=await firmContext.newPage();await firm.goto(h.origin+'/app/proposal?id='+completed.id);if(width===1440){const pdf=await firmContext.request.get(h.origin+'/api/platter/agreement.pdf?id='+completed.id);assert.equal(pdf.status(),200);assert.deepEqual(await pdf.body(),agreement);const proof=await firmContext.request.get(h.origin+'/api/platter/certificate.pdf?id='+completed.id);assert.equal(proof.status(),200);assert.deepEqual(await proof.body(),certificate)};if(process.env.PLATTER_SCREENSHOTS)await firm.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,`SIGN-005-firm-${width}.png`),fullPage:true})}finally{await firmContext.close()}
   }finally{await context?.close();await h?.close();await edge?.close()}
  }
 }finally{await browser?.close()}
})

test('SEND-007 desktop and phone replace the unsigned signer, refuse the old link, verify the COO and retain completion history', {timeout:180000},async()=>{const {replacementBrowser}=await import('./signer-replacement-journey.mjs');await replacementBrowser()})

test('TRACK-001 / TRACK-004 owner consent, private alerts, client disclosure and erasure at desktop and phone widths',{timeout:180000},async()=>{const {trackingBrowser}=await import('./tracking-browser.mjs');await trackingBrowser()})

await import('./tracking-details-browser.mjs')

test('AUTO-004 compiled public API reference exposes scoped operations and signed event examples', {timeout:120000},async()=>{
 let app,browser
 try{
  app=await installedApp({scheduled:true})
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage()
  try{
   assert.equal((await page.goto(app.origin+'/api/platter/v1/reference')).status(),200)
   const spec=await (await context.request.get(app.origin+'/api/platter/v1/openapi.json')).json()
   assert.equal(await page.locator('[data-route]').count(),Object.values(spec.paths).reduce((n,methods)=>n+Object.keys(methods).length,0))
   for(const event of Object.keys(spec['x-webhook-events']))assert.equal(await page.getByRole('heading',{name:event,exact:true}).count(),1)
   for(const route of ['POST /api/platter/v1/proposals','POST /api/platter/v1/proposals/{id}/variables'])assert.match(await page.locator('[data-route="'+route+'"]').innerText(),/Scope: proposals\.write/,'reference preserves drafting authority for '+route)
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.evaluate(async()=>{await document.fonts.ready})
    if(process.env.PLATTER_SCREENSHOTS){await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'AUTO-004-reference-'+width+'.png'),fullPage:true})}
   }
  }finally{await context.close()}
 }finally{await browser?.close();await app?.close()}
})


test('SIGN-004 and SEND-003 owner recipient controls, own-field previews, ordered signing and viewer revocation', {timeout:180000},async()=>{const {recipientsBrowser}=await import('./recipients-browser.mjs');await recipientsBrowser(1440)})

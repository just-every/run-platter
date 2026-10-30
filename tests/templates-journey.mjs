import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'

export async function templatesJourney() {
 const screenshots = process.env.PLATTER_SCREENSHOTS
 if (screenshots) await mkdir(screenshots, { recursive: true })
 const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}), args: ['--use-mock-keychain', '--password-store=basic', '--no-sandbox'] })
 try {
  for (const width of [1440, 390]) {
   const app = await installedApp(), context = await browser.newContext({ viewport: { width, height: 900 } })
   let clientContext
   try {
    const page = await context.newPage()
    const capture = async name => {
     await page.waitForLoadState('load'); await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) })
     assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
     if (screenshots) {
      await page.screenshot({ path: join(screenshots, `MOB-001-templates-${name}-${width}.png`), fullPage: true })
      const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: name === 'list' ? 'Personal templates' : 'Save a personal template', exact: true }) })
      if (await panel.count()) await panel.screenshot({ path: join(screenshots, `MOB-001-templates-${name}-panel-${width}.png`) })
     }
    }
    const state = async () => (await (await context.request.get(app.origin + '/api/platter/state')).json())
    const cmd = async (name, input) => { const r = await context.request.post(app.origin + '/api/platter/command', { headers: { origin: app.origin }, data: { name, input } }); assert.equal(r.status(), 200, await r.text()); return r.json() }
    assert.equal((await context.request.post(app.origin + '/auth/bootstrap', { headers: { origin: app.origin }, data: { token: app.token, displayName: 'Jordan Northstar' }, maxRedirects: 0 })).status(), 303)
    await page.goto(app.origin + '/setup'); await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Finish setup' }).click()
    const firstClient = await cmd('client.save', { name: 'Northstar Coffee', email: 'avery@northstar.example' })
    const secondClient = await cmd('client.save', { name: 'Juniper Studio', email: 'morgan@juniper.example' })
    // EDIT-002: use each real starter form on a fresh installation at both widths.
    await page.goto(app.origin + '/app')
    const starters = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Starter templates', exact: true }) })
    await starters.getByLabel('Starter template', { exact: true }).waitFor({ state: 'visible' })
    const starterOptions = await starters.getByLabel('Starter template', { exact: true }).locator('option').allTextContents()
    assert.deepEqual(starterOptions, ['Agency', 'Consultancy', 'IT managed services', 'Creative studio', 'Professional services'])
    await starters.getByLabel('Client for starter proposal', { exact: true }).selectOption(secondClient.id)
    if (screenshots) await starters.screenshot({ path: join(screenshots, `EDIT-002-starters-list-${width}.png`) })
    for (const [i, name] of starterOptions.entries()) {
     await starters.getByLabel('Starter template', { exact: true }).selectOption({ label: name })
     await starters.getByLabel('Client for starter proposal', { exact: true }).selectOption(secondClient.id)
     await starters.getByRole('button', { name: 'Start starter proposal', exact: true }).click()
     const id = new URL(page.url()).searchParams.get('id'), p = (await state()).proposals.find(p => p.id === id)
     assert.equal(await page.getByLabel('Proposal title', { exact: true }).inputValue(), name + ' proposal')
     assert.match(await page.locator('textarea[name=scope]').inputValue(), /Juniper Studio/)
     assert.match(await page.locator('textarea[name=terms]').inputValue(), /owner@northstar\.example/)
     assert.ok(p.options.every(option => option.tables[0].lines.length === 2))
     assert.equal(p.status, 'draft'); assert.equal(p.approved_by, null)
     assert.equal(await page.getByRole('button', { name: 'Send approved proposal', exact: true }).count(), 0)
     await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) })
     assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
     if (screenshots) await page.screenshot({ path: join(screenshots, `EDIT-002-starter-${i}-draft-${width}.png`), fullPage: true })
     await page.getByRole('link', { name: 'Preview client page', exact: true }).click()
     if (width === 390) { await page.getByLabel('Preview width').selectOption('390'); await page.getByRole('button', { name: 'Change preview width', exact: true }).click() }
     const preview = page.frameLocator('iframe')
     assert.match(await preview.locator('main').innerText(), /Juniper Studio/)
     assert.match(await preview.locator('main').innerText(), /USD/)
     assert.equal(await preview.getByRole('button', { name: 'Accept proposal', exact: true }).isDisabled(), true)
     const refused = await context.request.post(app.origin + '/app/preview/client/action?name=accept', { headers: { origin: app.origin }, data: { id, name: 'Preview visitor', optionId: 'one', consent: true } })
     assert.equal(refused.status(), 403)
     assert.equal((await state()).proposals.find(p => p.id === id).acceptance, undefined)
     if (screenshots) await page.screenshot({ path: join(screenshots, `EDIT-002-starter-${i}-preview-${width}.png`), fullPage: true })
     await page.goto(app.origin + '/app')
    }
    const source = await cmd('proposal.prepare', { clientId: firstClient.id, title: 'Campaign photography', scope: 'Studio photography and a usage licence.', terms: 'Delivery within two weeks.', optionOne: 'Essential campaign', priceOne: '2400', optionTwo: 'Complete campaign', priceTwo: '4200', depositPercent: 30 })
    await page.goto(app.origin + '/app/proposal?id=' + source.id)
    await page.getByRole('button', { name: 'Turn off client PDF downloads', exact: true }).click()
    await page.getByRole('combobox', { name: 'Expiry type', exact: true }).selectOption('days'); await page.getByLabel('Expiry period in calendar days', { exact: true }).fill('14'); await page.getByRole('button', { name: 'Save expiry', exact: true }).click()
    const templatePanel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Save a personal template', exact: true }) })
    await templatePanel.getByLabel('Template name', { exact: true }).fill('Agency campaign')
    await templatePanel.getByRole('button', { name: 'Save personal template', exact: true }).click()
    assert.equal((await state()).templates[0].name, 'Agency campaign'); await capture('saved-source')
    await page.getByRole('link', { name: 'All proposals', exact: true }).click()
    let start = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Personal templates', exact: true }) })
    await start.locator('select[name=clientId]').selectOption(secondClient.id)
    await start.getByLabel('New proposal title (optional)', { exact: true }).fill('Juniper campaign')
    await capture('list')
    await start.getByRole('button', { name: 'Start from Agency campaign', exact: true }).click()
    const firstId = new URL(page.url()).searchParams.get('id')
    assert.notEqual(firstId, source.id); assert.equal(await page.locator('textarea[name=scope]').inputValue(), 'Studio photography and a usage licence.')
    assert.equal(await page.getByLabel('Proposal title', { exact: true }).inputValue(), 'Juniper campaign')
    assert.equal(await page.locator('form.composer select[name=clientId]').inputValue(), secondClient.id)
    assert.match(await page.locator('main').innerText(), /Unsigned PDF downloads are off/); assert.match(await page.locator('main').innerText(), /14 calendar days/)
    assert.equal(await page.getByRole('button', { name: 'Send approved proposal', exact: true }).count(), 0)
    await capture('draft')
    await page.getByRole('link', { name: 'Preview client page', exact: true }).click()
    if (width === 390) { await page.getByLabel('Preview width').selectOption('390'); await page.getByRole('button', { name: 'Change preview width', exact: true }).click() }
    const frame = page.frameLocator('iframe'); assert.match(await frame.locator('main').innerText(), /Studio photography and a usage licence/)
    await capture('preview')
    await page.goto(app.origin + '/app/proposal?id=' + source.id)
    await page.locator('textarea[name=scope]').fill('Expanded campaign with interviews.'); await page.getByRole('button', { name: 'Save revision', exact: true }).click()
    await page.getByText('Replace an existing personal template', { exact: true }).click()
    await page.getByRole('button', { name: 'Replace Agency campaign with this revision', exact: true }).click(); await capture('updated-source')
    await page.getByRole('link', { name: 'All proposals', exact: true }).click()
    start = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Personal templates', exact: true }) })
    await start.locator('select[name=clientId]').selectOption(secondClient.id)
    await start.getByRole('button', { name: 'Start from Agency campaign', exact: true }).click()
    const thirdId = new URL(page.url()).searchParams.get('id')
    assert.equal(await page.locator('textarea[name=scope]').inputValue(), 'Expanded campaign with interviews.')
    assert.equal((await state()).proposals.find(p => p.id === firstId).scope, 'Studio photography and a usage licence.')
    await capture('updated-draft')
    await page.getByRole('button', { name: 'Approve this revision', exact: true }).click(); await page.getByRole('button', { name: 'Send approved proposal', exact: true }).click()
    const path = await page.getByRole('link', { name: 'Open client proposal', exact: true }).getAttribute('href'); await capture('sent')
    clientContext = await browser.newContext({ viewport: { width, height: 900 } }); const clientPage = await clientContext.newPage()
    await clientPage.goto(app.origin + path); await clientPage.getByRole('button', { name: 'Send verification code', exact: true }).click()
    const code = (await state()).outbox.find(m => m.proposal_id === thirdId && m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await clientPage.getByLabel('Email verification code').fill(code); await clientPage.getByRole('button', { name: 'Verify email', exact: true }).click()
    assert.match(await clientPage.locator('main').innerText(), /Expanded campaign with interviews/)
    const pdf = await clientContext.request.get(app.origin + path + '/download.pdf?optionId=one'); assert.equal(pdf.status(), 403)
    await clientPage.getByRole('radio', { name: /Essential campaign/ }).check(); await clientPage.getByLabel('Your full name').fill('Morgan Lee'); await clientPage.getByRole('checkbox').check(); await clientPage.getByRole('button', { name: 'Accept proposal', exact: true }).click()
    assert.equal(await clientPage.getByRole('heading', { name: 'Proposal accepted', exact: true }).count(), 1)
    const accepted = (await state()).proposals.find(p => p.id === thirdId)
    assert.equal(accepted.acceptance.totalCents, 240000); assert.equal(accepted.acceptance.depositCents, 72000)
    await page.goto(app.origin + '/app/proposal?id=' + thirdId); await capture('accepted')
   } finally { await clientContext?.close(); await context.close(); await app.close() }
  }
  await templateRecipientJourney(browser,screenshots)
 } finally { await browser.close() }
}

async function templateRecipientJourney(browser,screenshots) {
 const {templateRoleData}=await import('./templates-http.mjs')
 for(const width of [1440,390]){
  const app=await installedApp(),context=await browser.newContext({viewport:{width,height:900}})
  try{
   const page=await context.newPage(),state=async()=>(await(await context.request.get(app.origin+'/api/platter/state')).json())
   const cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
   await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic Platter owner'},maxRedirects:0})
   await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
   const data=templateRoleData((await state()).actor.email),client=await cmd('client.save',{name:'Synthetic Platter template client',email:data.recipients[0].email})
   const source=await cmd('proposal.prepare',{clientId:client.id,title:'Synthetic Platter role custody',scope:'Reviewed services',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:30,recipientPlan:data.recipients,document:data.document})
   await page.goto(app.origin+'/app/proposal?id='+source.id)
   const save=page.locator('section').filter({has:page.getByRole('heading',{name:'Save a personal template',exact:true})}).locator('form').filter({has:page.getByRole('button',{name:'Save personal template',exact:true})})
   const extra={...data.document,blocks:[...data.document.blocks,{id:'extra',type:'signature',title:'Unassigned extra signature',text:'',recipientRole:'slot',recipientId:'missing'}]}
   await cmd('proposal.document',{id:source.id,version:1,document:extra})
   await page.reload()
   await save.getByLabel('Template name',{exact:true}).fill('Three role template')
   await save.getByLabel('Explicit owner preassignment',{exact:true}).selectOption('owner')
   await save.getByRole('button',{name:'Save personal template',exact:true}).click()
   if(width===1440){assert.match(await page.locator('main').innerText(),/Assign Unassigned extra signature/);assert.equal((await state()).templates.length,0)}
   await cmd('proposal.document',{id:source.id,version:2,document:data.document})
   await page.reload()
   await save.getByLabel('Template name',{exact:true}).fill('Three role template')
   await save.getByLabel('Explicit owner preassignment',{exact:true}).selectOption('owner')
   await save.getByRole('button',{name:'Save personal template',exact:true}).click()
   await page.goto(app.origin+'/app');await page.getByRole('button',{name:'Start from Three role template',exact:true}).click()
   const firstId=new URL(page.url()).searchParams.get('id'),first=(await state()).proposals.find(p=>p.id===firstId)
   const capture=async name=>{await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});if(screenshots)await page.screenshot({path:join(screenshots,`SIGN-011-${name}-${width}.png`),fullPage:true})}
   if(width===1440){
    assert.deepEqual(JSON.parse(first.recipient_plan).map(r=>[r.name,r.group,r.email]),data.recipients.map(r=>[r.name,r.group,r.id==='owner'?r.email:null]))
    assert.deepEqual(first.document,data.document);assert.deepEqual(first.recipientLinks,[]);assert.equal(first.approved_by,null)
    const recipients=page.locator('section').filter({has:page.getByRole('heading',{name:'Recipients and signing',exact:true})})
    assert.match(await recipients.innerText(),/Client signer.*Group 1/s);assert.match(await recipients.innerText(),/Client CFO approver.*Group 2/s)
    assert.equal(await recipients.getByText('Mailbox not assigned',{exact:true}).count(),2)
   }
   await capture('captured-draft')
   await page.goto(app.origin+'/app/settings')
   const settings=page.locator('section').filter({has:page.getByRole('heading',{name:'Template recipient definitions',exact:true})})
   await settings.getByText('Three role template recipient definitions',{exact:true}).click()
   await settings.locator('[name="roleGroup:client"]').fill('2');await settings.locator('[name="roleGroup:cfo"]').fill('1')
   await capture('definitions')
   await settings.getByRole('button',{name:'Save Three role template recipient definitions',exact:true}).click()
   await page.goto(app.origin+'/app');await page.getByRole('button',{name:'Start from Three role template',exact:true}).click()
   const secondId=new URL(page.url()).searchParams.get('id')
   if(width===1440){const s=await state();assert.deepEqual(s.proposals.find(p=>p.id===firstId),first);assert.deepEqual(JSON.parse(s.proposals.find(p=>p.id===secondId).recipient_plan).map(r=>[r.id,r.group]),[['client',2],['cfo',1],['owner',3]])}
   await capture('next-draft')
  }finally{await context.close();await app.close()}
 }
}

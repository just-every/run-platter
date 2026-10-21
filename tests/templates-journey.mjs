import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'

export async function templatesJourney() {
 const screenshots = process.env.PLATTER_SCREENSHOTS
 if (screenshots) await mkdir(screenshots, { recursive: true })
 const browser = await chromium.launch({ headless: true, args: ['--use-mock-keychain', '--password-store=basic'] })
 try {
  for (const width of [1440, 390]) {
   const app = await installedApp(), context = await browser.newContext({ viewport: { width, height: 900 } })
   let clientContext
   try {
    const page = await context.newPage()
    const capture = async name => {
     await page.waitForLoadState('load'); await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) })
     assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
     if (screenshots) await page.screenshot({ path: join(screenshots, `MOB-001-templates-${name}-${width}.png`), fullPage: true })
    }
    const state = async () => (await (await context.request.get(app.origin + '/api/platter/state')).json())
    const cmd = async (name, input) => { const r = await context.request.post(app.origin + '/api/platter/command', { headers: { origin: app.origin }, data: { name, input } }); assert.equal(r.status(), 200, await r.text()); return r.json() }
    assert.equal((await context.request.post(app.origin + '/auth/bootstrap', { headers: { origin: app.origin }, data: { token: app.token, displayName: 'Jordan Northstar' }, maxRedirects: 0 })).status(), 303)
    await page.goto(app.origin + '/setup'); await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Finish setup' }).click()
    const firstClient = await cmd('client.save', { name: 'Northstar Coffee', email: 'avery@northstar.example' })
    const secondClient = await cmd('client.save', { name: 'Juniper Studio', email: 'morgan@juniper.example' })
    const source = await cmd('proposal.prepare', { clientId: firstClient.id, title: 'Campaign photography', scope: 'Studio photography and a usage licence.', terms: 'Delivery within two weeks.', optionOne: 'Essential campaign', priceOne: '2400', optionTwo: 'Complete campaign', priceTwo: '4200', depositPercent: 30 })
    await page.goto(app.origin + '/app/proposal?id=' + source.id)
    await page.getByRole('button', { name: 'Turn off client PDF downloads', exact: true }).click()
    await page.getByLabel('Expiry type', { exact: true }).selectOption('days'); await page.getByLabel('Expiry period in calendar days', { exact: true }).fill('14'); await page.getByRole('button', { name: 'Save expiry', exact: true }).click()
    const templatePanel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Save a personal template', exact: true }) })
    await templatePanel.getByLabel('Template name', { exact: true }).fill('Agency campaign')
    await templatePanel.getByRole('button', { name: 'Save personal template', exact: true }).click()
    assert.equal((await state()).templates[0].name, 'Agency campaign'); await capture('saved-source')
    await page.getByRole('link', { name: 'All proposals', exact: true }).click()
    let start = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Personal templates', exact: true }) })
    await start.getByLabel('Client for Agency campaign', { exact: true }).selectOption(secondClient.id)
    await start.getByLabel('New proposal title (optional)', { exact: true }).fill('Juniper campaign')
    await capture('list')
    await start.getByRole('button', { name: 'Start from Agency campaign', exact: true }).click()
    const firstId = new URL(page.url()).searchParams.get('id')
    assert.notEqual(firstId, source.id); assert.equal(await page.getByLabel('Scope of work', { exact: true }).inputValue(), 'Studio photography and a usage licence.')
    assert.equal(await page.getByLabel('Proposal title', { exact: true }).inputValue(), 'Juniper campaign')
    assert.equal(await page.getByLabel('Client', { exact: true }).inputValue(), secondClient.id)
    assert.match(await page.locator('main').innerText(), /Unsigned PDF downloads are off/); assert.match(await page.locator('main').innerText(), /14 calendar days/)
    assert.equal(await page.getByRole('button', { name: 'Send approved proposal', exact: true }).count(), 0)
    await capture('draft')
    await page.getByRole('link', { name: 'Preview client page', exact: true }).click()
    const frame = page.frameLocator('iframe'); assert.match(await frame.locator('main').innerText(), /Studio photography and a usage licence/)
    await capture('preview')
    await page.goto(app.origin + '/app/proposal?id=' + source.id)
    await page.getByLabel('Scope of work', { exact: true }).fill('Expanded campaign with interviews.'); await page.getByRole('button', { name: 'Save revision', exact: true }).click()
    await page.getByText('Replace an existing personal template', { exact: true }).click()
    await page.getByRole('button', { name: 'Replace Agency campaign with this revision', exact: true }).click(); await capture('updated-source')
    await page.getByRole('link', { name: 'All proposals', exact: true }).click()
    start = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Personal templates', exact: true }) })
    await start.getByLabel('Client for Agency campaign', { exact: true }).selectOption(secondClient.id)
    await start.getByRole('button', { name: 'Start from Agency campaign', exact: true }).click()
    const thirdId = new URL(page.url()).searchParams.get('id')
    assert.equal(await page.getByLabel('Scope of work', { exact: true }).inputValue(), 'Expanded campaign with interviews.')
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
 } finally { await browser.close() }
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
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
    await page.locator('select[name="clientId"]').selectOption({ label: 'Northstar Coffee — avery@northstar.example' })
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

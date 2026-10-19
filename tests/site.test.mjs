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

import { providerSyncFixture } from './crm-provider-sync-fixture.mjs'
import { providerSyncControls } from './crm-provider-sync-browser.mjs'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { harness } from './harness.mjs'
import { browserEdge } from './browser-edge.mjs'
import { zohoToken } from './crm-zoho-http.mjs'

export async function zohoBrowser() {
 const edge = await browserEdge(), provider = providerSyncFixture('zoho')
 let h, browser
 try {
  h = await harness({ entry: './dist/server/index.js', assetsDirectory: './dist/client', origin: edge.origin, outboundService: provider.request }); edge.attach(h)
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}), args: ['--no-sandbox', '--use-mock-keychain', '--password-store=basic'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
  try {
   const [name, value] = h.owner.split('='); await context.addCookies([{ name, value, url: h.origin }])
   const page = await context.newPage(), shots = process.env.PLATTER_SCREENSHOTS
   const capture = async (locator, label) => {
    if (!shots) return
    await mkdir(shots, { recursive: true })
    for (const width of [1440, 390]) {
     await page.setViewportSize({ width, height: 900 }); await locator.scrollIntoViewIfNeeded()
     await locator.screenshot({ path: join(shots, 'CRM-004-Zoho-' + label + '-' + width + '.png') })
    }
    await page.setViewportSize({ width: 1440, height: 900 })
   }
   await page.goto(h.origin + '/setup'); await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Finish setup' }).click()
   await page.goto(h.origin + '/app/settings')
   const connection = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Zoho CRM (US)', exact: true }) })
   await connection.getByLabel('Zoho CRM (US) access token').fill(zohoToken); await connection.getByLabel('Zoho organization id').fill('12401')
   assert.equal(provider.calls.length, 0, 'opening Settings grants no provider access')
   await connection.getByRole('checkbox').check(); await connection.getByRole('button', { name: 'Connect Zoho CRM (US)', exact: true }).click()
   assert.equal(await page.getByRole('alert').count(), 0)
   assert.equal((await h.state()).connections.find(r => r.provider === 'zoho').accountId, '12401')
   await capture(connection, 'connection')
   await page.goto(h.origin + '/app')
   const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Start from Zoho CRM', exact: true }) })
   await panel.getByLabel('Zoho CRM deal ID').fill('12402'); await panel.getByLabel('Zoho quote ID linked to this deal').fill('12405'); await panel.getByLabel('Draft scope (optional)').fill('A separately reviewed Zoho scope.')
   await panel.getByRole('button', { name: 'Read Zoho CRM deal', exact: true }).click()
   assert.equal(await panel.getByLabel('Company from deal').inputValue(), ''); assert.equal(await panel.getByLabel('Contact from deal').inputValue(), '')
   assert.equal((await h.state()).proposals.length, 0)
   await panel.getByLabel('Company from deal').selectOption('12403'); await panel.getByLabel('Contact from deal').selectOption('12404')
   await panel.getByRole('button', { name: 'Review selected deal', exact: true }).click()
   const review = panel.getByRole('article', { name: 'Reviewed Zoho CRM draft' })
   assert.match(await review.innerText(), /Synthetic Zoho account/); assert.match(await review.innerText(), /Taylor Reed/)
   assert.match(await review.innerText(), /12401/); assert.match(await review.innerText(), /Source item: 12406 · Product: 12408/); assert.match(await review.innerText(), /Reviewed strategy work/)
   assert.match(await review.innerText(), /2\.5 × \$120\.50 USD/); assert.match(await review.innerText(), /3 × \$19\.99 USD/); assert.match(await review.innerText(), /\$361\.22 USD/)
   assert.equal((await h.state()).proposals.length, 0)
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
   assert.deepEqual(await panel.evaluate(root => [...root.querySelectorAll('p,label,button,a,dt,dd')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 13).map(e => e.tagName)), [])
   await capture(panel, 'review')
   await review.getByRole('checkbox').check(); await review.getByRole('button', { name: 'Create reviewed draft', exact: true }).click()
   await page.waitForURL(/\/app\/proposal\?id=/)
   const current = (await h.state()).proposals[0]
   assert.equal(current.scope, 'A separately reviewed Zoho scope.'); assert.equal(current.options[0].cents, 36122); assert.equal(current.collection.enabled, false)
   assert.equal(current.status, 'draft'); assert.equal(current.approved_by, null)
   assert.equal(await page.getByRole('button', { name: 'Approve this revision', exact: true }).count(), 1); assert.equal(await page.getByRole('button', { name: 'Send approved proposal', exact: true }).count(), 0)
   const source = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Copied Zoho CRM source', exact: true }) })
   assert.match(await source.innerText(), /12406/); assert.match(await source.innerText(), /no synchronization or sending authority/)
   await capture(source, 'copied-source')
   const calls = provider.calls.length; provider.state.quote.Product_Details[0].list_price = 999; await page.reload()
   assert.equal(provider.calls.length, calls); assert.equal((await h.state()).proposals[0].options[0].cents, 36122)
   provider.state.quote.Product_Details[0].list_price = 120.5
   await providerSyncControls(page, h, provider, 'zoho', capture)
   await page.goto(h.origin + '/app/settings'); await connection.getByRole('button', { name: 'Disconnect Zoho CRM (US)', exact: true }).click()
   assert.equal((await h.state()).connections.find(r => r.provider === 'zoho').status, 'disconnected')
  } finally { await context.close() }
 } finally { await browser?.close(); await h?.close(); await edge.close() }
}

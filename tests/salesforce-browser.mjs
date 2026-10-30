import assert from 'node:assert/strict'
import { salesforceMapping } from './salesforce-sync-fixture.mjs'

export async function salesforceBrowser({ h, page, provider, current, capture }) {
 provider.state.lines[0].UnitPrice = 120.5
 await h.cmd('proposal.approve', { id: current.id, version: 1, revision: 1 })
 await h.cmd('proposal.send', { id: current.id, version: 2 })
 await page.goto(h.origin + '/app/settings')
 const settings = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Salesforce proposal synchronization', exact: true }) })
 assert.equal(provider.writes.length, 0)
 await settings.getByLabel('Proposal to synchronize').selectOption(current.id + ':3')
 for (const [name, value] of Object.entries(salesforceMapping)) await settings.locator('[name="' + name + '"]').fill(value)
 await settings.getByRole('button', { name: 'Review CRM writes', exact: true }).click()
 const review = settings.getByRole('article', { name: 'Reviewed Salesforce writes' })
 assert.match(await review.innerText(), /361\.22/); assert.match(await review.innerText(), /2\.5/); assert.match(await review.innerText(), /120\.5/); assert.match(await review.innerText(), /19\.99/)
 assert.match(await review.innerText(), /synthetic-platter-4705/); assert.match(await review.innerText(), /Platter proposal sent/)
 assert.equal(provider.writes.length, 0, 'review displays outbound values without performing writes')
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
 const undersized = await settings.evaluate(el => [...el.querySelectorAll('p,label,button,a,dt,dd')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 13).map(e => e.tagName))
 assert.deepEqual(undersized, [])
 assert.equal(await settings.locator('button').evaluateAll(buttons => buttons.filter(b => !b.textContent.trim()).length), 0, 'all synchronization controls have visible text')
 await capture(settings, 'write-review')
 await review.getByRole('checkbox').check(); await review.getByRole('button', { name: 'Apply reviewed CRM writes' }).click()
 assert.equal(await page.getByRole('alert').count(), 0)
 assert.equal(provider.writes.length, 4); assert.equal(provider.state.opportunity.Amount, 361.22); assert.equal(provider.activities.length, 1)
 assert.equal(provider.state.opportunity.Synthetic_Proposal__c, h.origin + '/app/proposal?id=' + current.id)
 assert.ok((await h.state()).crmSyncHistory.every(r => r.provider === 'salesforce' && r.status === 'confirmed'))
 assert.match(await settings.innerText(), /Confirmed: 4/); assert.match(await settings.innerText(), /synthetic-platter-activity-1/)
 await capture(settings, 'write-receipts')
 const before = provider.writes.length
 await page.reload(); assert.equal(provider.writes.length, before, 'opening Settings cannot replay a captured write')
}

import assert from 'node:assert/strict'
import { syncMapping } from './hubspot-sync-fixture.mjs'
import { signedCard } from './hubspot-sync-journey.mjs'

export async function hubspotBrowser({ h, page, provider, current, capture }) {
 provider.state.line_items[0].properties.price = '120.50'
 await h.cmd('proposal.approve', { id: current.id, version: 1, revision: 1 })
 await h.cmd('proposal.send', { id: current.id, version: 2 })
 await page.goto(h.origin + '/app/settings')
 const settings = page.locator('section').filter({ has: page.getByRole('heading', { name: 'HubSpot proposal synchronization', exact: true }) })
 await settings.getByLabel('Proposal to synchronize').selectOption(current.id + ':3')
 for (const [name, value] of Object.entries(syncMapping)) await settings.locator('[name="' + name + '"]').fill(value)
 await settings.getByRole('button', { name: 'Review CRM writes', exact: true }).click()
 const review = settings.getByRole('article', { name: 'Reviewed HubSpot writes' })
 assert.match(await review.innerText(), /361\.22/); assert.match(await review.innerText(), /2\.5/); assert.match(await review.innerText(), /120\.50/); assert.match(await review.innerText(), /19\.99/)
 assert.equal(provider.writes.length, 0, 'reviewing the Settings form sends no CRM writes')
 await capture(settings, 'write-review')
 await review.getByRole('checkbox').check(); await review.getByRole('button', { name: 'Apply reviewed CRM writes' }).click()
 assert.equal(await page.getByRole('alert').count(), 0)
 assert.equal(provider.writes.length, 4); assert.equal(provider.state.deal.properties.amount, '361.22'); assert.equal(provider.notes.length, 1)
 assert.equal(provider.state.deal.properties.synthetic_link, h.origin + '/app/proposal?id=' + current.id)
 assert.ok((await h.state()).crmSyncHistory.every(r => r.status === 'confirmed'))
 await capture(settings, 'write-receipts')
 const cardSettings = page.locator('section').filter({ has: page.getByRole('heading', { name: 'HubSpot app card', exact: true }) })
 await cardSettings.getByLabel('HubSpot installed app ID').fill('synthetic-platter-app'); await cardSettings.getByLabel('HubSpot app client secret').fill('synthetic-platter-4700')
 await cardSettings.getByRole('checkbox').check(); await cardSettings.getByRole('button', { name: 'Authorize HubSpot app card' }).click()
 assert.equal(await page.getByRole('alert').count(), 0)
 await capture(cardSettings, 'card-settings')
 provider.state.deal.id = 'synthetic-platter-4720'
 const cardResponse = await signedCard(h, { dealId: provider.state.deal.id }); assert.equal(cardResponse.status, 200); assert.equal(cardResponse.value.proposals.length, 0)
 await page.setViewportSize({ width: 390, height: 900 }); await page.goto(cardResponse.value.startUrl)
 const start = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Start from HubSpot', exact: true }) })
 assert.equal(await start.getByLabel('HubSpot deal ID', { exact: true }).inputValue(), provider.state.deal.id)
 await start.getByRole('button', { name: 'Read HubSpot deal', exact: true }).click()
 await start.getByLabel('Company from deal').selectOption(provider.selected.companyId); await start.getByLabel('Contact from deal').selectOption(provider.selected.contactId)
 await start.getByRole('button', { name: 'Review selected deal', exact: true }).click()
 const draftReview = start.getByRole('article', { name: 'Reviewed HubSpot draft' })
 assert.match(await draftReview.innerText(), /Synthetic reviewed company/); assert.match(await draftReview.innerText(), /Taylor Reed/)
 await capture(start, 'card-draft-review')
 await page.setViewportSize({ width: 390, height: 900 }); await draftReview.getByRole('checkbox').check(); await draftReview.getByRole('button', { name: 'Create reviewed draft', exact: true }).click(); await page.waitForURL(/\/app\/proposal\?id=/)
 const linked = (await signedCard(h, { dealId: provider.state.deal.id })).value
 assert.equal(linked.proposals.length, 1); assert.equal(linked.proposals[0].status, 'draft'); assert.notEqual(linked.proposals[0].id, current.id)
 const proposal = (await h.state()).proposals.find(p => p.id === linked.proposals[0].id)
 assert.equal(proposal.options[0].cents, 36122); assert.equal(proposal.clientName, 'Synthetic reviewed company'); assert.equal(proposal.collection.enabled, false)
 await page.goto(linked.startUrl)
 assert.match(await page.getByRole('heading', { name: 'HubSpot deal proposals' }).locator('..').innerText(), /Synthetic launch engagement/)
 await capture(page.locator('main'), 'card-linked-draft')
 for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 900 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'card screen fits the viewport')
  const undersized = await page.locator('main').evaluate(main => [...main.querySelectorAll('p,label,button,a,dt,dd')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 13).map(e => e.tagName))
  assert.deepEqual(undersized, [], 'card controls and text are at least 13 pixels')
 }
}

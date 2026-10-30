import assert from 'node:assert/strict'

export async function providerCardControls(page, h, edge, provider, capture) {
 const label = provider === 'pipedrive' ? 'Pipedrive' : 'Zoho CRM', nextDeal = provider === 'pipedrive' ? '12902' : '12903'
 edge.state.deal.id = provider === 'pipedrive' ? Number(nextDeal) : nextDeal
 if (provider === 'zoho') edge.state.quote.Deal_Name.id = nextDeal
 await page.goto(h.origin + '/app/settings')
 const settings = page.locator('section').filter({ has: page.getByRole('heading', { name: label + ' deal card', exact: true }) })
 await settings.getByLabel(label + ' card deal ID', { exact: true }).fill(nextDeal)
 if (provider === 'zoho') await settings.getByLabel('Zoho card quote ID (optional)').fill('12405')
 await capture(settings, provider + '-card-launch')
 const beforeCalls = edge.calls.length, beforeWrites = edge.writes.length
 await settings.getByRole('button', { name: 'Open ' + label + ' deal card', exact: true }).click()
 await page.waitForURL(/\/app\/crm-card\?/)
 assert.equal(new URL(page.url()).searchParams.get('provider'), provider)
 assert.equal(edge.calls.length, beforeCalls); assert.equal(edge.writes.length, beforeWrites)
 const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Start from ' + label, exact: true }) })
 assert.equal(await panel.getByLabel(label + ' deal ID', { exact: true }).inputValue(), nextDeal)
 if (provider === 'zoho') assert.equal(await panel.getByLabel('Zoho quote ID linked to this deal').inputValue(), '12405')
 await panel.getByRole('button', { name: 'Read ' + label + ' deal', exact: true }).click()
 await panel.getByLabel(provider === 'pipedrive' ? 'Organization from deal' : 'Company from deal').selectOption(edge.selected.companyId)
 await panel.getByLabel(provider === 'pipedrive' ? 'Person from deal' : 'Contact from deal').selectOption(edge.selected.contactId)
 await panel.getByRole('button', { name: 'Review selected deal', exact: true }).click()
 const review = panel.getByRole('article', { name: 'Reviewed ' + label + ' draft' })
 assert.match(await review.innerText(), /Taylor Reed/); assert.match(await review.innerText(), /2\.5 × \$120\.50 USD/); assert.match(await review.innerText(), /3 × \$19\.99 USD/)
 assert.match(await review.innerText(), /\$361\.22 USD/)
 await capture(panel, provider + '-card-review')
 await review.getByRole('checkbox').check(); await review.getByRole('button', { name: 'Create reviewed draft', exact: true }).click()
 await page.waitForURL(/\/app\/proposal\?id=/)
 const id = new URL(page.url()).searchParams.get('id'), current = (await h.state()).proposals.find(p => p.id === id)
 assert.equal(current.status, 'draft'); assert.equal(current.approved_by, null); assert.equal(current.collection.enabled, false)
 assert.equal(current.options[0].cents, 36122)
 const source = (await h.send('/api/platter/crm/source?id=' + id, undefined, h.owner)).value
 assert.equal(source.provider, provider); assert.equal(source.deal_id, nextDeal)
 const query = new URLSearchParams({ provider, dealId: nextDeal, accountId: provider === 'pipedrive' ? '12101' : '12401' })
 const card = (await h.send('/api/platter/crm/card-preview?' + query, undefined, h.owner)).value
 assert.deepEqual(card.proposals.map(p => [p.id, p.status]), [[id, 'draft']])
 await page.goto(card.startUrl)
 const listing = page.locator('section').filter({ has: page.getByRole('heading', { name: label + ' deal proposals', exact: true }) })
 assert.equal(await listing.getByRole('link', { name: current.title, exact: true }).getAttribute('href'), '/app/proposal?id=' + id)
 assert.match(await listing.innerText(), /draft · revision 1/)
 await capture(page.locator('main'), provider + '-card-linked')
 await h.cmd('proposal.approve', { id, version: 1, revision: 1 }); await h.cmd('proposal.send', { id, version: 2 })
 await page.reload(); assert.match(await listing.innerText(), /sent · revision 1/)
 assert.equal(edge.writes.length, beforeWrites, 'card draft creation and human sending grant no CRM writes')
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
 assert.deepEqual(await page.locator('main').evaluate(root => [...root.querySelectorAll('p,label,button,a,dt,dd')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 13).map(e => e.tagName)), [])
}

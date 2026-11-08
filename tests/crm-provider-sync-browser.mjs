import assert from 'node:assert/strict'

export async function providerSyncControls(page, h, edge, provider, capture) {
 const label = provider === 'pipedrive' ? 'Pipedrive' : 'Zoho CRM', current = (await h.state()).proposals[0]
 await h.cmd('proposal.approve', { id: current.id, version: current.version, revision: current.revision })
 await h.cmd('proposal.send', { id: current.id, version: current.version + 1 })
 await page.goto(h.origin + '/app/settings')
 const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: label + ' proposal synchronization', exact: true }) })
 assert.equal(edge.writes.length, 0, 'opening Settings grants no write authority')
 await panel.getByLabel(label + ' status field', { exact: true }).fill(edge.mapping.statusProperty)
 await panel.getByLabel(label + ' protected-link field', { exact: true }).fill(edge.mapping.linkProperty)
 if (provider === 'pipedrive') await panel.getByLabel('Pipedrive pipeline ID', { exact: true }).fill(edge.mapping.pipelineId)
 await panel.getByLabel(label + ' Closed won stage', { exact: true }).fill(edge.mapping.wonStage)
 await panel.getByRole('button', { name: 'Review ' + label + ' writes', exact: true }).click()
 const review = panel.getByRole('article', { name: 'Reviewed ' + label + ' writes' })
 assert.match(await review.innerText(), /Amount: \$361\.22 USD/); assert.match(await review.innerText(), /sent timeline note/)
 assert.match(await review.innerText(), /120\.5/); assert.match(await review.innerText(), /19\.99/)
 assert.equal(edge.writes.length, 0, 'a review is not write consent')
 assert.deepEqual(await panel.evaluate(root => [...root.querySelectorAll('p,label,button,a,dt,dd')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 13).map(e => e.tagName)), [])
 await capture(panel, provider + '-write-review')
 await review.getByRole('checkbox').check(); await review.getByRole('button', { name: 'Apply reviewed ' + label + ' writes', exact: true }).click()
 assert.equal(await page.getByRole('alert').count(), 0)
 assert.equal(edge.state.deal[edge.mapping.statusProperty], 'sent'); assert.equal(edge.state.deal[edge.mapping.linkProperty], h.origin + '/app/proposal?id=' + current.id)
 assert.equal(edge.notes.length, 1)
 assert.match(await panel.innerText(), /confirmed/); assert.match(await panel.innerText(), /Reviewed CRM writes confirmed/)
 await capture(panel, provider + '-write-receipts')
}

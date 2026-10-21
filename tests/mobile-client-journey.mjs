import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import axe from 'axe-core'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'
import { PDFDocument } from 'pdf-lib'
import { pdfPages } from './pdf-document.mjs'

// Find controls by traversing the browser's actual tab order. Never place focus
// with a locator: unreachable controls must fail the same way they do for users.
async function tabTo(page, target) {
 for (let steps = 0; steps < 60; steps++) {
  if (await target.evaluate(element => element === document.activeElement)) return
  await page.keyboard.press('Tab')
 }
 assert.fail('EDIT-007 control is unreachable by keyboard: ' + await target.getAttribute('name'))
}
async function activate(page, role, name) {
 await tabTo(page, page.getByRole(role, { name, exact: true }))
 if (role === 'checkbox') await page.keyboard.press('Space')
 else await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.keyboard.press('Enter')])
}
async function type(page, label, text) {
 await tabTo(page, page.getByLabel(label, { exact: true }))
 await page.keyboard.type(text)
}

export async function mobileClientJourney() {
 let app, browser
 const screenshots = process.env.PLATTER_SCREENSHOTS
 try {
  browser = await chromium.launch({ headless: true, args: ['--use-mock-keychain', '--password-store=basic'] })
  if (screenshots) await mkdir(screenshots, { recursive: true })
  for (const width of [1440, 390]) {
   app = await installedApp()
   // The phone also proves that native review focus and every client action
   // work with application JavaScript disabled.
   const owner = await browser.newContext(), client = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: width !== 390 })
   try {
    assert.equal((await owner.request.post(app.origin + '/auth/bootstrap', { headers: { origin: app.origin }, data: { token: app.token, displayName: 'Jordan Northstar' }, maxRedirects: 0 })).status(), 303)
    const setup = await owner.newPage()
    await setup.goto(app.origin + '/setup'); await setup.getByRole('checkbox').check(); await setup.getByRole('button', { name: 'Finish setup' }).click()
    const command = async (name, input) => {
     const response = await owner.request.post(app.origin + '/api/platter/command', { headers: { origin: app.origin }, data: { name, input } })
     assert.equal(response.status(), 200, await response.text()); return response.json()
    }
    const customer = await command('client.save', { name: 'Northstar Coffee', email: 'avery@northstar.example' })
    const scope = 'Two studio shoots, edited product photographs and a campaign usage licence.'
    const made = await command('proposal.prepare', { clientId: customer.id, title: 'Northstar autumn campaign photography', scope, terms: 'Premium delivery includes a launch review in week four.', sectionConditions: { terms: 'two' }, depositPercent: '25', packages: [{ id: 'one', label: 'Studio essentials', price: '2400' }, { id: 'two', label: 'Full campaign', price: '4200', optionalItems: [{ id: 'retouch', label: 'Extra retouched images', unitPrice: '150', min: 1, max: 10, quantity: 1, editable: true }] }], pricingTables: [{optionId:'two',name:'Campaign services',lines:[{name:'Studio production',quantity:'2',unit:'shoot',unitPrice:'1500',group:'Production'},{name:'Campaign licence',quantity:'1',unit:'licence',unitPrice:'1200',group:'Delivery'}]}] })
    const attachment = await PDFDocument.create(); attachment.addPage().drawText('Northstar campaign production schedule')
    const attachmentBytes = Buffer.from(await attachment.save())
    const uploaded = await owner.request.post(app.origin + '/app/attachment', { headers: { origin: app.origin }, multipart: {id:made.id,version:'1',file:{name:'production-schedule.pdf',mimeType:'application/pdf',buffer:attachmentBytes}} })
    assert.equal(uploaded.status(),200,await uploaded.text())
    await command('proposal.approve', { id: made.id, revision: 2, version: 2 })
    const invitation = await command('proposal.send', { id: made.id, version: 3 })
    const page = await client.newPage()
    const inspect = async state => {
     await page.waitForLoadState('load')
     await page.evaluate(async () => { await document.fonts.ready })
     assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'EDIT-007 no horizontal scrolling at ' + state)
     await page.evaluate(axe.source)
     const results = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
     assert.deepEqual(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(n => n.target) })), [], 'EDIT-007 axe ' + width + ' ' + state)
     if (screenshots) await page.screenshot({ path: join(screenshots, `EDIT-007-${state}-${width}.png`), fullPage: true })
    }
    assert.equal((await page.goto(invitation.shareUrl)).status(), 200)
    assert.equal(await page.getByRole('link', { name: /sign in/i }).count(), 0)
    await inspect('invitation')
    await activate(page, 'link', 'Skip to content')
    assert.equal(await page.locator('main').evaluate(n => n === document.activeElement), true)
    // Review Premium before verification: every subsequent form must keep it.
    await tabTo(page, page.getByLabel('Review sections for'))
    await page.keyboard.type('Full campaign')
    await page.keyboard.press('Enter')
    assert.equal(await page.getByLabel('Review sections for').inputValue(), 'two')
    await activate(page, 'button', 'Review package')
    const review = page.getByRole('region', { name: 'Your selection', exact: true })
    assert.equal(await review.evaluate(n => n === document.activeElement), true, 'EDIT-007 package review returns keyboard focus to its named result')
    assert.match(await review.ariaSnapshot(), /Full campaign/)
    assert.match(await page.locator('main').innerText(), /Premium delivery includes/)
    // EDIT-007 / PRICE-002: add an optional item and raise its quantity by keyboard; the server total follows.
    const extra = page.getByRole('checkbox', { name: /Add Extra retouched images/ })
    await tabTo(page, extra); await page.keyboard.press('Space')
    await tabTo(page, page.getByLabel('Quantity for Extra retouched images')); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp')
    await activate(page, 'button', 'Review package')
    assert.equal(await review.evaluate(n => n === document.activeElement), true, 'EDIT-007 optional-item review focuses the updated selection without application scripts')
    assert.equal(await extra.isChecked(), true)
    assert.equal(await page.getByLabel('Quantity for Extra retouched images').inputValue(), '3')
    assert.match(await page.getByLabel('Selected total').innerText(), /4,650\.00/)
    assert.match(await page.getByLabel('Selected deposit').innerText(), /1,162\.50/)
    const accessibleSelection = await review.ariaSnapshot()
    for (const value of ['Full campaign', 'Extra retouched images', '4,650.00 USD', '1,162.50 USD']) assert.ok(accessibleSelection.includes(value), 'EDIT-007 selection is exposed to accessibility APIs: '+value)
    const accessibleOffer = await page.locator('main').ariaSnapshot()
    for (const value of [scope, 'Studio production', 'Campaign licence', 'Production subtotal', 'Delivery subtotal']) assert.ok(accessibleOffer.includes(value), 'EDIT-007 priced content is exposed to accessibility APIs: '+value)
    await inspect('optional-item')
    // Native validation must retain both focus and the last reviewed selection.
    const quantity = page.getByLabel('Quantity for Extra retouched images')
    await tabTo(page, quantity); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('11')
    await tabTo(page, page.getByRole('button', {name:'Review package',exact:true})); await page.keyboard.press('Enter')
    assert.equal(await quantity.evaluate(n => n === document.activeElement && n.validity.rangeOverflow), true)
    assert.equal(await page.getByLabel('Selected total').innerText(), '$4,650.00 USD')
    await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('3'); await activate(page,'button','Review package')
    await inspect('quantity-corrected')
    const fileLink = page.getByRole('link', {name:/production-schedule\.pdf/})
    await tabTo(page,fileLink)
    const [fileDownload] = await Promise.all([page.waitForEvent('download'),page.keyboard.press('Enter')])
    assert.deepEqual(await readFile(await fileDownload.path()),attachmentBytes,'EDIT-007 keyboard downloads the exact attachment')
    await activate(page, 'button', 'Send verification code')
    await inspect('code-requested')
    // The selected total and deposit are <output> elements (role status too); the feedback notice takes focus.
    assert.equal(await page.locator('p.notice[role=status]').evaluate(n => n === document.activeElement), true)
    await type(page, 'Email verification code', '000')
    await activate(page, 'button', 'Verify email')
    assert.equal(await page.getByRole('alert').evaluate(n => n === document.activeElement), true)
    assert.match(await page.locator('main').innerText(), /six-digit code/)
    assert.equal(await extra.isChecked(), true)
    await inspect('verification-error')
    const state = await (await owner.request.get(app.origin + '/api/platter/state')).json()
    const code = state.outbox.find(m => m.proposal_id === made.id && m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await type(page, 'Email verification code', code)
    await activate(page, 'button', 'Verify email')
    assert.equal(await page.getByRole('heading', { name: 'Accept this proposal', exact: true }).count(), 1)
    assert.equal(await page.getByLabel('Review sections for').inputValue(), 'two')
    assert.equal(await extra.isChecked(), true)
    await inspect('verified')
    await tabTo(page,page.getByRole('button',{name:'Download unsigned proposal PDF',exact:true}))
    const [unsigned] = await Promise.all([page.waitForEvent('download'),page.keyboard.press('Enter')])
    const pdf = (await pdfPages(await readFile(await unsigned.path()))).join(' ')
    for(const value of [scope,'Studio production','Campaign licence','Extra retouched images','4,650.00','1,162.50','Not signed, revision 2'])assert.ok(pdf.includes(value),'EDIT-007 selected unsigned PDF retains '+value)
    assert.equal(await extra.isChecked(),true);assert.equal(await quantity.inputValue(),'3')
    await type(page, 'Your question', 'Can the week-four launch review take place on Friday?')
    await activate(page, 'button', 'Send question to owner')
    assert.match(await page.locator('main').innerText(), /Can the week-four launch review take place on Friday/)
    assert.equal(await page.getByLabel('Review sections for').inputValue(), 'two')
    assert.equal(await extra.isChecked(), true)
    await inspect('commented')
    await type(page, 'Your full name', 'Avery Chen')
    await activate(page, 'checkbox', 'I accept the scope of work, chosen option, total price, and deposit shown above.')
    await activate(page, 'button', 'Accept proposal')
    assert.equal(await page.getByRole('heading', { name: 'Proposal accepted', exact: true }).count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Accept proposal', exact: true }).count(), 0)
    assert.match(await page.locator('main').innerText(), /\$4,650\.00 USD/)
    assert.match(await page.locator('main').innerText(), /\$1,162\.50 USD/)
    assert.match(await page.locator('main').innerText(), /Premium delivery includes/)
    await inspect('accepted')
    assert.equal(await page.getByRole('link',{name:/production-schedule\.pdf/}).count(),1)
    assert.match(await page.locator('main').ariaSnapshot(),/Avery Chen/)
    const final = await (await owner.request.get(app.origin + '/api/platter/state')).json(), saved = final.proposals.find(p => p.id === made.id)
    assert.equal(saved.acceptance.optionId, 'two'); assert.equal(saved.acceptance.name, 'Avery Chen')
    assert.deepEqual(saved.acceptance.selection.items.map(({ id, quantity }) => ({ id, quantity })), [{ id: 'retouch', quantity: 3 }]); assert.equal(saved.acceptance.totalCents, 465000); assert.equal(saved.acceptance.depositCents, 116250)
    assert.equal(saved.questions[0].text, 'Can the week-four launch review take place on Friday?')
    assert.equal((await client.cookies()).some(cookie => !cookie.name.startsWith('platter_client')), false, 'client completes without a member account')
   } finally { await client.close(); await owner.close(); await app.close(); app = undefined }
  }
 } finally { await browser?.close(); await app?.close() }
}

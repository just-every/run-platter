import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'
import { documentFixture } from './document-fixture.mjs'
import { pdfPages } from './pdf-document.mjs'

export async function documentJourney(){
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [1440,390]){
   app=await installedApp()
   const context=await browser.newContext({viewport:{width,height:900}})
   let clientContext
   try{
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message))
    const post=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const state=async()=>(await context.request.get(app.origin+'/api/platter/state')).json()
    assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic Platter owner'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.getByRole('link',{name:'Clients',exact:true}).click();await page.locator('[name=name]').fill('Synthetic Platter client');await page.locator('[name=email]').fill('synthetic-platter-1@example.com');await page.getByRole('button',{name:'Add client',exact:true}).click()
    await page.getByRole('link',{name:'Proposals',exact:true}).click();await page.locator('select[name=clientId]').selectOption({label:'Synthetic Platter client'})
    for(const [name,value] of Object.entries({title:'A considered proposal',scope:'The reviewed project scope.',optionOne:'Studio',priceOne:'1000',optionTwo:'Campaign',priceTwo:'2000',depositPercent:'25'}))await page.locator(`[name=${name}]`).fill(value)
    await page.getByRole('button',{name:'Prepare proposal',exact:true}).click();await page.getByRole('link',{name:'A considered proposal',exact:true}).click()
    const id=new URL(page.url()).searchParams.get('id'),editor=page.locator('[data-document-editor]'),blocks=editor.locator('[data-block-id]'),fixture=documentFixture()
    await editor.locator('.document-brand-kit summary').click()
    for(const [key,value] of Object.entries(fixture.brand)){const node=editor.locator(`[data-brand=${key}]`);if(key==='font')await node.selectOption(value);else await node.fill(value)}
    await editor.getByRole('button',{name:'Apply brand kit'}).click()
    for(const block of fixture.blocks){
     await editor.locator('[data-block-type]').selectOption(block.type);await editor.getByRole('button',{name:'Add block',exact:true}).click()
     const card=blocks.last()
     if(block.type!=='page_break'){
      await card.getByLabel('Block heading',{exact:true}).fill(block.title)
      if(!['heading','pricing'].includes(block.type))await card.getByLabel(block.type==='columns'?'First column':'Block text',{exact:true}).fill(block.text)
      if(block.second)await card.getByLabel('Second column',{exact:true}).fill(block.second)
      if(block.condition)await card.getByLabel('Block visibility',{exact:true}).selectOption(block.condition)
     }
    }
    await editor.getByRole('button',{name:'Save document',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('[data-document-editor]').dataset.saveState==='saved')
    // The public state agrees with what the editor built from blank.
    let p=(await state()).proposals.find(p=>p.id===id)
    assert.equal(p.document.blocks.length,fixture.blocks.length);assert.deepEqual(p.document.brand,fixture.brand)
    const originalOrder=p.document.blocks.map(b=>b.id)
    await blocks.nth(1).getByRole('button',{name:'Move down',exact:true}).focus()
    assert.equal(await blocks.nth(1).getByRole('tooltip').filter({hasText:'Move down'}).isVisible(),true,'keyboard tooltip appears immediately')
    await blocks.nth(1).getByRole('button',{name:'Move down',exact:true}).press('Enter')
    const beforeDrag=await blocks.evaluateAll(nodes=>nodes.map(n=>n.dataset.blockId))
    const handle=blocks.nth(2).getByRole('button',{name:'Drag block',exact:true})
    await handle.dragTo(blocks.nth(1).locator('.document-block-bar'))
    await page.waitForFunction(expected=>Array.from(document.querySelectorAll('[data-block-id]'),n=>n.dataset.blockId).join(',')!==expected,beforeDrag.join(','))
    const reordered=await blocks.evaluateAll(nodes=>nodes.map(n=>n.dataset.blockId));assert.notDeepEqual(reordered,originalOrder)
    const count=await blocks.count();await blocks.nth(1).getByRole('button',{name:'Duplicate block',exact:true}).click();assert.equal(await blocks.count(),count+1)
    await blocks.nth(2).getByRole('button',{name:'Delete block',exact:true}).click();assert.equal(await blocks.count(),count)
    await editor.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await blocks.count(),count+1)
    await editor.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await blocks.count(),count)
    await editor.getByRole('button',{name:'Save document',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('[data-document-editor]').dataset.saveState==='saved')
    p=(await state()).proposals.find(p=>p.id===id)
    assert.deepEqual(p.document.blocks.map(b=>b.id),reordered)
    const savedDocument=p.document
    await page.reload();assert.deepEqual(await blocks.evaluateAll(nodes=>nodes.map(n=>n.dataset.blockId)),reordered)
    assert.deepEqual((await state()).proposals.find(p=>p.id===id).document,savedDocument)
    await editor.getByRole('button',{name:'Add block',exact:true}).scrollIntoViewIfNeeded()
    const tipControl=blocks.first().getByRole('button',{name:'Drag block',exact:true});await tipControl.focus()
    if(screenshots)await page.screenshot({path:join(screenshots,`EDIT-001-editor-${width}.png`)})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'editor has no horizontal overflow')
    // Same rendered document under the member-only client preview.
    const preview=await context.request.get(`${app.origin}/app/preview/client?id=${id}&revision=${p.revision}&optionId=two`)
    assert.equal(preview.status(),200);assert.match(await preview.text(),/Client testimonial/)
    clientContext=await browser.newContext({viewport:{width,height:900}})
    assert.equal((await clientContext.request.get(`${app.origin}/app/preview/client?id=${id}&revision=${p.revision}`)).status(),401)
    await post('proposal.approve',{id,version:p.version,revision:p.revision});p=(await state()).proposals.find(p=>p.id===id)
    const invitation=await post('proposal.send',{id,version:p.version}),path=new URL(invitation.shareUrl).pathname,client=await clientContext.newPage()
    await client.goto(app.origin+path+'?optionId=two');await client.getByRole('button',{name:'Send verification code',exact:true}).click()
    const code=(await state()).outbox.find(row=>row.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await client.getByLabel('Email verification code',{exact:true}).fill(code);await client.getByRole('button',{name:'Verify email',exact:true}).click()
    await client.goto(app.origin+path+'?optionId=two')
    const clientOrder=await client.locator('[data-document-block]').evaluateAll(nodes=>nodes.map(n=>n.dataset.documentBlock));assert.deepEqual(clientOrder,reordered)
    const brand=await client.locator('.proposal-document').evaluate(node=>({ink:getComputedStyle(node).color,paper:getComputedStyle(node).backgroundColor}));assert.deepEqual(brand,{ink:'rgb(28, 28, 36)',paper:'rgb(255, 255, 255)'})
    assert.equal(await client.locator('.proposal-document strong').innerText(),'careful')
    assert.equal(await client.locator('.document-columns>div').count(),2)
    assert.ok(await client.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'client document has no horizontal overflow')
    await client.locator('.proposal-document').scrollIntoViewIfNeeded();if(screenshots)await client.screenshot({path:join(screenshots,`EDIT-001-client-${width}.png`)})
    const pdf=await clientContext.request.post(app.origin+path+'/download.pdf',{headers:{origin:app.origin},data:{optionId:'two'}});assert.equal(pdf.status(),200)
    const pages=await pdfPages(await pdf.body()),text=pages.join(' ')
    for(const page of pages)assert.ok(page.includes('Not signed, revision '+p.revision))
    let at=-1;for(const block of savedDocument.blocks.filter(b=>b.type!=='page_break')){const next=text.indexOf(block.title,at+1);assert.ok(next>at,'PDF keeps editor order for '+block.title);at=next}
    const approved=(await state()).proposals.find(p=>p.id===id);assert.deepEqual(approved.document,savedDocument)
    assert.deepEqual(errors,[])
   }finally{await clientContext?.close();await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
}

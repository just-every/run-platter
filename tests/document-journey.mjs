import assert from 'node:assert/strict'
import { mkdir,readFile } from 'node:fs/promises'
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
    const id=new URL(page.url()).searchParams.get('id')
    // Add a real priced table through the existing composer before placing it.
    await page.locator('[data-pricing-option="one"] [data-pricing-action="add-table"]').click()
    const table=page.locator('[data-pricing-option="one"] [data-pricing-table]')
    await table.locator('[data-pricing-field="name"]').first().fill('Placed services')
    const line=table.locator('[data-pricing-line]');for(const [key,value]of Object.entries({name:'Discovery',description:'A reviewed workshop',quantity:'2',unit:'hour',unitPrice:'10.01'}))await line.locator(`[data-pricing-field="${key}"]`).fill(value)
    await page.getByRole('button',{name:'Save revision',exact:true}).click()
    const uploadForm=page.locator('form[action="/app/document-media"]')
    await page.getByText('Upload display media',{exact:true}).first().click()
    await uploadForm.getByLabel('Display media file').setInputFiles({name:'synthetic-platter-1.png',mimeType:'image/png',buffer:await readFile('public/brand/apple-touch-icon.png')})
    await uploadForm.locator('[name=consent]').check();await uploadForm.getByRole('button',{name:'Upload display media',exact:true}).click()
    const videoBytes=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d'),stream=canvas.captureStream(10),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];let frame=0;const interval=setInterval(()=>{ctx.fillStyle=frame++%2?'#7c144a':'#ffd45a';ctx.fillRect(0,0,320,180)},40);return new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=async()=>{clearInterval(interval);stream.getTracks().forEach(t=>t.stop());resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())))};recorder.start();setTimeout(()=>recorder.stop(),500)})})
    await page.getByText('Upload display media',{exact:true}).first().click()
    await uploadForm.getByLabel('Display media file').setInputFiles({name:'synthetic-platter-2.webm',mimeType:'video/webm',buffer:Buffer.from(videoBytes)})
    await uploadForm.locator('[name=consent]').check();await uploadForm.getByRole('button',{name:'Upload display media',exact:true}).click()
    const editor=page.locator('[data-document-editor]'),blocks=editor.locator('[data-block-id]'),fixture=documentFixture(),assets=(await state()).proposals.find(p=>p.id===id).documentMedia,image=assets.find(f=>f.mediaType==='image/png'),video=assets.find(f=>f.mediaType==='video/webm')
    fixture.brand={...fixture.brand,accent:'#075a70',ink:'#173c38',paper:'#fffdf5',font:width===1440?'serif':'sans',logoId:image.id}
    fixture.blocks.splice(4,0,{id:'photo',type:'image',title:'Studio image',text:'A retained image.',assetId:image.id,alt:'Synthetic Platter studio mark'},{id:'film',type:'video',title:'Studio film',text:'An uploaded introduction.',assetId:video.id,posterId:image.id,alt:'Synthetic Platter introduction'},{id:'pricing',type:'pricing',title:'Investment detail',text:'',optionId:'one',tableIndex:0})
    fixture.blocks.push({id:'po',type:'field',title:'Purchase order',text:'Use the approved PO.',recipientRole:'client',fieldKind:'text',required:true},{id:'signature',type:'signature',title:'Client signature',text:'',recipientRole:'client'})
    await editor.locator('.document-brand-kit summary').click()
    for(const [key,value] of Object.entries(fixture.brand)){const node=editor.locator(`[data-brand=${key}]`);if(key==='font'||key==='logoId')await node.selectOption(value);else await node.fill(value)}
    await editor.getByRole('button',{name:'Apply brand kit'}).click()
    for(const block of fixture.blocks){
     await editor.locator('[data-block-type]').selectOption(block.type);await editor.getByRole('button',{name:'Add block',exact:true}).click()
     const card=blocks.last()
     if(block.type==='cover')assert.equal(await card.getByLabel('Block heading',{exact:true}).inputValue(),fixture.brand.cover,'new covers use the applied brand default')
     if(block.type!=='page_break'){
      await card.getByLabel('Block heading',{exact:true}).fill(block.title)
      if(['image','video'].includes(block.type)){await card.getByLabel('Media description',{exact:true}).fill(block.alt);await card.getByLabel('Caption',{exact:true}).fill(block.text)}
      else if(['field','signature'].includes(block.type)){await card.getByLabel('Instructions',{exact:true}).fill(block.text);if(block.type==='field'){await card.getByLabel('Field type',{exact:true}).selectOption(block.fieldKind);if(block.required)await card.getByLabel('Required field',{exact:true}).check()}}
      else if(!['heading','pricing'].includes(block.type))await card.getByLabel(block.type==='columns'?'First column':'Block text',{exact:true}).fill(block.text)
      if(block.second)await card.getByLabel('Second column',{exact:true}).fill(block.second)
      if(block.condition)await card.getByLabel('Block visibility',{exact:true}).selectOption(block.condition)
     }
    }
    await editor.getByRole('button',{name:'Save document',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('[data-document-editor]').dataset.saveState==='saved')
    // The public state agrees with what the editor built from blank.
    let p=(await state()).proposals.find(p=>p.id===id)
    assert.equal(p.document.blocks.length,fixture.blocks.length);assert.deepEqual(p.document.brand,fixture.brand)
    const composer=page.locator('form.composer'),autosave=composer.locator('[data-composer-autosave]')
    await composer.locator('[name=scope]').fill('The reviewed project scope, with an autosaved handoff.')
    await page.waitForFunction(()=>document.querySelector('[data-composer-autosave]').dataset.saveState==='saved')
    assert.equal((await state()).proposals.find(p=>p.id===id).scope,'The reviewed project scope, with an autosaved handoff.')
    await composer.locator('[data-pricing-option="one"] [data-pricing-field="unitPrice"]').first().fill('11.01')
    await page.waitForFunction(()=>document.querySelector('[data-composer-autosave]').dataset.saveState==='saved')
    assert.equal((await state()).proposals.find(p=>p.id===id).options[0].cents,2202,'pricing edits autosave through server arithmetic')
    const originalOrder=p.document.blocks.map(b=>b.id)
    await blocks.nth(1).getByRole('button',{name:'Move down',exact:true}).focus()
    assert.equal(await blocks.nth(1).getByRole('tooltip').filter({hasText:'Move down'}).isVisible(),true,'keyboard tooltip appears immediately')
    await blocks.nth(1).getByRole('button',{name:'Move down',exact:true}).press('Enter')
    const beforeDrag=await blocks.evaluateAll(nodes=>nodes.map(n=>n.dataset.blockId)),keyboardOrder=[...originalOrder];[keyboardOrder[1],keyboardOrder[2]]=[keyboardOrder[2],keyboardOrder[1]];assert.deepEqual(beforeDrag,keyboardOrder,'keyboard moves the selected block down one position')
    const handle=blocks.nth(2).getByRole('button',{name:'Drag block',exact:true})
    await handle.dragTo(blocks.nth(1).locator('.document-block-bar'))
    await page.waitForFunction(expected=>Array.from(document.querySelectorAll('[data-block-id]'),n=>n.dataset.blockId).join(',')!==expected,beforeDrag.join(','))
    const reordered=await blocks.evaluateAll(nodes=>nodes.map(n=>n.dataset.blockId)),expected=[...beforeDrag];expected.splice(1,0,...expected.splice(2,1));assert.deepEqual(reordered,expected,'drag places the moved block before its target')
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
    const tipControl=blocks.first().getByRole('button',{name:'Drag block',exact:true}),tooltip=blocks.first().getByRole('tooltip').filter({hasText:'Drag block'});await page.getByRole('heading',{name:'Document blocks',exact:true}).click();await tipControl.hover();await page.waitForTimeout(100);assert.equal(await tooltip.isVisible(),false,'hover tooltip waits about 300ms');await tooltip.waitFor({state:'visible',timeout:600});await tipControl.focus();assert.equal(await tooltip.isVisible(),true)
    if(screenshots)await page.screenshot({path:join(screenshots,`EDIT-001-editor-${width}.png`)})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'editor has no horizontal overflow')
    // Same rendered document under the member-only client preview.
    const preview=await context.request.get(`${app.origin}/app/preview/client?id=${id}&revision=${p.revision}&optionId=two`)
    assert.equal(preview.status(),200);assert.match(await preview.text(),/Client testimonial/)
    clientContext=await browser.newContext({viewport:{width,height:900}})
    assert.equal((await clientContext.request.get(`${app.origin}/app/preview/client?id=${id}&revision=${p.revision}`)).status(),401)
    await post('proposal.approve',{id,version:p.version,revision:p.revision});p=(await state()).proposals.find(p=>p.id===id)
    const invitation=await post('proposal.send',{id,version:p.version}),path=new URL(invitation.shareUrl).pathname,client=await clientContext.newPage()
    await page.goto(app.origin+'/app/proposal?id='+id);await page.getByRole('button',{name:'Allow Our approach — text suggestions',exact:true}).click()
    await client.goto(app.origin+path+'?optionId=two');await client.getByRole('button',{name:'Send verification code',exact:true}).click()
    const code=(await state()).outbox.find(row=>row.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
    await client.getByLabel('Email verification code',{exact:true}).fill(code);await client.getByRole('button',{name:'Verify email',exact:true}).click()
    await client.goto(app.origin+path+'?optionId=two')
    const picture=client.locator('.document-image img');await picture.scrollIntoViewIfNeeded();await client.waitForFunction(()=>document.querySelector('.document-image img').naturalWidth>0)
    const film=client.locator('.document-video video');await film.scrollIntoViewIfNeeded();await film.evaluate(node=>node.play());await client.waitForFunction(()=>document.querySelector('.document-video video').currentTime>0);await film.evaluate(node=>node.pause())
    const clientOrder=await client.locator('[data-document-block]').evaluateAll(nodes=>nodes.map(n=>n.dataset.documentBlock));assert.deepEqual(clientOrder,reordered)
    const brand=await client.locator('.proposal-document').evaluate(node=>({ink:getComputedStyle(node).color,paper:getComputedStyle(node).backgroundColor,font:getComputedStyle(node).fontFamily,accent:getComputedStyle(node.querySelector('h2')).color}));assert.equal(brand.ink,'rgb(23, 60, 56)');assert.equal(brand.paper,'rgb(255, 253, 245)');assert.equal(brand.accent,'rgb(7, 90, 112)');assert.ok(brand.font.includes(width===1440?'Source Serif 4':'Inter'),'the chosen brand font renders')
    assert.equal(await client.locator('.document-text strong').innerText(),'careful')
    assert.equal(await client.locator('.document-column-grid>div').count(),2)
    assert.ok(await client.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'client document has no horizontal overflow')
    await client.locator('.proposal-document').scrollIntoViewIfNeeded();if(screenshots)await client.screenshot({path:join(screenshots,`EDIT-001-client-${width}.png`)})
    const pdf=await clientContext.request.post(app.origin+path+'/download.pdf',{headers:{origin:app.origin},data:{optionId:'two'}});assert.equal(pdf.status(),200)
    const layout=await pdfPages(await pdf.body(),true),pages=layout.map(p=>p.text),text=pages.join(' ');assert.ok(layout.every(p=>p.width===612&&p.height===792));assert.equal(layout.reduce((n,p)=>n+p.imageCount,0),3,'PDF carries the logo, uploaded image and video still')
    for(const page of pages)assert.ok(page.includes('Not signed, revision '+p.revision))
    let at=-1;for(const block of savedDocument.blocks.filter(b=>b.type!=='page_break')){const next=text.indexOf(block.title,at+1);assert.ok(next>at,'PDF keeps editor order for '+block.title);at=next}
    const approved=(await state()).proposals.find(p=>p.id===id);assert.deepEqual(approved.document,savedDocument)
    await client.getByLabel('Question about',{exact:true}).selectOption({label:'Our approach'});await client.getByLabel('Your question',{exact:true}).fill('Does the approach include a handoff?');await client.getByRole('button',{name:'Send question to owner',exact:true}).click()
    await page.goto(app.origin+'/app/proposal?id='+id);await page.getByLabel('Answer this question',{exact:true}).fill('Yes, the handoff is included.');await page.getByRole('button',{name:'Send answer to client',exact:true}).click()
    await client.goto(app.origin+path+'?optionId=two');assert.ok((await client.locator('main').innerText()).includes('Yes, the handoff is included.'))
    await client.getByLabel('Existing text',{exact:true}).fill('clear');await client.getByLabel('Suggested replacement',{exact:true}).fill('weekly');await client.getByRole('button',{name:'Submit text suggestion',exact:true}).click()
    await page.goto(app.origin+'/app/proposal?id='+id);await page.getByRole('button',{name:'Accept suggestion',exact:true}).click()
    const pending=(await state()).proposals.find(p=>p.id===id);assert.equal(pending.approved_by,null);assert.ok(pending.document.blocks.find(b=>b.title==='Our approach').text.includes('weekly'))
    const stillSent=await clientContext.request.get(app.origin+path+'/data.json?optionId=two');assert.deepEqual((await stillSent.json()).document,savedDocument,'suggestions do not rewrite the live client document')
    await client.getByLabel('Purchase order',{exact:true}).fill('synthetic-platter-3')
    await client.getByLabel('Type your full name for Client signature',{exact:true}).fill('Synthetic Platter signer')
    await client.getByLabel('Your full name',{exact:true}).fill('Synthetic Platter signer');await client.locator('input[name=consent]').check();await client.getByRole('button',{name:'Accept proposal',exact:true}).click()
    assert.equal(await client.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1)
    const accepted=(await state()).proposals.find(p=>p.id===id).acceptance,po=savedDocument.blocks.find(b=>b.type==='field').id,signature=savedDocument.blocks.find(b=>b.type==='signature').id
    assert.deepEqual(accepted.fieldValues,{[po]:'synthetic-platter-3',[signature]:'Synthetic Platter signer'})
    if(screenshots){await client.locator('.document-signature').scrollIntoViewIfNeeded();await client.screenshot({path:join(screenshots,`EDIT-001-signed-fields-${width}.png`)})}
    assert.deepEqual(errors,[])
   }finally{await clientContext?.close();await context.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
}

import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'
import {unzipSync,strFromU8} from 'fflate'
import {join} from 'node:path'
import {chromium} from '@playwright/test'
import {PDFDocument,StandardFonts} from 'pdf-lib'
import {harness} from './harness.mjs'
import {browserEdge} from './browser-edge.mjs'
import {wordFixture} from './document-import-fixture.mjs'
export async function documentImportBrowser(width=1440){
 let edge,h,browser,context
 try{
  edge=await browserEdge();h=await harness({entry:'dist/server/index.js',assetsDirectory:'./dist/client',origin:edge.origin});edge.attach(h)
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});context=await browser.newContext({viewport:{width,height:1000},ignoreHTTPSErrors:true})
  const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}]);const page=await context.newPage(),screens=process.env.PLATTER_SCREENSHOTS
  const capture=async label=>{await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'document screens fit the viewport');if(screens){await mkdir(screens,{recursive:true});await page.screenshot({path:join(screens,'EDIT-004-005-'+label+'-'+width+'.png'),fullPage:true})}}
  await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  await page.goto(h.origin+'/app/clients');await page.getByLabel('Client name',{exact:true}).fill('Synthetic browser client');await page.getByLabel('Client email',{exact:true}).fill(['synthetic-platter-401','example.test'].join('@'));await page.getByLabel('Contact name (optional)').fill('Casey Lane');await page.getByLabel('Contact title (optional)').fill('Director');await page.getByLabel('Postal address (optional)').fill('40 Synthetic Street');await capture('client-fields');await page.getByRole('button',{name:'Add client',exact:true}).click()
  const client=(await h.state()).clients.find(c=>c.name==='Synthetic browser client'),p=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic browser document',scope:'Hello {{Contact.Name}}, {{Custom.Subject}}.',optionOne:'Studio',priceOne:'1200',optionTwo:'Campaign',priceTwo:'2400',depositPercent:'25'})
  await page.goto(h.origin+'/app/proposal?id='+p.id)
  const variablePanel=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Variables',exact:true})})
  assert.match(await variablePanel.innerText(),/Unfilled variables:.*Contact.Name.*Custom.Subject/s)
  await variablePanel.getByLabel('Custom.Subject',{exact:true}).fill('A considered proposal');await variablePanel.getByRole('button',{name:'Fill proposal variables'}).click()
  assert.equal(await page.locator('textarea[name=scope]').inputValue(),'Hello Casey Lane, A considered proposal.');assert.match(await page.locator('body').innerText(),/All recorded variables are filled/);await capture('filled-variables')
  let upload=page.locator('details').filter({has:page.getByText('Import Word or PDF',{exact:true})});await upload.locator('summary').click();await upload.getByLabel('Source document').setInputFiles({name:'synthetic-platter-401.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from(await wordFixture({rows:4,images:2,tokens:false}))});await upload.getByRole('checkbox').check();await upload.getByRole('button',{name:'Import document',exact:true}).click()
  assert.equal((await h.state()).proposals.find(r=>r.id===p.id).document.blocks.length,9);await page.locator('[data-block-id]').first().waitFor();assert.equal(await page.locator('[data-block-id]').count(),9);assert.equal(await page.getByRole('heading',{name:'Document files',exact:true}).count(),1)
  const first=page.locator('[data-block-id]').first();await first.getByLabel('Block heading',{exact:true}).fill('Edited imported heading');await page.locator('[data-document-save]').click();await page.waitForFunction(()=>document.querySelector('[data-document-editor]')?.dataset.saveState==='saved');assert.equal((await h.state()).proposals.find(r=>r.id===p.id).document.blocks[0].title,'Edited imported heading')
  const icon=first.getByRole('button',{name:'Duplicate block',exact:true});await icon.focus();assert.equal(await first.getByRole('tooltip').filter({hasText:'Duplicate block'}).isVisible(),true);await capture('word-blocks')
  await page.reload();const filePanel=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Document files',exact:true})}),link=filePanel.getByRole('link',{name:'Export Word document',exact:true});const word=await context.request.get(new URL(await link.getAttribute('href'),h.origin).href);assert.equal(word.status(),200);assert.match(word.headers()['content-type'],/wordprocessingml/)
  const fixed=await h.cmd('proposal.prepare',{clientId:client.id,title:'Synthetic fixed document',scope:'Fixed pages and live terms.',optionOne:'Studio',priceOne:'1200',optionTwo:'Campaign',priceTwo:'2400',depositPercent:'25'}),source=await PDFDocument.create(),font=await source.embedFont(StandardFonts.Helvetica);for(let i=1;i<=3;i++)source.addPage().drawText('Synthetic fixed page '+i,{font,x:48,y:700});const bytes=await source.save()
  await page.goto(h.origin+'/app/proposal?id='+fixed.id);upload=page.locator('details').filter({has:page.getByText('Import Word or PDF',{exact:true})});await upload.locator('summary').click();await upload.getByLabel('Source document').setInputFiles({name:'synthetic-platter-402.pdf',mimeType:'application/pdf',buffer:Buffer.from(bytes)});await upload.getByRole('checkbox').check();await upload.getByRole('button',{name:'Import document',exact:true}).click()
  assert.match(await page.locator('body').innerText(),/3 fixed PDF pages/);await page.locator('[data-fixed-page="3"]').waitFor();assert.equal(await page.locator('[data-fixed-page]').count(),3);assert.ok(await page.locator('[data-fixed-page="1"]').evaluate(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((value,i)=>i%4!==3&&value<200)),'original PDF page has rendered ink')
  await page.locator('[data-block-type]').selectOption('signature');await page.locator('[data-block-add]').click();const signature=page.locator('[data-block-id]').last();await signature.getByLabel('Fixed PDF page (blank for appended field)').fill('3');await page.locator('[data-document-save]').click();await page.waitForFunction(()=>document.querySelector('[data-document-editor]')?.dataset.saveState==='saved');assert.equal((await h.state()).proposals.find(r=>r.id===fixed.id).document.blocks[0].page,3);await capture('fixed-page-field')
  await page.reload();const originalLink=page.getByRole('link',{name:'Download original PDF',exact:true}),original=await context.request.get(new URL(await originalLink.getAttribute('href'),h.origin).href);assert.equal(original.status(),200);assert.deepEqual(new Uint8Array(await original.body()),bytes)
  const latest=(await h.state()).proposals.find(p=>p.id===fixed.id);await h.cmd('proposal.approve',{id:fixed.id,version:latest.version,revision:latest.revision});const invitation=await h.cmd('proposal.send',{id:fixed.id,version:latest.version+1});await page.goto(invitation.shareUrl);await page.locator('[data-fixed-page="3"]').waitFor();assert.equal(await page.locator('[data-fixed-page]').count(),3);assert.equal(await page.getByRole('heading',{name:'Fixed PDF pages',exact:true}).count(),1);await capture('client-fixed-pages');await page.goto(h.origin+'/app/proposal?id='+fixed.id)
  const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Export Word document',exact:true}).click();const download=await downloadPromise,wordBytes=new Uint8Array(await readFile(await download.path())),files=unzipSync(wordBytes),xml=strFromU8(files['word/document.xml'])
  assert.equal(Object.keys(files).filter(k=>k.startsWith(['word','media',''].join('/'))).length,3);assert.deepEqual(files[['word','embeddings','original.pdf'].join('/')],bytes);assert.ok(xml.indexOf('<w:drawing>')<xml.indexOf('Synthetic fixed document'));await capture('fixed-word-export')
 }finally{await context?.close();await browser?.close();await h?.close();await edge?.close()}
}

export async function pandadocContentBrowser(width=1440){
 let edge,h,browser,context
 try{
  edge=await browserEdge();h=await harness({entry:'dist/server/index.js',assetsDirectory:'./dist/client',origin:edge.origin});edge.attach(h)
  const {pandadocContentFixture}=await import('./document-import-fixture.mjs'),{applyBusiness}=await import('./business-import-fixture.mjs'),fixture=await pandadocContentFixture()
  await applyBusiness(h,{kind:'catalog',format:'platter',csv:'id,sku,name,description,price,currency,unit\n'+Array.from({length:5},(_,i)=>'synthetic-platter-'+(510+i)+',SKU'+(i+1)+',Synthetic product '+(i+1)+',,99,USD,each').join('\n')})
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});context=await browser.newContext({viewport:{width,height:1000},ignoreHTTPSErrors:true})
  const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}]);const page=await context.newPage()
  await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  const capture=async(label,locator)=>{
   await page.evaluate(()=>document.fonts.ready)
   const viewport=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,outside:[...document.querySelectorAll('body *')].filter(n=>n.getClientRects().length&&n.getBoundingClientRect().right>innerWidth).map(n=>({tag:n.tagName,class:n.className,right:n.getBoundingClientRect().right})).slice(-10)}))
   assert.ok(viewport.scroll<=viewport.width,'move-in controls fit the viewport: '+JSON.stringify(viewport))
   const sizes=await locator.locator('button,input,select,p,td,th').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>parseFloat(getComputedStyle(n).fontSize)))
   assert.ok(sizes.every(size=>size>=13),'conversion controls use legible text')
   if(process.env.PLATTER_SCREENSHOTS){await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true});await locator.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'MIG-001-'+label+'-'+width+'.png')})}
  }
  const start=async(kind,label,files)=>{
   await page.goto(h.origin+'/app/import');const form=page.locator('form[action*="document-import.create"]')
   await form.getByLabel('Move-in name',{exact:true}).fill(label);await form.getByLabel('Source content',{exact:true}).selectOption(kind);await form.getByRole('button',{name:'Start document move-in',exact:true}).click()
   const move=(await h.state()).documentMoveins.find(m=>m.label===label),panel=page.locator('.document-movein-'+move.id)
   await panel.getByLabel('Exported files',{exact:true}).setInputFiles(files.map(f=>({name:f.filename,mimeType:f.filename.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:f.bytes})))
   const {createHash}=await import('node:crypto'),lastHash=createHash('sha256').update(files.at(-1).bytes).digest('hex')
   const finished=page.waitForResponse(r=>{if(!r.url().endsWith('/api/platter/command')||r.request().method()!=='POST')return false;const body=r.request().postDataJSON();return body.name==='document-import.upload-finish'&&body.input.sha256===lastHash}),reloaded=page.waitForResponse(r=>r.request().isNavigationRequest()&&r.request().method()==='GET'&&new URL(r.url()).pathname==='/app/import')
   await panel.getByRole('button',{name:'Upload or resume files',exact:true}).click();assert.equal((await finished).status(),200);await reloaded;await page.waitForLoadState('load');await panel.getByRole('button',{name:'Preview document move-in',exact:true}).click();await panel.getByRole('button',{name:'Apply reviewed PandaDoc conversion',exact:true}).waitFor()
   return {move,panel}
  }
  const {move,panel}=await start('pandadoc-template','Synthetic PandaDoc browser templates',[fixture.quote,fixture.fixed])
  assert.match(await panel.innerText(),/\$280.00/);assert.equal(await panel.getByRole('cell',{name:'Linked',exact:true}).count(),5);assert.equal(await panel.getByRole('cell',{name:'Unmatched',exact:true}).count(),1);assert.match(await panel.innerText(),/Word download needed for editing/);assert.equal((await h.state()).templates.length,0);await capture('review',panel)
  await panel.getByRole('button',{name:'Apply reviewed PandaDoc conversion',exact:true}).click();assert.equal((await h.state()).templates.length,2)
  await panel.getByRole('button',{name:'Open document journal',exact:true}).click();const link=panel.getByRole('link',{name:'Download '+fixture.quote.filename,exact:true}),original=await context.request.get(new URL(await link.getAttribute('href'),h.origin).href);assert.equal(original.status(),200);assert.deepEqual(await original.body(),fixture.quote.bytes);await capture('journal',panel)
  const library=await start('pandadoc-library','Synthetic PandaDoc browser library',[fixture.library]);assert.equal((await h.state()).libraryItems.length,0);await library.panel.getByRole('button',{name:'Apply reviewed PandaDoc conversion',exact:true}).click();assert.equal((await h.state()).libraryItems.length,10);await capture('library',library.panel)
  await library.panel.getByRole('button',{name:'Undo document move-in',exact:true}).click();assert.equal((await h.state()).libraryItems.length,0)
  await page.goto(h.origin+'/app/import');await panel.getByRole('button',{name:'Undo document move-in',exact:true}).click();assert.equal((await h.state()).templates.length,0)
 }finally{await context?.close();await browser?.close();await h?.close();await edge?.close()}
}

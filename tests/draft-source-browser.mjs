import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'
import { originalNotes, sourceHash } from './draft-source-fixture.mjs'
export async function sourceBrowser(width=1440) {
 let app,browser,context
 try{
  app=await installedApp();browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});context=await browser.newContext({viewport:{width,height:900}})
  const page=await context.newPage(),headers={origin:app.origin},cmd=async(name,input)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers,data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
  const screenshot=async(name,locator)=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'source controls fit viewport');if(process.env.PLATTER_SCREENSHOTS){await mkdir(process.env.PLATTER_SCREENSHOTS,{recursive:true});await (locator??page).screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'AI-001-'+name+'-'+width+'.png'),...(locator?{}:{fullPage:true})})}}
  assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers,data:{token:app.token,displayName:'Synthetic source owner'},maxRedirects:0})).status(),303)
  await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  const client=await cmd('client.save',{name:'Synthetic source client',email:['synthetic-platter-9910','example.test'].join('@')}),key=await cmd('agent.create',{label:'Synthetic browser source key'})
  const catalog=await cmd('catalog.save',{sku:'synthetic-platter-9911',name:'Discovery workshop',description:'Facilitated session',unit:'each',unitPrice:'123.45'})
  const base=await cmd('proposal.prepare',{clientId:client.id,title:'Synthetic browser template',scope:'Template scope',terms:'Human review is required.',depositPercent:'25',packages:[{id:'base',label:'Base',price:'900'}]}),template=await cmd('template.save',{id:base.id,version:1,name:'Synthetic browser template'})
  await page.goto(app.origin+'/app/settings')
  const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Draft sources',exact:true})}),upload=panel.locator('form').first()
  await upload.getByLabel('Source title').fill('Synthetic browser notes');await upload.getByLabel('Plain text notes or transcript').setInputFiles({name:'synthetic-platter-9912.txt',mimeType:'text/plain',buffer:Buffer.from(originalNotes)});await upload.getByRole('button',{name:'Upload private source'}).click()
  assert.equal(await page.getByRole('alert').count(),0)
  const details=panel.locator('details').filter({hasText:'Synthetic browser notes'});await details.locator('summary').click()
  await details.getByLabel('Agent key',{exact:true}).selectOption(key.id);await details.getByRole('checkbox').check();await details.getByRole('button',{name:'Allow source binding'}).click()
  await details.locator('summary').click();assert.equal(await details.getByRole('button',{name:'Revoke source binding'}).count(),1);await screenshot('consent',panel)
  const source=(await (await context.request.get(app.origin+'/api/platter/state')).json()).draftSources[0]
  await details.getByRole('link',{name:'Inspect numbered original'}).click()
  assert.equal(await page.locator('ol li').count(),6);assert.equal(await page.locator('ol li').nth(1).innerText(),'Two discovery workshops are requested.');assert.ok((await page.locator('main').innerText()).includes(sourceHash(originalNotes)));await screenshot('original')
  const input={clientId:client.id,title:'Synthetic browser sourced draft',templateId:template.id,templateVersion:1,sourceDraft:{sourceId:source.id,sourceVersion:1,sourceSha256:source.sha256,sections:[{id:'discovery',title:'Discovery',text:'Run two discovery workshops.',citation:{startLine:2,endLine:2,sha256:sourceHash('Two discovery workshops are requested.')}},{id:'delivery',title:'Delivery',text:'Deliver three campaign assets.',citation:{startLine:4,endLine:4,sha256:sourceHash('Deliver three campaign assets.')}}],packages:[{id:'essential',label:'Essential',lines:[{catalogId:catalog.id,catalogVersion:1,quantity:'2'}]},{id:'campaign',label:'Campaign',lines:[{catalogId:catalog.id,catalogVersion:1,quantity:'4'}]}]}}
  const prepare=async()=>context.request.post(app.origin+'/api/platter/agent/mcp',{headers:{authorization:'Bearer '+key.token,origin:app.origin},data:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'prepare_proposal',arguments:input}}})
  const result=await (await prepare()).json();assert.ok(!result.result.isError,JSON.stringify(result));const created=JSON.parse(result.result.content[0].text)
  await page.goto(app.origin+'/app/proposal?id='+created.id)
  assert.equal(await page.locator('textarea[name="scope"]').inputValue(),'Discovery\nRun two discovery workshops.\n\nDelivery\nDeliver three campaign assets.')
  const provenance=page.locator('section').filter({has:page.getByRole('heading',{name:'Prepared source references',exact:true})});assert.match(await provenance.innerText(),/discovery: lines 2–2/);assert.match(await provenance.innerText(),/delivery: lines 4–4/);await screenshot('references',provenance)
  assert.ok(!(await page.locator('main').innerText()).includes('synthetic-platter-9904'))
  await page.goto(app.origin+'/app/settings');await details.locator('summary').click();await details.getByRole('button',{name:'Revoke source binding'}).click();assert.equal(await details.getByRole('button',{name:'Revoke source binding'}).count(),0)
  const denied=await (await prepare()).json();assert.equal(denied.result.isError,true);assert.match(denied.result.content[0].text,/no consent/)
 }finally{await context?.close();await browser?.close();await app?.close()}
}

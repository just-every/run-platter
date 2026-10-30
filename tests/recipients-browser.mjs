import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'

const address=n=>'synthetic-platter-'+n+String.fromCharCode(64)+'example.test'
export async function recipientsBrowser(width=1440){
 const app=await installedApp({scheduled:true})
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const context=await browser.newContext({viewport:{width,height:1000}})
 context.setDefaultTimeout(15000)
 const clients=[]
 const screenshots=process.env.PLATTER_SCREENSHOTS
 if(screenshots)await mkdir(screenshots,{recursive:true})
 try{
  const page=await context.newPage()
  const capture=async name=>{
   await page.waitForLoadState('load');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at '+width)
   if(screenshots)await page.screenshot({path:join(screenshots,'recipients-'+name+'-'+width+'.png'),fullPage:true})
  }
  const cmd=async(name,input,status=200)=>{
   const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}})
   assert.equal(r.status(),status,await r.text());return r.json()
  }
  assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic owner'},maxRedirects:0})).status(),303)
  await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  const owner=(await(await context.request.get(app.origin+'/api/platter/state')).json()).actor.email
  const client=await cmd('client.save',{name:'Synthetic client',email:address(1000)})
  const offer={clientId:client.id,title:'Leadership signing agreement',scope:'All parties review the exact frozen offer.',optionOne:'Studio',priceOne:'2500',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
  const p=await cmd('proposal.prepare',offer)
  await page.goto(app.origin+'/app/proposal?id='+p.id)
  const panel=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Recipients and signing',exact:true})})
  for(const [name,email,role,group] of [['CEO',address(1001),'signer',1],['CFO',address(1002),'signer',2],['Owner',owner,'countersigner',3],['Finance approver',address(1003),'approver',1],['Viewer',address(1004),'viewer',1]]){
   await panel.locator('summary').getByText('Add recipient',{exact:true}).click()
   const form=panel.locator('form[action*="name=recipient.save"]').last()
   await form.getByLabel('Recipient name',{exact:true}).fill(name);await form.getByLabel('Recipient email',{exact:true}).fill(email)
   await form.getByLabel('Recipient role',{exact:true}).selectOption(role);await form.getByLabel('Signing group',{exact:true}).fill(String(group))
   await form.getByRole('button',{name:'Add recipient slot',exact:true}).click()
   assert.equal(await page.getByRole('alert').count(),0)
   if(screenshots)console.log('Recipient browser '+width+': configured '+name)
  }
  let row=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(r=>r.id===p.id)
  const plan=JSON.parse(row.recipient_plan),ceo=plan.find(r=>r.name==='CEO'),cfo=plan.find(r=>r.name==='CFO')
  const editor=page.locator('[data-document-editor]')
  await editor.locator('[data-block-type]').selectOption('field');await editor.getByRole('button',{name:'Add block',exact:true}).click()
  const block=editor.locator('[data-block-id]').last()
  await block.getByLabel('Block heading',{exact:true}).fill('CFO reference')
  await block.getByLabel('Assigned recipient',{exact:true}).selectOption('slot:'+cfo.id)
  await block.getByLabel('Required field',{exact:true}).check()
  await editor.getByRole('button',{name:'Save document',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('[data-document-editor]')?.dataset.saveState==='saved',{},{timeout:15000})
  const tool=editor.locator('[data-block-id]').first().getByRole('button',{name:'Duplicate block',exact:true})
  await tool.hover();await page.waitForTimeout(350)
  assert.equal(await tool.locator('..').getByRole('tooltip').isVisible(),true)
  await tool.focus();assert.equal(await tool.locator('..').getByRole('tooltip').isVisible(),true)
  if(screenshots)console.log('Recipient browser '+width+': document saved')
  await capture('owner-roles')
  row=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(r=>r.id===p.id)
  await page.goto(app.origin+'/app/preview?id='+p.id+'&revision='+row.revision+'&recipientId='+cfo.id)
  assert.equal(await page.getByLabel('Preview recipient').inputValue(),cfo.id)
  const frame=page.frameLocator('iframe[title="Client-page preview"]')
  assert.equal(await frame.getByLabel('CFO reference',{exact:true}).isDisabled(),true)
  assert.equal(await frame.getByRole('button',{name:'Accept proposal',exact:true}).isDisabled(),true)
  await capture('cfo-preview')
  await page.getByLabel('Preview recipient').selectOption(ceo.id);await page.getByRole('button',{name:'Change preview width',exact:true}).click()
  assert.equal(await frame.getByLabel('CFO reference',{exact:true}).count(),0)
  await page.getByRole('link',{name:'Back to editor',exact:true}).click()
  await page.getByRole('button',{name:'Approve this revision',exact:true}).click()
  await page.getByRole('button',{name:'Send approved proposal',exact:true}).click()
  assert.equal(await page.getByRole('alert').count(),0)
  await capture('sent-roles')
  row=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(r=>r.id===p.id)
  const links=Object.fromEntries(row.recipientLinks.map(r=>[r.slot_id,'/p/'+r.token]))
  const verify=async(r,proposalId=p.id,paths=links)=>{
   const ctx=await browser.newContext({viewport:{width,height:1000}});clients.push(ctx)
   const clientPage=await ctx.newPage()
   await clientPage.goto(app.origin+paths[r.id])
   assert.equal(await clientPage.getByRole('heading',{name:offer.title,exact:true}).count(),0)
   const [codeResponse]=await Promise.all([
    clientPage.waitForResponse(response=>new URL(response.url()).pathname===paths[r.id]+'/action'&&new URL(response.url()).searchParams.get('name')==='code.request'),
    clientPage.getByRole('button',{name:'Send verification code',exact:true}).click(),
   ])
   assert.equal(codeResponse.status(),200)
   const code=(await app.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND recipient=? AND subject='Your Platter verification code' ORDER BY rowid DESC LIMIT 1").bind(proposalId,r.email).first()).body.match(/\b\d{6}\b/)[0]
   await clientPage.getByLabel('Email verification code',{exact:true}).fill(code)
   await clientPage.getByRole('button',{name:'Verify email',exact:true}).click()
   assert.equal(await clientPage.getByRole('heading',{name:proposalId===p.id?offer.title:'Revocable viewing agreement',exact:true}).count(),1)
   return clientPage
  }
  const pages={}
  for(const r of plan)pages[r.name]=await verify(r)
  const viewer=pages.Viewer
  assert.equal(await viewer.getByRole('button',{name:'Accept proposal',exact:true}).count(),0)
  assert.equal(await viewer.getByRole('button',{name:'Approve client revision',exact:true}).count(),0)
  assert.equal(await pages.CFO.getByRole('button',{name:'Accept proposal',exact:true}).count(),0)
  if(screenshots)await pages.CFO.screenshot({path:join(screenshots,'recipients-waiting-'+width+'.png'),fullPage:true})
  const sign=async(name,button='Accept proposal')=>{
   const active=pages[name];await active.reload()
   await active.getByLabel('Your full name',{exact:true}).fill(name)
   const form=active.locator('#platter-acceptance')
   if(name==='CFO')await active.getByLabel('CFO reference',{exact:true}).fill('synthetic-platter-2002')
   if(button==='Accept proposal')await form.getByRole('radio').first().check()
   await form.getByRole('checkbox').check()
   await form.getByRole('button',{name:button,exact:true}).click()
   assert.equal(await active.getByRole('alert').count(),0)
   if(name==='CFO')assert.match(await active.locator('main').innerText(),/synthetic-platter-2002/)
   if(screenshots)await active.screenshot({path:join(screenshots,'recipients-'+name.toLowerCase().replaceAll(' ','-')+'-'+width+'.png'),fullPage:true})
  }
  await sign('CEO')
  assert.equal((await app.db.prepare('SELECT count(*) n FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).n,0)
  await sign('Finance approver','Approve client revision')
  await page.goto(app.origin+'/app/proposal?id='+p.id)
  const replacement=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Signer replacement',exact:true})})
  await replacement.getByLabel('Signer slot',{exact:true}).selectOption(cfo.id)
  await replacement.getByLabel('Replacement signer email',{exact:true}).fill(ceo.email)
  await replacement.getByLabel('Replacement reason',{exact:true}).fill('New authorized CFO')
  await replacement.getByRole('button',{name:'Replace unsigned signer',exact:true}).click()
  assert.equal(await page.getByRole('alert').getByText('Each recipient needs their own mailbox',{exact:true}).isVisible(),true)
  await replacement.getByLabel('Signer slot',{exact:true}).selectOption(cfo.id)
  await replacement.getByLabel('Replacement signer email',{exact:true}).fill(address(1011))
  await replacement.getByLabel('Replacement reason',{exact:true}).fill('New authorized CFO')
  await replacement.getByRole('button',{name:'Replace unsigned signer',exact:true}).click()
  assert.equal(await page.getByRole('alert').count(),0)
  assert.match(await replacement.innerText(),/Position 2/)
  await capture('cfo-replacement')
  assert.equal((await pages.CFO.goto(app.origin+links[cfo.id])).status(),410)
  assert.ok(!(await pages.CFO.locator('main').innerText()).includes(offer.title))
  row=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(r=>r.id===p.id)
  const replacementLinks=Object.fromEntries(row.recipientLinks.map(r=>[r.slot_id,'/p/'+r.token]))
  pages.CFO=await verify({...cfo,email:address(1011)},p.id,replacementLinks)
  await sign('CFO')
  assert.equal((await app.db.prepare('SELECT count(*) n FROM p_acceptances WHERE proposal_id=?').bind(p.id).first()).n,0)
  await sign('Owner')
  for(const r of plan){await pages[r.name].reload();assert.equal(await pages[r.name].getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1)}
  const completion=(await app.db.prepare("SELECT recipient FROM p_mail WHERE proposal_id=? AND subject LIKE 'Agreement complete:%'").bind(p.id).all()).results
  assert.deepEqual(completion.map(r=>r.recipient).sort(),plan.map(r=>r.id===cfo.id?address(1011):r.email).sort())
  const retained=await app.db.prepare('SELECT * FROM p_agreement_artifacts WHERE proposal_id=?').bind(p.id).first()
  for(const name of ['CEO','CFO','Owner']){
   const active=pages[name];await active.reload()
   await active.getByRole('heading',{name:'Agreement downloads',exact:true}).waitFor()
   if(width===1440){
    for(const [label,bytes] of [['Signed agreement PDF',retained.document],['Certificate of completion',retained.certificate]]){
     const response=await active.request.get(new URL(await active.getByRole('link',{name:label,exact:true}).getAttribute('href'),app.origin).href)
     assert.equal(response.status(),200);assert.deepEqual(await response.body(),Buffer.from(bytes))
    }
    assert.equal(JSON.parse(retained.facts).documentSha256,createHash('sha256').update(Buffer.from(retained.document)).digest('hex'))
   }
   if(screenshots)await active.screenshot({path:join(screenshots,'recipients-completed-'+name.toLowerCase()+'-'+width+'.png'),fullPage:true})
  }
  if(width===1440){
   const refs=(await app.db.prepare('SELECT * FROM p_completion_mail WHERE proposal_id=?').bind(p.id).all()).results
   assert.equal(refs.length,plan.length)
   for(const ref of refs)assert.equal((await app.db.prepare('SELECT status FROM p_mail WHERE id=?').bind(ref.mail_id).first()).status,'local')
  }
  await page.goto(app.origin+'/app/proposal?id='+p.id);await capture('complete-owner')
  // The same owner form revokes a viewer before any agreement completion.
  const second=await cmd('proposal.prepare',{...offer,title:'Revocable viewing agreement'})
  const configured=await cmd('recipient.save',{id:second.id,version:1,recipients:[{id:'signer',name:'Client signer',email:address(1007),role:'signer',group:1},{id:'viewer',name:'Revocable viewer',email:address(1008),role:'viewer',group:1},{id:'counter',name:'Owner countersigner',email:owner,role:'countersigner',group:2}]})
  await cmd('proposal.approve',{id:second.id,version:configured.version,revision:configured.revision})
  const sent=await cmd('proposal.send',{id:second.id,version:configured.version+1})
  const oldViewer=new URL(sent.recipients.find(r=>r.id==='viewer').shareUrl).pathname
  const secondLinks=Object.fromEntries(sent.recipients.map(r=>[r.id,new URL(r.shareUrl).pathname]))
  await page.goto(app.origin+'/app/proposal?id='+second.id)
  await panel.locator('summary').getByText('Share a verified viewing link',{exact:true}).click()
  const shareForm=panel.locator('form[action*="name=recipient.share"]')
  await shareForm.getByLabel('Shared viewer name',{exact:true}).fill('Embedded viewer')
  await shareForm.getByLabel('Shared viewer email',{exact:true}).fill(address(1009))
  await shareForm.getByLabel('Embed site origin (optional)',{exact:true}).fill(app.origin)
  await shareForm.getByRole('checkbox').check();await shareForm.getByRole('button',{name:'Create viewing link',exact:true}).click()
  assert.equal(await page.getByRole('alert').count(),0)
  const embedCode=await panel.getByLabel('Embed code',{exact:true}).inputValue()
  const embedUrl=embedCode.match(/src="([^"]+)"/)[1]
  const hostContext=context
  const host=await hostContext.newPage();await host.goto(app.origin+'/app/proposal?id='+second.id)
  await host.setContent('<iframe src="'+embedUrl+'" title="Verified proposal" width="100%" height="900" frameborder="0"></iframe>')
  const embedded=host.frameLocator('iframe[title="Verified proposal"]')
  assert.equal(await embedded.getByRole('heading',{name:'Revocable viewing agreement',exact:true}).count(),0)
  const [embedCodeResponse]=await Promise.all([
   host.waitForResponse(response=>new URL(response.url()).pathname===new URL(embedUrl).pathname+'/action'&&new URL(response.url()).searchParams.get('name')==='code.request'),
   embedded.getByRole('button',{name:'Send verification code',exact:true}).click(),
  ])
  assert.equal(embedCodeResponse.status(),200)
  const embedMail=(await app.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND recipient=? AND subject='Your Platter verification code' ORDER BY rowid DESC LIMIT 1").bind(second.id,address(1009)).first()).body.match(/\b\d{6}\b/)[0]
  await embedded.getByLabel('Email verification code',{exact:true}).fill(embedMail);await embedded.getByRole('button',{name:'Verify email',exact:true}).click()
  await embedded.getByRole('heading',{name:'Revocable viewing agreement',exact:true}).waitFor()
  assert.equal(await embedded.getByRole('button',{name:'Accept proposal',exact:true}).count(),0)
  if(screenshots)await host.screenshot({path:join(screenshots,'recipients-embedded-viewer-'+width+'.png'),fullPage:true})
  await capture('shared-viewer-owner')
  const secondSigner=await verify({id:'signer',email:address(1007)},second.id,secondLinks)
  await secondSigner.getByLabel('Your full name',{exact:true}).fill('Client signer')
  const signing=secondSigner.locator('#platter-acceptance');await signing.getByRole('radio').first().check();await signing.getByRole('checkbox').check();await signing.getByRole('button',{name:'Accept proposal',exact:true}).click()
  assert.equal(await secondSigner.getByText('Your signature is retained. Waiting for the remaining recipients.',{exact:true}).count(),1)
  await page.goto(app.origin+'/app/proposal?id='+second.id)
  await page.getByRole('button',{name:'Remove Revocable viewer',exact:true}).click()
  assert.equal((await page.goto(app.origin+oldViewer)).status(),410)
  assert.equal(await page.getByRole('heading',{name:'Signer invitation replaced',exact:true}).count(),1)
  assert.ok(!(await page.locator('main').innerText()).includes('Revocable viewing agreement'))
  await capture('removed-viewer')
  await page.goto(app.origin+'/app/proposal?id='+second.id)
  const withdrawal=page.locator('form[action*="name=proposal.withdraw"]')
  await withdrawal.getByLabel('Withdrawal reason',{exact:true}).fill('Partly signed offer cancelled')
  await withdrawal.getByRole('button',{name:'Withdraw proposal',exact:true}).click()
  assert.match(await panel.getByLabel('Signature history').innerText(),/Void: Partly signed offer cancelled/)
  await capture('void-signature-owner')
  const revokedEmbed=await hostContext.request.get(embedUrl);assert.equal(revokedEmbed.status(),410)
  assert.ok(!(await revokedEmbed.text()).includes('Revocable viewing agreement'))
  assert.equal((await secondSigner.goto(app.origin+secondLinks.signer)).status(),410)
  assert.equal(await secondSigner.getByRole('heading',{name:'Proposal withdrawn',exact:true}).count(),1)
  const withdrawnState=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(r=>r.id===second.id)
  const voidHistory=withdrawnState.recipientSignatureHistory
  assert.equal(voidHistory.length,1);assert.equal(voidHistory[0].void_reason,'Partly signed offer cancelled')
  await page.goto(app.origin+'/app/proposal?id='+second.id)
  await page.getByRole('button',{name:'Prepare negotiated revision',exact:true}).click()
  await page.getByRole('button',{name:'Approve this revision',exact:true}).click();await page.getByRole('button',{name:'Send approved proposal',exact:true}).click()
  const reissued=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(r=>r.id===second.id)
  assert.equal(reissued.revision,withdrawnState.revision+1);assert.deepEqual(reissued.recipientSignatureHistory,voidHistory)
  assert.equal(reissued.recipientSignatures.length,0,'a void historical signature cannot satisfy the new revision')
  assert.match(await panel.getByLabel('Signature history').innerText(),new RegExp('Revision '+withdrawnState.revision+' · Client signer'))
  assert.match(await panel.getByLabel('Signature history').innerText(),/Void: Partly signed offer cancelled/)
  await capture('reissued-void-history')
  assert.ok(await panel.getByLabel('Signature history').evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=13))
  if(screenshots)await panel.screenshot({path:join(screenshots,'recipients-reissued-void-panel-'+width+'.png')})
  for(const path of Object.values(secondLinks))assert.equal((await context.request.get(app.origin+path)).status(),410)
  const reissuedLinks=Object.fromEntries(reissued.recipientLinks.map(r=>[r.slot_id,'/p/'+r.token]))
  assert.equal((await secondSigner.request.get(app.origin+reissuedLinks.signer+'/data.json')).status(),401)
  const freshSigner=await verify({id:'signer',email:address(1007)},second.id,reissuedLinks)
  assert.equal(await freshSigner.getByRole('button',{name:'Accept proposal',exact:true}).count(),1)


 }finally{
  for(const ctx of clients)await ctx.close()
  await context.close();await browser.close();await app.close()
 }
}

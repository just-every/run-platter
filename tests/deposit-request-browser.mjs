import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'

export async function paperDepositBrowserJourney(browser,screenshots) {
 const app=await installedApp(),owner=await browser.newContext({viewport:{width:1440,height:1000}}),client=await browser.newContext({viewport:{width:1440,height:1000}})
 try {
  const page=await owner.newPage(),clientPage=await client.newPage(),headers={origin:app.origin}
  assert.equal((await owner.request.post(app.origin+'/auth/bootstrap',{headers,data:{token:app.token,displayName:'Synthetic owner'},maxRedirects:0})).status(),303)
  await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  const cmd=async(name,input)=>{const r=await owner.request.post(app.origin+'/api/platter/command',{headers,data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
  const recipient='synthetic-platter-8301'+String.fromCharCode(64)+'example.test',c=await cmd('client.save',{name:'Synthetic paper client',email:recipient})
  const p=await cmd('proposal.prepare',{clientId:c.id,title:'Synthetic signed-paper agreement',scope:'One-off delivery.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:25})
  await cmd('proposal.approve',{id:p.id,version:1,revision:1});const invitation=await cmd('proposal.send',{id:p.id,version:2}),path=new URL(invitation.shareUrl).pathname
  const capture=async(target,name)=>{
   if(screenshots){await mkdir(screenshots,{recursive:true});for(const width of [1440,390]){await target.setViewportSize({width,height:1000});await target.screenshot({path:join(screenshots,`SIGN-008-${name}-${width}.png`),fullPage:true})}await target.setViewportSize({width:1440,height:1000})}
   assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   for(const control of await target.locator('button,a[role=button]').all()){
    if(!await control.isVisible()||/[A-Za-z0-9]/.test((await control.innerText()).trim()))continue
    const tooltip=await control.getAttribute('aria-describedby');assert.ok(tooltip,'icon-only controls have tooltips');await control.focus();assert.equal(await target.locator('#'+tooltip).isVisible(),true)
   }
  }
  await page.goto(app.origin+'/app/proposal?id='+p.id)
  const upload=page.locator('#paper-acceptance form[enctype="multipart/form-data"]'),bytes=Buffer.from('%PDF-1.7 synthetic-platter-8302 signed original')
  await upload.getByRole('radio',{name:/Campaign/}).check();await upload.getByLabel('Signer full name').fill('Synthetic signer');await upload.getByLabel('Signed date').fill('2026-01-01')
  await upload.getByLabel('Client-signed copy').setInputFiles({name:'signed.pdf',mimeType:'application/pdf',buffer:bytes});await upload.getByRole('checkbox').check();await capture(page,'upload')
  await upload.getByRole('button',{name:'Record accepted by upload',exact:true}).click()
  const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Deposit request',exact:true})})
  assert.match(await panel.innerText(),/1,050\.00 USD/);assert.ok((await panel.innerText()).includes(recipient));assert.match(await panel.innerText(),/accepted revision 1/)
  const initial=await(await owner.request.get(app.origin+'/api/platter/state')).json();assert.deepEqual(initial.proposals.find(x=>x.id===p.id).depositRequests,[],'viewing the review cannot authorize delivery')
  await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Send deposit request',exact:true}).click()
  const state=await(await owner.request.get(app.origin+'/api/platter/state')).json(),accepted=state.proposals.find(x=>x.id===p.id),request=accepted.depositRequests[0]
  assert.equal(request.deposit_cents,105000);assert.equal(request.recipient,recipient);assert.equal(request.status,'local');assert.ok((await panel.innerText()).includes(request.id));assert.equal(await panel.getByRole('button',{name:'Send deposit request',exact:true}).count(),0)
  await capture(page,'owner-request')
  const original=await owner.request.get(app.origin+'/api/platter/attachments/'+p.id+'/'+accepted.acceptance.signedCopy.id);assert.deepEqual(await original.body(),bytes)
  await clientPage.goto(app.origin+path);assert.ok(!(await clientPage.locator('main').innerText()).includes(request.id))
  await clientPage.getByRole('button',{name:'Send verification code',exact:true}).click()
  const mail=await(await owner.request.get(app.origin+'/api/platter/state')).json(),code=mail.outbox.find(m=>m.proposal_id===p.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
  await clientPage.getByLabel('Email verification code').fill(code);await clientPage.getByRole('button',{name:'Verify email',exact:true}).click()
  const obligation=clientPage.locator('section').filter({has:clientPage.getByRole('heading',{name:'Deposit requested',exact:true})})
  assert.ok((await obligation.innerText()).includes(request.id));assert.ok((await obligation.innerText()).includes(recipient));assert.match(await obligation.innerText(),/1,050\.00 USD/);assert.match(await obligation.innerText(),/Platter did not verify the signature/)
  await capture(clientPage,'client-request')
 } finally {await client.close();await owner.close();await app.close()}
}

import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'

export async function replacementBrowser(){
 const browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
 const screenshots=process.env.PLATTER_SCREENSHOTS
 if(screenshots)await mkdir(screenshots,{recursive:true})
 try{for(const width of [1440,390]){
  const app=await installedApp(),context=await browser.newContext({viewport:{width,height:900}})
  try{
   const page=await context.newPage(),cmd=async(name,input,status=200)=>{const r=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),status,await r.text());return r.json()}
   const capture=async name=>{await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`SEND-007-${name}-${width}.png`),fullPage:true})}
   assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
   await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
   const client=await cmd('client.save',{name:'Northstar',email:'ceo@northstar.example'}),offer={clientId:client.id,title:'Leadership agreement',scope:'Two production days.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
   const p=await cmd('proposal.prepare',offer);await cmd('proposal.revise',{...offer,id:p.id,version:1,scope:'Three production days.'});await cmd('proposal.approve',{id:p.id,version:2,revision:2});const first=await cmd('proposal.send',{id:p.id,version:3})
   await page.goto(app.origin+'/app/proposal?id='+p.id)
   const panel=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Signer replacement',exact:true})})
   await panel.getByLabel('Replacement signer email').fill('coo@northstar.example');await panel.getByLabel('Replacement reason').fill('The COO signs our agreement.');await panel.getByLabel('Replacement invitation subject').fill('COO signature requested');await panel.getByLabel('Replacement invitation message').fill('Hi COO, please review these exact terms.')
   await panel.getByRole('button',{name:'Replace unsigned signer',exact:true}).click()
   assert.match(await panel.innerText(),/ceo@northstar.example.*coo@northstar.example/s);assert.match(await panel.innerText(),/Position 1/);assert.match(await panel.innerText(),/owner@northstar.example/);await capture('replaced');if(screenshots)await panel.screenshot({path:join(screenshots,`SEND-007-replacement-panel-${width}.png`)})
   const state=await(await context.request.get(app.origin+'/api/platter/state')).json(),row=state.proposals.find(x=>x.id===p.id),path='/p/'+row.shareToken
   assert.equal(row.revision,2);assert.ok(row.approved_at);assert.equal(row.signerReplacements.length,1)
   assert.equal((await page.goto(first.shareUrl)).status(),410);assert.ok(!(await page.locator('body').innerText()).includes(offer.title));await capture('old-link-refused')
   await page.goto(app.origin+path);await page.getByRole('button',{name:'Send verification code'}).click()
   const mail=(await(await context.request.get(app.origin+'/api/platter/state')).json()).outbox.find(m=>m.subject.includes('verification code')&&m.proposal_id===p.id);assert.equal(mail.recipient,'coo@northstar.example')
   await page.getByLabel('Email verification code').fill(mail.body.match(/\b\d{6}\b/)[0]);await page.getByRole('button',{name:'Verify email',exact:true}).click();await page.getByRole('radio',{name:/Campaign/}).check();await page.getByLabel('Your full name').fill('Northstar COO');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
   assert.equal(await page.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1);await capture('accepted')
   const cert=await context.request.get(app.origin+path+'/certificate.json');assert.equal(cert.status(),200);const facts=await cert.json();assert.equal(facts.replacements[0].reason,'The COO signs our agreement.');assert.equal(facts.signers[0].email,'coo@northstar.example')
   const pdf=await context.request.get(app.origin+path+'/certificate.pdf');assert.equal(pdf.status(),200);assert.equal((await pdf.body()).subarray(0,4).toString(),'%PDF');if(screenshots)await writeFile(join(screenshots,`SEND-007-certificate-${width}.pdf`),await pdf.body())
   await page.goto(app.origin+path+'/certificate.pdf').catch(()=>{})
   await page.goto(app.origin+'/app/proposal?id='+p.id);assert.equal(await page.getByRole('button',{name:'Replace unsigned signer',exact:true}).count(),0);assert.match(await panel.innerText(),/signed recipient cannot be replaced/);await capture('signed-refusal');if(screenshots)await panel.screenshot({path:join(screenshots,`SEND-007-signed-panel-${width}.png`)})
   const latest=(await(await context.request.get(app.origin+'/api/platter/state')).json()).proposals.find(x=>x.id===p.id)
   await cmd('signer.replace',{id:p.id,version:latest.version,recipient:'other@northstar.example',reason:'Forbidden'},409)
   // Every control on this frozen screen uses visible words; icon controls require a tooltip.
   const unlabeled=await page.locator('button,a[role="button"]').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()&&!n.querySelector('[data-tooltip]')&&!n.hasAttribute('data-tooltip')).map(n=>n.outerHTML));assert.deepEqual(unlabeled,[])
  }finally{await context.close();await app.close()}
 }}finally{await browser.close()}
}

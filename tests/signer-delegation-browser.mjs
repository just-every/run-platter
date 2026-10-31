import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'
const address=n=>['synthetic-platter-'+n,'example.test'].join('@')
export async function delegationBrowser(widths=[1440]){
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
 const screenshots=process.env.PLATTER_SCREENSHOTS;if(screenshots)await mkdir(screenshots,{recursive:true})
 try{for(const width of widths){
  const app=await installedApp(),owner=await browser.newContext({viewport:{width,height:1000}}),client=await browser.newContext({viewport:{width,height:1000}})
  try{
   const page=await owner.newPage(),recipient=await client.newPage()
   const cmd=async(name,input)=>{const r=await owner.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
   const state=async()=>{const r=await owner.request.get(app.origin+'/api/platter/state');assert.equal(r.status(),200);return r.json()}
   const capture=async(page,name)=>{await page.bringToFront();await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(screenshots)await page.screenshot({path:join(screenshots,`SIGN-009-${name}-${width}.png`),fullPage:true})}
   assert.equal((await owner.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic Platter owner'},maxRedirects:0})).status(),303)
   await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
   const company=await cmd('client.save',{name:'Synthetic Platter leadership',email:address(9901)}),offer={clientId:company.id,title:'Synthetic Platter delegation',scope:'synthetic-platter-private-scope',optionOne:'Studio',priceOne:'2500',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25'}
   const p=await cmd('proposal.prepare',offer);await cmd('proposal.approve',{id:p.id,version:1,revision:1});const sent=await cmd('proposal.send',{id:p.id,version:2})
   const get=async()=>(await state()).proposals.find(r=>r.id===p.id),verify=async path=>{
    await recipient.goto(app.origin+path);await recipient.getByRole('button',{name:'Send verification code',exact:true}).click()
    const mail=(await state()).outbox.find(m=>m.proposal_id===p.id&&m.subject==='Your Platter verification code'&&m.body!=='Verification code consumed')
    await recipient.getByLabel('Email verification code').fill(mail.body.match(/\b\d{6}\b/)[0]);await recipient.getByRole('button',{name:'Verify email',exact:true}).click()
   }
   await verify(new URL(sent.shareUrl).pathname);assert.equal(await recipient.getByRole('button',{name:'Delegate signing',exact:true}).count(),0)
   await page.goto(app.origin+'/app/settings')
   const settings=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Signer delegation Settings',exact:true})})
   await settings.getByRole('button',{name:'Enable delegation',exact:true}).click();assert.match(await settings.innerText(),/Delegation is on/);await capture(page,'settings')
   await recipient.reload()
   const delegate=async()=>{await recipient.getByLabel('Delegate full name').fill('Synthetic COO');await recipient.getByLabel('Delegate email').fill(address(9902));await recipient.getByRole('button',{name:'Delegate signing',exact:true}).click();assert.equal(await recipient.getByRole('heading',{name:'Signing delegated',exact:true}).count(),1)}
   await delegate();await capture(recipient,'delegated')
   assert.equal((await recipient.goto(sent.shareUrl)).status(),410);assert.ok(!(await recipient.locator('body').innerText()).includes(offer.scope))
   let path='/p/'+(await get()).shareToken;await recipient.goto(app.origin+path)
   assert.ok(!(await recipient.locator('body').innerText()).includes(offer.scope));assert.equal(await recipient.getByRole('button',{name:'Accept proposal',exact:true}).count(),0);await capture(recipient,'identity-required')
   await verify(path);assert.ok((await recipient.locator('body').innerText()).includes(offer.scope));await capture(recipient,'delegate-review')
   await page.goto(app.origin+'/app/proposal?id='+p.id);const history=page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Signer delegation',exact:true})})
   await history.getByRole('button',{name:'Undo delegation',exact:true}).click();assert.match(await history.innerText(),/Undone/);await capture(page,'undo')
   assert.equal((await recipient.goto(app.origin+path)).status(),410)
   path='/p/'+(await get()).shareToken;assert.notEqual(path,new URL(sent.shareUrl).pathname);await verify(path);await delegate()
   path='/p/'+(await get()).shareToken;await verify(path)
   await recipient.getByRole('radio',{name:/Studio/}).check();await recipient.getByLabel('Your full name').fill('Synthetic COO');await recipient.getByRole('checkbox').check();await recipient.getByRole('button',{name:'Accept proposal',exact:true}).click()
   assert.equal(await recipient.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1);await capture(recipient,'accepted')
   const cert=await client.request.get(app.origin+path+'/certificate.json');assert.equal(cert.status(),200);const facts=await cert.json();assert.equal(facts.delegations.length,2);assert.equal(facts.signers[0].email,address(9902));assert.ok(facts.delegations.some(d=>d.undone_at))
   await page.goto(app.origin+'/app/proposal?id='+p.id);assert.equal(await history.getByRole('button',{name:'Undo delegation',exact:true}).count(),0)
   for(const screen of [page,recipient])assert.deepEqual(await screen.locator('button,a[role="button"]').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()&&!n.querySelector('[data-tooltip]')&&!n.hasAttribute('data-tooltip')).map(n=>n.outerHTML)),[])
   console.log('PROBE SIGN-009 browser '+width+': Settings enable, recipient delegate, verification, owner undo and completed certificate -> passed')
  }finally{await client.close();await owner.close();await app.close()}
 }}finally{await browser.close()}
}

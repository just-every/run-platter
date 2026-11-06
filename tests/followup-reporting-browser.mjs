import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { harness } from './harness.mjs'
import { browserEdge } from './browser-edge.mjs'
import { followupReportingJourney } from './followup-reporting-journey.mjs'

export async function followupReportingBrowser(){
 const edge=await browserEdge(),mail=[]
 let h,browser
 const sessions=new Map(),screenshots=process.env.PLATTER_SCREENSHOTS
 const money=(cents,currency)=>'$'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+currency
 try{
  h=await harness({entry:'dist/server/index.js',assetsDirectory:'./dist/client',origin:edge.origin,auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9991'},outboundService:async request=>{assert.equal(new URL(request.url).hostname,'api.resend.com');mail.push(await request.json());return Response.json({id:'synthetic-platter-'+mail.length})}})
  edge.attach(h)
  h.signIn=async email=>{
   const sent=await h.send('/auth/magic-link',{email});assert.equal(sent.status,202,sent.text)
   const message=mail.findLast(m=>m.to.includes(email));assert.ok(message,'native sign-in reached the mailbox edge')
   const url=message.text.match(/https?:\/\/[^\s]+\/auth\/confirm\?token=[^\s]+/)[0]
   const confirmed=await h.send('/auth/confirm',{token:new URL(url).searchParams.get('token')});assert.equal(confirmed.status,303,confirmed.text);return confirmed.cookie
  }
  browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM_PATH,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  const session=async cookie=>{
   if(!sessions.has(cookie)){
    const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true})
    const split=cookie.indexOf('=')
    await context.addCookies([{name:cookie.slice(0,split),value:cookie.slice(split+1),url:h.origin}])
    const page=await context.newPage();page.setDefaultTimeout(10000)
    sessions.set(cookie,{context,page})
   }
   return sessions.get(cookie)
  }
  const {page:setup}=await session(h.owner)
  await setup.goto(h.origin+'/setup');await setup.getByRole('checkbox').check();await setup.getByRole('button',{name:'Finish setup'}).click()
  await followupReportingJourney(h,{inspect:async({label,person,query,rows,queueRows,totals,ownerIds})=>{
   const {page}=await session(person.cookie)
   await page.setViewportSize({width:1440,height:1000})
   assert.equal((await page.goto(h.origin+'/app?'+query)).status(),200,label)
   assert.deepEqual((await page.getByLabel('Owner',{exact:true}).locator('option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(Boolean))).sort(),ownerIds,label+' exact owner filter choices')
   assert.deepEqual(await page.locator('[data-proposal-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.proposalId)),rows.map(r=>r.id),label+' browser pipeline ids')
   assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),String(rows.length))
   assert.equal(await page.locator('[data-pipeline-total]').count(),totals.length)
   for(const total of totals){
    const dd=page.locator('[data-pipeline-total="'+total.currency+'"]')
    assert.equal(await dd.innerText(),money(total.valueCents,total.currency))
    assert.equal(await dd.evaluate(node=>node.previousElementSibling.textContent),total.currency+' total · '+total.count+' proposals')
   }
   for(const row of rows){
    const facts=await page.locator('[data-proposal-id="'+row.id+'"] .line-facts').locator('dd').allTextContents()
    assert.equal(facts[0],row.ownerName)
    assert.equal(facts[3],row.dueDate??'None')
    assert.equal(facts[4],({followup:'Sales follow-up',approve:'Approve revision',send:'Send approved offer','await-client':'Await client decision','export-deposit':'Export deposit invoice',withdrawn:'Prepare a new revision',reopen:'Review expiry or reopening'})[row.nextAction])
   }
   assert.deepEqual(await page.locator('[data-followup-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.followupId)),queueRows.map(r=>r.id),label+' browser queue ids')
   for(const row of queueRows){
    const text=await page.locator('[data-followup-id="'+row.id+'"]').innerText()
    assert.ok(text.includes(row.action+' · '+row.dueDate+' · '+row.period))
    assert.ok(text.includes(money(row.valueCents,row.currency)))
   }
   // Assertions run at desktop width. These same populated screens are also
   // recorded at phone width, without creating a second test registration.
   if(query.get('dueFollowup')==='yes'&&(label.includes('manager')||label==='initial owner'||label.startsWith('handoff'))){
    for(const width of [1440,390]){
     await page.setViewportSize({width,height:1000})
     await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflow at '+width)
     if(screenshots)await page.screenshot({path:join(screenshots,'FOLLOW-010-'+label.replaceAll(' ','-')+'-'+width+'.png'),fullPage:true})
    }
   }
  }})
 }finally{
  for(const {context} of sessions.values())await context.close()
  await browser?.close();await edge.close();await h?.close()
 }
}

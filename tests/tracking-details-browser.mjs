import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { installedApp } from './site-harness.mjs'
test('TRACK-001 and TRACK-004 client disclosure, first-party measurement and private owner controls work at desktop and phone widths', {timeout:240000}, async()=>{
 let app,browser
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLATTER_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  if(screenshots)await mkdir(screenshots,{recursive:true})
  for(const width of [Number(process.env.PLATTER_TRACKING_WIDTH??1440)]){
   app=await installedApp();const owner=await browser.newContext({viewport:{width,height:900}}),client=await browser.newContext({viewport:{width,height:900}})
   try{
    const page=await owner.newPage(),viewer=await client.newPage(),hosts=new Set()
    client.on('request',r=>hosts.add(new URL(r.url()).origin))
    const cmd=async(name,input)=>{const r=await owner.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
    const capture=async(p,name)=>{await p.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(await p.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.tagName,class:n.className,width:n.getBoundingClientRect().width})).slice(0,20)}))));const iconOnly=await p.locator('button,a[role="button"]').evaluateAll(nodes=>nodes.filter(n=>!n.textContent.trim()&&!n.getAttribute('data-tooltip')).map(n=>n.outerHTML));assert.deepEqual(iconOnly,[],'all controls have visible text or an explicit tooltip');if(screenshots){await p.screenshot({path:join(screenshots,`TRACK-${name}-${width}.png`),fullPage:true});if(name==='owner-timeline'||name==='stakeholder-approver'){await p.getByRole('heading',{name:'Engagement timeline',exact:true}).scrollIntoViewIfNeeded();await p.screenshot({path:join(screenshots,`TRACK-${name}-viewport-${width}.png`)})}}}
    assert.equal((await owner.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Jordan Northstar'},maxRedirects:0})).status(),303)
    await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    const c=await cmd('client.save',{name:'Northstar Coffee',email:['avery','northstar.example'].join('@')}),p=await cmd('proposal.prepare',{clientId:c.id,title:'Measured campaign',scope:'Northstar campaign. '+Array(90).fill('Studio photographs and campaign usage rights.').join('\n'),document:{version:1,blocks:[{id:'case-stable',type:'case_study',title:'Case study',text:Array(70).fill('A synthetic Platter campaign with retained results.').join('\n')}]},packages:['one','two'].map((id,i)=>({id,label:i?'Full campaign':'Studio essentials',price:i?'4200':'2400',optionalItems:[{id:'rush',label:'Rush delivery',unitPrice:'100',min:1,max:3,quantity:1,editable:true}]})),optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'})
    const upload=await owner.request.post(app.origin+'/app/attachment',{headers:{origin:app.origin},multipart:{id:p.id,version:'1',file:{name:'synthetic-platter-1.txt',mimeType:'text/plain',buffer:Buffer.from('Synthetic Platter attachment')}}});assert.equal(upload.status(),200);assert.match(await upload.text(),/Document saved/)
    await cmd('proposal.approve',{id:p.id,version:2,revision:2});const share=await cmd('proposal.send',{id:p.id,version:3})
    await page.goto(app.origin+'/app/proposal?id='+p.id)
    await page.goto(app.origin+'/app/settings');await page.getByLabel('Measure client views').selectOption('yes');await page.getByLabel('Open alerts',{exact:true}).selectOption('yes');await page.getByLabel('I authorize measuring client views and the selected alerts.').check();await page.getByLabel('Retention in days').fill('90');await page.getByRole('button',{name:'Save engagement settings'}).click()
    await capture(page,'owner-settings')
    await viewer.goto(share.shareUrl);assert.match(await viewer.locator('main').innerText(),/Views of this page are measured/)
    const viewId=await viewer.locator('[data-engagement-view]').getAttribute('data-engagement-view')
    const choose=viewer.getByLabel('Review sections for'),rush=viewer.locator('input[name="add.rush"]'),quantity=viewer.locator('input[name="qty.rush"]')
    await choose.selectOption('two');await choose.selectOption('one');await rush.check();await quantity.fill('2');await quantity.press('Tab');await rush.uncheck()
    const scroll=async key=>viewer.locator('[data-engagement-section="'+key+'"]').evaluate(n=>n.closest('section').scrollIntoView({block:'start'}))
    await scroll('scope');await viewer.waitForTimeout(5000)
    await scroll('block:case-stable');await viewer.waitForTimeout(5000)
    await scroll('pricing');await viewer.waitForTimeout(20000)
    // Chromium stays foreground in headless mode. Drive its visibility signal;
    // the compiled page still uses real elapsed time and real same-origin I/O.
    const visibility=async state=>viewer.evaluate(state=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>state});document.dispatchEvent(new Event('visibilitychange'))},state)
    await visibility('hidden');await viewer.waitForTimeout(5000);await visibility('visible');await viewer.waitForTimeout(20000)
    const flushed=viewer.waitForResponse(r=>r.url().endsWith('/engagement')&&r.request().method()==='POST'&&JSON.parse(r.request().postData()).readings?.pricing>=38000)
    await visibility('hidden');assert.equal((await flushed).status(),200)
    const measured=(await (await owner.request.get(app.origin+'/api/platter/engagement?id='+p.id)).json()).views.find(v=>v.id===viewId)
    for(const [key,seconds] of [['pricing',40],['block:case-stable',5]]){const actual=measured.reading.find(r=>r.section===key)?.milliseconds??0;assert.ok(Math.abs(actual-seconds*1000)<=2000,key+' measured '+actual+' ms');}
    assert.deepEqual(measured.choices.map(c=>[c.sequence,c.option_id,c.items]),[[1,'one',[]],[2,'two',[]],[3,'one',[]],[4,'one',[{id:'rush',quantity:1}]],[5,'one',[{id:'rush',quantity:2}]],[6,'one',[]]])
    console.log('TRACK_TIMING '+JSON.stringify({width,viewId,pricing:measured.reading.find(r=>r.section==='pricing').milliseconds,caseStudy:measured.reading.find(r=>r.section==='block:case-stable').milliseconds,hiddenPause:5000,choices:measured.choices.length}))
    const [download]=await Promise.all([viewer.waitForEvent('download'),viewer.getByRole('link',{name:'synthetic-platter-1.txt',exact:true}).click()]);assert.equal(download.suggestedFilename(),'synthetic-platter-1.txt')
    const afterOpen=await (await owner.request.get(app.origin+'/api/platter/engagement?id='+p.id)).json();assert.equal(afterOpen.views.find(v=>v.id===viewId).attachments[0].filename,'synthetic-platter-1.txt');assert.equal(afterOpen.recipients[0].attachments.length,1)
    await visibility('visible')
    await capture(viewer,'client-disclosure')
    await page.goto(app.origin+'/app/proposal?id='+p.id)
    assert.match(await page.getByRole('list',{name:'Engagement timeline'}).innerText(),/avery@northstar.example[\s\S]*Unverified link view/)
    assert.match(await page.getByRole('list',{name:'Recipient engagement summaries'}).innerText(),/Case study: [\d.]+ seconds[\s\S]*1 attachment opens/);assert.match(await page.getByRole('list',{name:'Engagement timeline'}).innerText(),/synthetic-platter-1.txt/)
    await capture(page,'owner-timeline')
    await page.goto(app.origin+'/app?status=viewed&sort=value');assert.equal(await page.locator('[data-pipeline-count]').getAttribute('data-pipeline-count'),'1');assert.match(await page.locator('[data-pipeline-total="USD"]').innerText(),/4,200.00 USD/);assert.match(await page.getByRole('list',{name:'Sales follow-ups'}).innerText(),/Viewed but not signed/)
    assert.match(await page.getByRole('list',{name:'Sales follow-ups'}).innerText(),/Read Pricing for/)
    await capture(page,'viewed-pipeline')
    const data=await (await owner.request.get(app.origin+'/api/platter/engagement?id='+p.id)).json();assert.ok(data.views[0].reading.some(r=>r.section==='scope'&&r.milliseconds>=4000));assert.ok(data.views[0].reading.some(r=>r.section==='pricing'&&r.milliseconds>=2000));assert.deepEqual([...hosts],[app.origin])
    assert.equal((await client.request.get(app.origin+'/api/platter/engagement?id='+p.id)).status(),401)
    await viewer.getByLabel('Your stakeholder name',{exact:true}).fill('Riley Procurement');await viewer.getByLabel('Your stakeholder email',{exact:true}).fill('riley@synthetic-platter.example');await viewer.getByRole('checkbox',{name:/Send me a verification code/}).check();await viewer.getByRole('button',{name:'Identify stakeholder',exact:true}).click()
    const forwarded=(await (await owner.request.get(app.origin+'/api/platter/state')).json()).outbox.find(m=>m.subject==='Verify your stakeholder mailbox');await viewer.getByLabel('Stakeholder verification code').fill(forwarded.body.match(/\b\d{6}\b/)[0]);await capture(viewer,'forwarded-verification');await viewer.getByRole('button',{name:'Verify stakeholder mailbox',exact:true}).click();assert.match(await viewer.locator('main').innerText(),/Mailbox verified/)
    await page.goto(app.origin+'/app/proposal?id='+p.id);assert.match(await page.getByRole('list',{name:'Verified stakeholders'}).innerText(),/Riley Procurement/);await page.getByRole('button',{name:'Add approver recipient',exact:true}).click();assert.match(await page.getByRole('list',{name:'Verified stakeholders'}).innerText(),/approver/);await capture(page,'stakeholder-approver')
    await page.goto(app.origin+'/app/proposal?id='+p.id);await page.getByRole('button',{name:'Erase engagement data'}).click();assert.equal(await page.getByRole('list',{name:'Engagement timeline'}).count(),0)
    await page.goto(app.origin+'/app/settings');await page.getByLabel('Measure client views').selectOption('no');await page.getByLabel('Open alerts',{exact:true}).selectOption('no');await page.getByRole('button',{name:'Save engagement settings'}).click();await viewer.goto(share.shareUrl);assert.equal(await viewer.locator('[data-engagement-view]').count(),0);await capture(viewer,'measurement-off')
   }finally{await owner.close();await client.close();await app.close();app=undefined}
  }
 }finally{await browser?.close();await app?.close()}
})

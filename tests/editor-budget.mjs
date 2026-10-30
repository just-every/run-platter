// Run separately from push Verify: real compiled app, real uploads, 4x browser CPU.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'
import { pdfPages } from './pdf-document.mjs'
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const report={head,cpuThrottle:4,editorViewport:{width:1440,height:900},clientViewport:{width:390,height:900}}
let app,browser,context,phoneContext
try{
 app=await installedApp();browser=await chromium.launch({headless:true,...(process.env.PLATTER_CHROMIUM?{executablePath:process.env.PLATTER_CHROMIUM}:{}),args:['--no-sandbox','--use-mock-keychain','--password-store=basic']});context=await browser.newContext({viewport:report.editorViewport})
 const post=async(name,input)=>{const response=await context.request.post(app.origin+'/api/platter/command',{headers:{origin:app.origin},data:{name,input}});assert.equal(response.status(),200,await response.text());return response.json()}
 const state=async()=>(await context.request.get(app.origin+'/api/platter/state')).json()
 assert.equal((await context.request.post(app.origin+'/auth/bootstrap',{headers:{origin:app.origin},data:{token:app.token,displayName:'Synthetic Platter reference owner'},maxRedirects:0})).status(),303)
 const page=await context.newPage();await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
 const client=await post('client.save',{name:'Synthetic Platter reference client',email:'synthetic-platter-1@example.com'})
 const tables=Array.from({length:4},(_,t)=>({optionId:'one',name:'Reference table '+(t+1),lines:Array.from({length:15},(_,i)=>({name:'Reference service '+(i+1),description:'',quantity:'1',unit:'hour',unitPrice:'100.00',group:''}))}))
 const proposal=await post('proposal.prepare',{clientId:client.id,title:'Forty-page reference proposal',scope:'Reviewed reference scope.',terms:'Reviewed reference terms.',optionOne:'Reference services',priceOne:'6000',optionTwo:'Alternative package',priceTwo:'7000',depositPercent:'25',pricingTables:tables})
 // A reproducible 2400px JPEG, sized near 500KB. Each upload has a distinct URL;
 // no shared HTTP-cache entry can hide the 30-file acquisition cost.
 const jpeg=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1600;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(2400,1600);let seed=320;for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels.data[i]=seed&255;pixels.data[i+1]=(seed>>>8)&255;pixels.data[i+2]=(seed>>>16)&255;pixels.data[i+3]=255}ctx.putImageData(pixels,0,0);let low=.01,high=.95,result;for(let i=0;i<9;i++){const quality=(low+high)/2,data=atob(canvas.toDataURL('image/jpeg',quality).split(',')[1]);result=data;if(data.length>500000)high=quality;else low=quality}return Array.from(result,c=>c.charCodeAt(0))})
 const imageBytes=Buffer.from(jpeg);assert.ok(imageBytes.length>=400000&&imageBytes.length<=600000,'reference JPEG must be approximately 500KB')
 const media=[]
 for(let i=0;i<30;i++){const response=await context.request.post(app.origin+'/app/document-media',{headers:{origin:app.origin,accept:'application/json'},multipart:{id:proposal.id,version:'1',consent:'yes',file:{name:'synthetic-platter-'+(i+1)+'.jpg',mimeType:'image/jpeg',buffer:imageBytes}}});assert.equal(response.status(),200,await response.text());media.push((await response.json()).media.id)}
 const blocks=[]
 for(let n=1;n<=40;n++){
  blocks.push({id:'page-'+n,type:'text',title:'Reference page '+n,text:n===1?'The reference document begins here.':'A considered plan for the synthetic client, with clear deliverables and review. '.repeat(5)})
  if(n<=30)blocks.push({id:'image-'+n,type:'image',title:'Reference image '+n,text:'A retained reference image.',assetId:media[n-1],alt:'Synthetic reference image '+n})
  if(n>=31&&n<=34)blocks.push({id:'table-'+n,type:'pricing',title:'Reference pricing '+(n-30),text:'',optionId:'one',tableIndex:n-31})
  if(n<40)blocks.push({id:'break-'+n,type:'page_break',title:'',text:''})
 }
 await post('proposal.document',{id:proposal.id,version:1,document:{version:1,blocks}})
 report.reference={pages:40,images:30,imageWidth:2400,imageHeight:1600,imageBytes:imageBytes.length,tables:4,linesPerTable:15}
 const session=await context.newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:4})
 await page.goto(app.origin+'/app/proposal?id='+proposal.id,{waitUntil:'domcontentloaded'})
 const first=page.locator('[data-block-id="page-1"] textarea');await first.waitFor();assert.equal(await first.isEditable(),true)
 report.timeToEditableMs=await page.evaluate(()=>performance.now())
 const target=page.locator('[data-block-id="page-30"] textarea');await target.scrollIntoViewIfNeeded();await target.focus()
 await page.evaluate(()=>{
  window.budgetKeys=[];window.budgetEvents=[];window.budgetEventCount=performance.eventCounts.get('keydown')??0;
  window.budgetObserver=new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.name==='keydown')window.budgetEvents.push({start:entry.startTime,duration:entry.duration})});window.budgetObserver.observe({type:'event',durationThreshold:16});
  document.querySelector('[data-block-id="page-30"] textarea').addEventListener('keydown',event=>{if(event.key.length!==1)return;const sample={eventTime:event.timeStamp,start:performance.now(),paint:null};window.budgetKeys.push(sample);requestAnimationFrame(()=>requestAnimationFrame(()=>sample.paint=performance.now()))})
 })
 await target.pressSequentially('x'.repeat(200),{delay:20})
 await page.waitForFunction(()=>window.budgetKeys.length===200&&window.budgetKeys.every(s=>s.paint!==null))
 const keys=await page.evaluate(()=>({samples:window.budgetKeys,events:window.budgetEvents,eventCount:(performance.eventCounts.get('keydown')??0)-window.budgetEventCount}))
 assert.equal(keys.eventCount,200,'Event Timing counts all 200 real keydown events')
 // Event Timing omits events below its 16ms floor. The two-frame interval is
 // an independent conservative upper bound on the next paint, never a zero.
 const latencies=keys.samples.map(s=>{const event=keys.events.find(e=>Math.abs(e.start-s.eventTime)<1);return Math.max(s.paint-s.start,event?.duration??16)}).sort((a,b)=>a-b)
 report.keystrokes=200;report.eventTimingEntries=keys.events.length;report.keystrokeP95Ms=latencies[Math.ceil(latencies.length*.95)-1];report.keystrokeMaxMs=latencies.at(-1)
 report.keystrokeMethod='max(Event Timing duration, two-frame paint interval); unreported sub-16ms events bounded at 16ms'
 await page.waitForFunction(()=>document.querySelector('[data-document-editor]').dataset.saveState==='saved')
 const source=page.locator('[data-block-id="page-30"]'),previous=source.locator('xpath=preceding-sibling::*[1]'),before=await page.locator('[data-block-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.blockId)),previousId=await previous.getAttribute('data-block-id')
 await page.evaluate(()=>{window.budgetDrop=null;document.addEventListener('drop',()=>{const start=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>window.budgetDrop=performance.now()-start))},{capture:true,once:true})})
 // Start the native drag at the handle before crossing the tall document.
 // Two target moves let Chromium deliver dragover before the real mouse release.
 const handle=source.getByRole('button',{name:'Drag block',exact:true});await handle.hover();const start=await handle.boundingBox();assert.ok(start,'Drag handle is visible')
 await page.mouse.down();await page.mouse.move(start.x+start.width/2-12,start.y+start.height/2,{steps:4})
 await previous.locator('.document-block-bar').hover();await previous.locator('.document-block-bar').hover();await page.mouse.up()
 await page.waitForFunction(()=>window.budgetDrop!==null);report.dragReorderMs=await page.evaluate(()=>window.budgetDrop)
 const after=await page.locator('[data-block-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.blockId)),expected=before.filter(id=>id!=='page-30');expected.splice(expected.indexOf(previousId),0,'page-30');assert.deepEqual(after,expected)
 await page.waitForFunction(()=>document.querySelector('[data-document-editor]').dataset.saveState==='saved')
 const quantity=page.locator('[data-pricing-option="one"] [data-saved-line] [data-pricing-field="quantity"]').first();await quantity.scrollIntoViewIfNeeded()
 await page.evaluate(()=>{window.budgetQuantity=null;document.querySelector('[data-pricing-option="one"] [data-saved-line] [data-pricing-field="quantity"]').addEventListener('input',()=>{const start=performance.now(),output=document.querySelector('[data-pricing-confirmation]');const observer=new MutationObserver(()=>{if(!output.dataset.confirmedVersion)return;observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>window.budgetQuantity=performance.now()-start))});observer.observe(output,{attributes:true,attributeFilter:['data-confirmed-version']})},{once:true,capture:true})})
 await quantity.fill('2');await page.waitForFunction(()=>window.budgetQuantity!==null);report.quantityServerConfirmedMs=await page.evaluate(()=>window.budgetQuantity)
 assert.match(await page.locator('[data-pricing-confirmation]').innerText(),/server-confirmed total: \$6100\.00 USD/)
 let current=(await state()).proposals.find(p=>p.id===proposal.id);assert.equal(current.options[0].cents,610000)
 await post('proposal.approve',{id:current.id,version:current.version,revision:current.revision});current=(await state()).proposals.find(p=>p.id===proposal.id)
 const invitation=await post('proposal.send',{id:current.id,version:current.version}),path=new URL(invitation.shareUrl).pathname
 phoneContext=await browser.newContext({viewport:report.clientViewport});await phoneContext.addInitScript(()=>{window.budgetLcp=[];new PerformanceObserver(list=>window.budgetLcp.push(...list.getEntries().map(e=>e.startTime))).observe({type:'largest-contentful-paint',buffered:true})})
 const phone=await phoneContext.newPage(),phoneSession=await phoneContext.newCDPSession(phone);await phoneSession.send('Emulation.setCPUThrottlingRate',{rate:4})
 await phone.goto(app.origin+path+'?optionId=one',{waitUntil:'networkidle'});await phone.evaluate(()=>document.fonts.ready);await phone.waitForFunction(()=>window.budgetLcp.length>0)
 report.clientLcpMs=await phone.evaluate(()=>Math.max(...window.budgetLcp));report.lazyImages=await phone.locator('.document-image img').evaluateAll(images=>images.length===30&&images.every(image=>image.loading==='lazy'));assert.equal(report.lazyImages,true)
 await phone.getByRole('button',{name:'Send verification code',exact:true}).click();const code=(await state()).outbox.find(m=>m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0];await phone.getByLabel('Email verification code').fill(code);await phone.getByRole('button',{name:'Verify email',exact:true}).click()
 const pdf=await phoneContext.request.post(app.origin+path+'/download.pdf',{headers:{origin:app.origin},data:{optionId:'one'}});assert.equal(pdf.status(),200);const pages=await pdfPages(await pdf.body(),true);report.renderedPdfPages=pages.length;report.paper='US Letter';assert.equal(pages.length,40,'reference is forty actual US Letter PDF pages');assert.ok(pages.every(p=>p.width===612&&p.height===792),'every reference page is US Letter');report.pdfImages=pages.reduce((n,p)=>n+p.imageCount,0);assert.equal(report.pdfImages,30,'the PDF retains all thirty images')
 console.log(JSON.stringify(report,null,2))
 assert.ok(report.timeToEditableMs<=3000,'time to editable exceeds 3 seconds')
 assert.ok(report.keystrokeP95Ms<=100,'keystroke-to-paint p95 exceeds 100ms')
 assert.ok(report.dragReorderMs<=300,'drop-to-repaint exceeds 300ms')
 assert.ok(report.quantityServerConfirmedMs<=500,'server-confirmed quantity exceeds 500ms')
 assert.ok(report.clientLcpMs<=2500,'phone LCP exceeds 2.5 seconds')
 if(process.env.PLATTER_BUDGET_REPORT)await writeFile(process.env.PLATTER_BUDGET_REPORT,JSON.stringify(report,null,2)+'\n')
}finally{await phoneContext?.close();await context?.close();await browser?.close();await app?.close()}

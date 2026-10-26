import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { harness } from './harness.mjs'
import { forwardProviderRequest } from './provider-network.mjs'
import { signedDeposit, signSentDeposit, collectionMethodInheritance } from './collection-journey.mjs'

async function enterCard(frame,number){
 await frame.getByPlaceholder('1234 1234 1234 1234').fill(number)
 const country=frame.getByLabel('Country',{exact:true});if(await country.count()){await country.selectOption('US');await frame.getByPlaceholder('12345').fill('10001')}
 await frame.getByPlaceholder('MM / YY').fill('12 / 30');await frame.getByPlaceholder('CVC').fill('123')
}

async function payDeposit(page){
 const button=page.locator('[data-stripe-payment] button:not(:disabled)');await button.waitFor()
 await Promise.all([page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/payment-consent.json')&&r.status()===200),button.press('Enter')])
}

export async function collectionBrowser({real=false}={}){
 const key=process.env.STRIPE_SECRET_KEY,publishableKey=process.env.STRIPE_PUBLISHABLE_KEY,intents=new Map(),authenticationFailures=[]
 if(real)assert.ok(key?.startsWith('sk_test_')&&publishableKey?.startsWith('pk_test_'))
 let browser
 async function provider(path,fields){
  const response=await fetch('https://api.stripe.com/v1/'+path,{method:fields?'POST':'GET',headers:{authorization:'Bearer '+key,...(fields?{'content-type':'application/x-www-form-urlencoded'}:{})},...(fields?{body:new URLSearchParams(fields)}:{})}),value=await response.json()
  assert.ok(response.ok,'Stripe browser journey request succeeded');return value
 }
 const outboundService=async request=>{
  if(real){const response=await forwardProviderRequest(request);if(request.method==='POST'&&new URL(request.url).pathname==='/v1/payment_intents'&&response.ok){const v=await response.clone().json();intents.set(v.id,v)}return response}
  const url=new URL(request.url)
  if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-account'})
  if(url.pathname==='/v1/payment_intents'){
   const form=new URLSearchParams(await request.text()),id='synthetic-platter-'+intents.size,v={id,amount:Number(form.get('amount')),currency:'usd',status:'requires_payment_method',client_secret:'synthetic-platter-client',payment_method_types:['card'],metadata:{platter_proposal_id:form.get('metadata[platter_proposal_id]'),platter_revision:form.get('metadata[platter_revision]')}};intents.set(id,v);return Response.json(v)
  }
  return Response.json(intents.get(url.pathname.split('/').at(-1)))
 }
 const screenshots=process.env.PLATTER_SCREENSHOTS
 try{
  if(screenshots)await mkdir(screenshots,{recursive:true})
  browser=await chromium.launch({headless:true,args:['--use-mock-keychain','--password-store=basic']})
  for(const width of [1440,390]){
   const h=await harness({entry:'dist/server/index.js',assetsDirectory:'./dist/client',outboundService}),context=await browser.newContext({viewport:{width,height:900}})
   let page
   try{
    const [name,value]=h.owner.split('=');await context.addCookies([{name,value,url:h.origin}])
    page=await context.newPage()
    if(!real)await page.route('https://js.stripe.com/**',route=>route.abort())
    const capture=async name=>{
     await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow')
     if(screenshots){
      await page.screenshot({path:join(screenshots,`PAY-${name}-${width}.png`),fullPage:true})
      const panels=page.locator('section.panel').filter({has:page.getByRole('heading',{level:2,name:/^(Deposit collection|Card fee policy|Deposit status|Signature record|Agreement signed|Proposal accepted|Deposit due|Deposit paid|Payment authentication)/})})
      for(let index=0;index<await panels.count();index++)await panels.nth(index).screenshot({path:join(screenshots,`PAY-${name}-${width}-panel-${index}.png`)})
      const stripe=page.locator('article').filter({has:page.getByRole('heading',{name:'Stripe',exact:true})});if(await stripe.count())await stripe.screenshot({path:join(screenshots,`PAY-${name}-${width}-stripe.png`)})
     }
    }
    await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
    await page.goto(h.origin+'/app/settings');const feeForm=page.locator('form[action*="payment.surcharge"]');await feeForm.getByLabel('Card fee percent',{exact:true}).fill('3');await feeForm.getByLabel('Billing states where the fee is confirmed permitted').fill('CA, NY');await feeForm.getByLabel('Billing states where fees are prohibited').fill('NY');await feeForm.getByRole('checkbox').check();await feeForm.getByRole('button',{name:'Save card fee policy'}).click();await capture('settings')
    await h.cmd('provider.connect',{provider:'stripe',version:0,token:real?key:'synthetic-platter-1',publishableKey:real?publishableKey:'synthetic-platter-2',consent:true})
    for(const completion of ['required','due']){
     const p=await signedDeposit(h,completion,['card'],async draft=>{
      await page.goto(h.origin+'/app/proposal?id='+draft.id)
      const form=page.locator('form[action*="payment.collection"]');await form.locator('[name="completion"]').selectOption(completion);await form.getByRole('button',{name:'Save deposit collection'}).click();await capture(completion+'-configuration')
     }),cookie=p.cookie.split('=')
     await context.addCookies([{name:cookie[0],value:cookie[1],url:h.origin+p.path}])
     await page.goto(h.origin+'/app/proposal?id='+p.id);await capture(completion+'-owner')
     await page.goto(h.origin+p.path);assert.equal(await page.locator('[data-stripe-payment]').isVisible(),false,'Payment entry stays hidden until preparation');await capture(completion+'-signed')
     if(real){
      await page.locator('[data-collection] [name="consent"]').check();await page.getByRole('button',{name:'Continue to secure payment'}).click()
      await page.getByRole('button',{name:/Pay 600.00 USD deposit/}).waitFor();assert.equal(await page.getByRole('button',{name:/Pay 600.00 USD deposit/}).isDisabled(),true);await capture(completion+'-payment-entry')
      const frame=page.frameLocator('[data-payment-element] iframe').first()
      await enterCard(frame,completion==='required'?(width===1440?'4000000000000002':'4000000000009987'):(width===1440?'4000000000009995':'4000000000009979'))
      await payDeposit(page);await page.getByText(/declined|insufficient funds/i).first().waitFor();assert.equal(await page.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),completion==='due'?1:0);await capture(completion+'-declined')
      if(completion==='required'){
       await enterCard(frame,'4242424242424242');await payDeposit(page);await page.getByRole('heading',{name:'Deposit paid',exact:true}).waitFor();await capture('required-paid')
      }
     }else{
      const start=await h.send(p.path+'/payment.json',{method:'card',consent:'yes'},p.cookie);assert.equal(start.status,200)
      await page.reload();assert.match(await page.locator('main').innerText(),completion==='required'?/waiting for payment/:/Proposal accepted/);await capture(completion+'-declined')
      if(completion==='required'){
       const saved=await h.db.prepare('SELECT provider_intent,cents FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first(),v=intents.get(saved.provider_intent);await h.send(p.path+'/payment-consent.json',{consent:true,cents:saved.cents},p.cookie);v.status='succeeded';v.latest_charge={id:'synthetic-platter-charge-'+saved.provider_intent,amount:v.amount,currency:v.currency,status:'succeeded',paid:true}
       await page.getByRole('button',{name:'Refresh payment status'}).click();assert.equal(await page.getByRole('heading',{name:'Deposit paid',exact:true}).count(),1);assert.equal(await page.getByRole('heading',{name:'Proposal accepted',exact:true}).count(),1);await capture('required-paid')
      }
     }
    }
    const inheritance=await collectionMethodInheritance(h)
    for(const [label,draft,methods,version] of [['template',inheritance.source,['card','ach'],2],['blank',inheritance.blank,['card','apple_pay','google_pay','ach'],1]]){
     await h.cmd('payment.collection',{id:draft.id,version,completion:'due'})
     await h.cmd('proposal.approve',{id:draft.id,version:version+1,revision:1});const share=await h.cmd('proposal.send',{id:draft.id,version:version+2}),path=new URL(share.shareUrl).pathname
     const p=await signSentDeposit(h,draft.id,path,'due',methods),cookie=p.cookie.split('=');await context.addCookies([{name:cookie[0],value:cookie[1],url:h.origin+p.path}]);await page.goto(h.origin+p.path)
     assert.deepEqual(await page.locator('[data-collection] select option').evaluateAll(nodes=>nodes.map(n=>n.value)),methods)
     await capture(label+'-methods')
     if(label==='blank'){
      if(real){await page.locator('[data-collection] [name="billingState"]').fill('CA');await page.locator('[data-collection] [name="consent"]').check();await page.getByRole('button',{name:'Continue to secure payment'}).click();await page.waitForFunction(()=>Boolean(window.Stripe));const available=await page.evaluate(async publicKey=>await window.Stripe(publicKey).paymentRequest({country:'US',currency:'usd',total:{label:'Deposit',amount:60000}}).canMakePayment(),publishableKey);console.log('Wallet availability at '+width+': '+JSON.stringify(available))}
      const start=await h.send(p.path+'/payment.json',{method:'card',billingState:'CA',consent:'yes'},p.cookie);assert.equal(start.status,200);assert.equal(start.value.quote.feeCents,1800);await page.reload();assert.equal(await page.locator('dt').filter({hasText:'Card fee'}).count(),1);await capture('card-fee')
     }
    }
    if(real){
     console.log('PASS real native browser '+width+': required decline then success, due decline stays accepted, exact deposit and separate fee')
     try{
     const p=await signedDeposit(h),cookie=p.cookie.split('=');await context.addCookies([{name:cookie[0],value:cookie[1],url:h.origin+p.path}]);await page.goto(h.origin+p.path)
     await page.locator('[data-collection] [name="consent"]').check();await page.getByRole('button',{name:'Continue to secure payment'}).click()
     const frame=page.frameLocator('[data-payment-element] iframe').first()
     await enterCard(frame,'4000000000003220')
     await payDeposit(page)
     let authentication
     for(let attempt=0;attempt<80&&!authentication;attempt++){
      for(const challenge of page.frames()){const button=challenge.getByRole('button',{name:'Complete',exact:true});if(await button.isVisible().catch(()=>false)){authentication=button;break}}
      if(!authentication)await page.waitForTimeout(250)
     }
     assert.ok(authentication,'Stripe shows its test authentication completion button');await capture('3ds-challenge');await authentication.click()
     await page.getByRole('heading',{name:'Deposit paid',exact:true}).waitFor();await capture('3ds-paid');console.log('PASS real 3-D Secure completion at '+width)
     }catch(error){authenticationFailures.push(error);console.log('3-D Secure challenge incomplete at '+width+': '+error.name+' '+error.message);console.log('Authentication buttons: '+JSON.stringify((await Promise.all(page.frames().map(f=>f.getByRole('button').allTextContents().catch(()=>[])))).flat()));if(screenshots)await page.screenshot({path:join(screenshots,`PAY-3ds-failed-${width}.png`),fullPage:true})}
    }
   }catch(error){if(page)console.log('Payment diagnostics: '+JSON.stringify({form:await page.locator('[data-stripe-payment]').evaluateAll(forms=>forms.map(f=>({valid:f.checkValidity(),disabled:f.querySelector('button').disabled,buttonType:f.querySelector('button').type,buttonOwnsForm:f.querySelector('button').form===f}))),states:(await h.db.prepare('SELECT status,authorized_at IS NOT NULL AS authorized FROM p_collection_intents').all()).results}));if(screenshots&&page)await page.screenshot({path:join(screenshots,`PAY-failed-${width}.png`),fullPage:true}).catch(()=>{});throw error}finally{await context.close();await h.close()}
  }
  if(authenticationFailures.length)throw new AggregateError(authenticationFailures,'The real 3-D Secure challenges did not complete')
 }finally{
  await browser?.close()
  if(real)for(const id of intents.keys()){const value=await provider('payment_intents/'+id);if(value.status==='succeeded')await provider('refunds',{payment_intent:id});else if(value.status!=='canceled')await provider('payment_intents/'+id+'/cancel',{})}
 }
}
if(process.argv[1]?.endsWith('collection-browser.mjs'))await collectionBrowser({real:true})

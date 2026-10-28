import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { harness } from './harness.mjs'
import { browserEdge } from './browser-edge.mjs'

const locales=['es','fr','de','pt','en']
const paidHeadings={es:'Anticipo pagado',fr:'Acompte payé',de:'Anzahlung bezahlt',pt:'Sinal pago',en:'Deposit paid'}
const smsHeadings={es:'Verificar por SMS',fr:'Vérifier par SMS',de:'Per SMS bestätigen',pt:'Verificar por SMS',en:'Verify by text'}
const paymentPrefixes={es:'Autorizo',fr:'J’autorise',de:'Ich genehmige',pt:'Autorizo',en:'I authorize'}
const address=n=>'synthetic-platter-'+n+String.fromCharCode(64)+'example.test'
const offer={title:'Scope of work',scope:'Your full name — authored content stays exact.',terms:'Terms — written by the firm.',optionOne:'Studio essentials',priceOne:'2400',optionTwo:'Full campaign',priceTwo:'4200',depositPercent:'25'}
const screenshot=async(page,directory,name,width)=>{
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'provider flow fits the viewport')
 if(directory){await mkdir(directory,{recursive:true});await page.screenshot({path:join(directory,'EDIT-017-'+name+'-'+width+'.png'),fullPage:true})}
}
function checkCopy(text,locale,catalog){
 if(locale==='en')return
 for(const value of [...Object.values(offer),'Synthetic signer'])text=text.replaceAll(value,'')
 for(const key of catalog){const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');assert.ok(!new RegExp('(^|[^\\p{L}])'+escaped+'(?=$|[^\\p{L}])','u').test(text),'untranslated provider text '+locale+': '+key)}
}
async function prepare(h,clientId,locale,collection){
 const p=await h.cmd('proposal.prepare',{...offer,clientId})
 await h.cmd('proposal.locale',{id:p.id,version:1,locale})
 if(collection)await h.cmd('payment.collection',{id:p.id,version:2,completion:'required',paymentMethods:['card']})
 await h.cmd('proposal.approve',{id:p.id,version:collection?3:2,revision:1})
 const sent=await h.cmd('proposal.send',{id:p.id,version:collection?4:3})
 return {...p,path:new URL(sent.shareUrl).pathname,url:sent.shareUrl}
}
async function acceptPage(page){
 await page.locator('form#platter-acceptance input[name="optionId"][value="one"]').check()
 await page.locator('form#platter-acceptance input[name="name"]').fill('Synthetic signer')
 await page.locator('form#platter-acceptance input[name="consent"]').check()
 await page.locator('form#platter-acceptance button').first().click()
}
export async function localeProviderBrowser(width,browser,directory,catalog){
 let h,context,edge
 const intents=new Map()
 try{
  h=await harness({entry:'dist/server/index.js',assetsDirectory:'dist/client',outboundService:async request=>{
   const url=new URL(request.url)
   if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-locale-account'})
   if(url.pathname==='/v1/payment_intents'){
    const input=new URLSearchParams(await request.text()),id='synthetic-platter-'+intents.size
    const value={id,amount:Number(input.get('amount')),currency:'usd',status:'requires_payment_method',client_secret:'synthetic-platter-client',payment_method_types:['card'],metadata:{platter_proposal_id:input.get('metadata[platter_proposal_id]'),platter_revision:input.get('metadata[platter_revision]')}}
    intents.set(id,value);return Response.json(value)
   }
   return Response.json(intents.get(url.pathname.split('/').at(-1)))
  }})
  await h.cmd('provider.connect',{provider:'stripe',version:0,token:'synthetic-platter-9801',publishableKey:'synthetic-platter-9802',consent:true})
  await h.cmd('payment.surcharge',{version:0,percent:3,allowedStates:'CA',consent:true})
  const client=await h.cmd('client.save',{name:'Synthetic client',email:address(9800)})
  context=await browser.newContext({viewport:{width,height:900}})
  const [ownerName,ownerValue]=h.owner.split('=');await context.addCookies([{name:ownerName,value:ownerValue,url:h.origin}])
  const page=await context.newPage();await page.goto(h.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  let failLoad=true
  await page.exposeFunction('confirmSyntheticDeposit',()=>{
   const value=[...intents.values()].at(-1);value.status='succeeded';value.latest_charge={id:'synthetic-platter-charge-'+value.id,amount:value.amount,currency:'usd',paid:true,status:'succeeded'}
  })
  await page.route('https://js.stripe.com/**',async route=>{
   if(failLoad){failLoad=false;return route.abort()}
   return route.fulfill({contentType:'text/javascript',body:`window.Stripe=()=>({elements:options=>{window.syntheticStripeLocale=options.locale;return {create:()=>({on:(_name,callback)=>callback({complete:true}),mount:selector=>{const label={es:'Datos de tarjeta',fr:'Données de carte',de:'Kartendaten','pt-BR':'Dados do cartão',en:'Card details'}[options.locale];document.querySelector(selector).textContent=label;}})}},confirmPayment:async()=>{await window.confirmSyntheticDeposit();return {}}});`})
  })
  for(const locale of locales){
   const p=await prepare(h,client.id,locale,true)
   await page.goto(p.url)
   await page.locator('form[action*="name=code.request"] button').click()
   const message=(await h.state()).outbox.find(m=>m.proposal_id===p.id&&/\b\d{6}\b/.test(m.body))
   await page.locator('input[name="code"]').fill(message.body.match(/\b\d{6}\b/)[0]);await page.locator('form[action*="name=code.verify"] button').click()
   checkCopy(await page.locator('body').innerText(),locale,catalog)
   await acceptPage(page)
   assert.equal(await page.locator('html').getAttribute('lang'),locale)
   checkCopy(await page.locator('body').innerText(),locale,catalog)
   await page.locator('[data-collection] input[name="billingState"]').fill('CA')
   await page.locator('[data-collection] input[name="consent"]').check();await page.locator('[data-collection] button').click()
   if(locale==='es'){
    await page.locator('[data-payment-feedback]').filter({hasText:'No se pudo cargar el pago seguro'}).waitFor()
    assert.equal((await h.db.prepare('SELECT count(*) n FROM p_payment_records WHERE proposal_id=?').bind(p.id).first()).n,0)
    await screenshot(page,directory,'payment-load-refused-'+locale,width)
    await page.locator('[data-collection] button').click()
   }
   await page.locator('[data-stripe-payment]').waitFor({state:'visible'})
   assert.equal(await page.evaluate(()=>window.syntheticStripeLocale),locale==='pt'?'pt-BR':locale)
   const payment=(await h.db.prepare('SELECT * FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first())
   assert.equal(payment.deposit_cents,60000);assert.equal(payment.fee_cents,1800);assert.equal(payment.cents,61800)
   assert.ok(payment.authorization.startsWith(paymentPrefixes[locale]));assert.ok(payment.authorization.includes(offer.title),'authored title stays exact in payment authorization')
   const cookies=await context.cookies(p.url),cookie='platter_client='+cookies.find(c=>c.name==='platter_client').value
   assert.equal((await h.send(p.path+'/payment-consent.json',{consent:true,cents:1},cookie)).status,400)
   assert.equal((await h.db.prepare('SELECT authorized_at FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first()).authorized_at,null)
   checkCopy(await page.locator('body').innerText(),locale,catalog)
   await screenshot(page,directory,'payment-review-'+locale,width)
   await page.locator('[data-stripe-payment] button').click()
   await page.getByRole('heading',{name:paidHeadings[locale],exact:true}).waitFor({timeout:10000}).catch(async error=>{console.log('Payment failure '+locale+': '+await page.locator('[data-payment-feedback]').innerText());console.log(JSON.stringify((await h.db.prepare('SELECT status,authorized_at FROM p_collection_intents').all()).results));throw error})
   assert.equal((await h.db.prepare('SELECT count(*) n FROM p_collection_intents WHERE proposal_id=?').bind(p.id).first()).n,1,'load retry reuses the same intent')
   assert.equal((await h.db.prepare('SELECT cents FROM p_payment_records WHERE proposal_id=?').bind(p.id).first()).cents,61800)
   checkCopy(await page.locator('body').innerText(),locale,catalog)
   const facts=await h.send(p.path+'/certificate.json',undefined,cookie);assert.equal(facts.status,200);assert.equal(facts.value.language,locale)
   await screenshot(page,directory,'payment-complete-'+locale,width)
  }
  await context.close();context=null;await h.close();h=null
  edge=await browserEdge();const texts=[]
  h=await harness({entry:'dist/server/index.js',origin:edge.origin,assetsDirectory:'dist/client',auth:{AUTH_LOCAL:'false',MAIL_PROVIDER:'resend',MAIL_API_KEY:'synthetic-platter-9810',TWILIO_ACCOUNT_SID:'synthetic-platter-9811',TWILIO_AUTH_TOKEN:'synthetic-platter-9812',TWILIO_FROM:'+15005550006'},outboundService:async request=>{
   if(new URL(request.url).hostname==='api.twilio.com'){texts.push(Object.fromEntries(new URLSearchParams(await request.text())));return Response.json({sid:'synthetic-platter-9813'},{status:201})}
   return Response.json({id:'synthetic-platter-9814'})
  }})
  edge.attach(h)
  const finish=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(finish.status,303)
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-01T12:00:00Z'),cron:'*/15 * * * *'})
  const smsClient=await h.cmd('client.save',{name:'Synthetic client',email:address(9820)})
  context=await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true});const smsPage=await context.newPage()
  for(const locale of locales){
   const p=await prepare(h,smsClient.id,locale,false),row=(await h.state()).proposals.find(r=>r.id===p.id)
   await h.cmd('sms.configure',{id:p.id,version:row.version,consent:true,phone:'+12025550129',timeZone:'Etc/UTC',evidence:'synthetic-platter-9821'})
   await h.cmd('signer.method',{id:p.id,version:row.version,method:'SMS code'})
   await smsPage.goto(p.url);await smsPage.getByRole('heading',{name:smsHeadings[locale],exact:true}).waitFor()
   checkCopy(await smsPage.locator('body').innerText(),locale,catalog)
   await smsPage.locator('form[action*="name=code.request"] button').click()
   const text=texts.at(-1).Body
   assert.ok(text.includes('STOP')&&text.includes('HELP'));if(locale!=='en')assert.ok(!text.includes('Your Platter verification code'))
   await screenshot(smsPage,directory,'sms-code-'+locale,width)
   await smsPage.locator('input[name="code"]').fill(text.match(/\b\d{6}\b/)[0]);await smsPage.locator('form[action*="name=code.verify"] button').click()
   await acceptPage(smsPage)
   const clientCookie=(await context.cookies(p.url)).find(c=>c.name==='platter_client')
   const facts=await h.send(p.path+'/certificate.json',undefined,'platter_client='+clientCookie.value);assert.equal(facts.status,200);assert.equal(facts.value.language,locale);assert.equal(facts.value.signers[0].method,'SMS code')
   checkCopy(await smsPage.locator('body').innerText(),locale,catalog)
   await screenshot(smsPage,directory,'sms-complete-'+locale,width)
  }
 }finally{await context?.close();await h?.close();await edge?.close()}
}

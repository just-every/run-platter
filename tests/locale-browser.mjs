import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { installedApp } from './site-harness.mjs'

export async function localeBrowser(width=1440) {
 let app,browser,context
 try {
  app=await installedApp()
  browser=await chromium.launch({headless:true,executablePath:process.env.PLATTER_CHROMIUM,args:['--no-sandbox','--use-mock-keychain','--password-store=basic']})
  context=await browser.newContext({viewport:{width,height:900},locale:'fr-FR'})
  const page=await context.newPage(),request=context.request,headers={origin:app.origin}
  const screenshots=process.env.PLATTER_SCREENSHOTS
  if(screenshots)await mkdir(screenshots,{recursive:true})
  const capture=async name=>{
   await page.evaluate(()=>document.fonts.ready)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'client document fits the viewport')
   if(screenshots)await page.screenshot({path:join(screenshots,'EDIT-017-'+name+'-'+width+'.png'),fullPage:true})
  }
  const cmd=async(name,input)=>{const r=await request.post(app.origin+'/api/platter/command',{headers,data:{name,input}});assert.equal(r.status(),200,await r.text());return r.json()}
  assert.equal((await request.post(app.origin+'/auth/bootstrap',{headers,data:{token:app.token,displayName:'Synthetic firm owner'},maxRedirects:0})).status(),303)
  await page.goto(app.origin+'/setup');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Finish setup'}).click()
  const client=await cmd('client.save',{name:'Synthetic client',email:'synthetic-platter-9711'+String.fromCharCode(64)+'example.test'})
  const authored={title:'Scope of work',scope:'Your full name — firm-authored English remains verbatim.',terms:'Terms — reviewed and approved by the firm.',optionOne:'Studio essentials',optionTwo:'Full campaign'}
  const signatureTitle='Your proposal: firma autorizada',signatureText='Your full name is firm-authored content.'
  const p=await cmd('proposal.prepare',{...authored,clientId:client.id,priceOne:'2400',priceTwo:'4200',depositPercent:'25',document:{version:1,blocks:[{id:'client-signature',type:'signature',title:signatureTitle,text:signatureText,recipientRole:'client'}]}})
  await page.goto(app.origin+'/app/settings')
  const settings=page.locator('details').filter({has:page.getByText(authored.title,{exact:true})})
  await settings.locator('summary').click();await settings.getByLabel('Client language').selectOption('es');await capture('owner-language')
  await settings.getByRole('button',{name:'Save client language'}).click()
  await cmd('proposal.approve',{id:p.id,version:2,revision:1})
  await page.goto(app.origin+'/app/proposal?id='+p.id)
  assert.equal(await page.getByLabel('Invitation subject',{exact:true}).inputValue(),'Su propuesta: '+authored.title)
  assert.equal(await page.getByLabel('Invitation message',{exact:true}).inputValue(),'Revise su propuesta y verifique su correo electrónico antes de aceptarla:')
  await page.getByRole('button',{name:'Send this invitation',exact:true}).click()
  const sent=await (await request.get(app.origin+'/api/platter/state')).json(),row=sent.proposals.find(r=>r.id===p.id)
  const path='/p/'+row.shareToken
  // A catalog check applies only to system text: authored interpolations remain exact.
  const catalog=[...(await readFile('src/platter/locales.ts','utf8')).matchAll(/^ '([^']+)': '([^']+)',?$/gm)].filter(([,en,es])=>en!==es).map(([,en])=>en.trim()).filter(key=>key.length>6)
  const spanishScreen=async()=>{
   assert.equal(await page.locator('html').getAttribute('lang'),'es')
   let text=await page.locator('body').innerText()
   for(const value of [...Object.values(authored),signatureTitle,signatureText])text=text.replaceAll(value,'')
   for(const key of catalog)assert.ok(!text.includes(key),'untranslated system text: '+key)
   for(const value of Object.values(authored))assert.ok((await page.locator('body').innerText()).includes(value),'authored content stays verbatim: '+value)
  }
  await page.goto(app.origin+path);await spanishScreen();await capture('invitation')
  await cmd('tracking.settings',{enabled:'yes',alerts:'no',retentionDays:90,quietMinutes:30,consent:'yes'})
  await page.reload();assert.match(await page.locator('main').innerText(),/No se almacena la dirección IP completa/);await spanishScreen();await capture('tracking-disclosure')
  await page.getByRole('button',{name:'Enviar código de verificación',exact:true}).click();await spanishScreen();await capture('code-requested')
  const outbox=(await (await request.get(app.origin+'/api/platter/state')).json()).outbox,mail=outbox.find(m=>m.subject==='Su código de verificación de Platter'),code=mail.body.match(/\b\d{6}\b/)[0]
  const wrong=code==='000000'?'000001':'000000'
  await page.getByLabel('Código de verificación por correo electrónico').fill(wrong);await page.getByRole('button',{name:'Verificar correo electrónico',exact:true}).click()
  assert.match(await page.getByRole('alert').innerText(),/Código de verificación incorrecto/);await spanishScreen();await capture('wrong-code')
  await page.getByLabel('Código de verificación por correo electrónico').fill(code);await page.getByRole('button',{name:'Verificar correo electrónico',exact:true}).click()
  await spanishScreen();await capture('verified')
  await page.getByLabel('Su pregunta',{exact:true}).fill('Una pregunta de la persona invitada.')
  await page.getByRole('button',{name:'Enviar pregunta al propietario',exact:true}).click()
  assert.match(await page.getByRole('status').first().innerText(),/Pregunta enviada al propietario/)
  assert.match(await page.locator('main').innerText(),/Abierta/);await spanishScreen();await capture('question')
  await page.getByRole('radio',{name:/Full campaign/}).check();await page.getByLabel('Su nombre completo',{exact:true}).fill('Avery Chen')
  await page.getByLabel('Escriba su nombre completo para Your proposal: firma autorizada',{exact:true}).fill('Avery Chen')
  const consent=page.getByRole('checkbox',{name:/Acepto el alcance del trabajo/})
  await consent.check();const shownConsent=(await consent.locator('..').innerText()).trim();await capture('consent')
  await page.getByRole('button',{name:'Aceptar propuesta',exact:true}).click()
  assert.equal(await page.getByRole('heading',{name:'Propuesta aceptada',exact:true}).count(),1)
  await spanishScreen();await capture('accepted')
  const certificate=await request.get(app.origin+path+'/certificate.json');assert.equal(certificate.status(),200)
  const facts=await certificate.json();assert.equal(facts.language,'es');assert.equal(facts.signers[0].language,'es');assert.equal(facts.signers[0].consent,shownConsent)
 } finally {await context?.close();await browser?.close();await app?.close()}
}

import { localeProviderBrowser } from './locale-providers.mjs'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import ts from 'typescript'
import { installedApp } from './site-harness.mjs'
import { recurringFixture } from './recurring-journey.mjs'
import { configureTaxes, taxPackages, taxRequest, taxTables } from './taxes-fixture.mjs'

async function englishClientCopy() {
 const words=new Set()
 for(const file of ['client','shell','shared','expiry','questions','attachments','paper','suggestions','packages','pricing','payment-terms','blocks','collection','recipients','electronic-records','../electronic-records-text','../tracking/stakeholders']) {
  const source=ts.createSourceFile(file,await readFile('./src/platter/ui/'+file+'.ts','utf8'),ts.ScriptTarget.Latest,true)
  const collect=node=>{
   if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node)) {
    for(const part of node.text.replace(/<[^>]*(?:>|$)/g,'\0').split('\0')) {
     const text=part.replace(/^[\s"'<>/=]+|[\s"'<>/=]+$/g,'').trim()
     if(text.length>=4&&!['Platter','Total','Apple Pay','Google Pay'].includes(text)&&(/[A-Z][a-z]{3}/.test(text)||/[a-z]{3} [a-z]{3}/.test(text)))words.add(text)
    }
   }
   ts.forEachChild(node,collect)
  }
  if(file==='recipients'){for(const statement of source.statements)if(ts.isFunctionDeclaration(statement)&&statement.name?.text==='recipientClientPanel')collect(statement)}else collect(source)
 }
 return [...words]
}

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
  await page.goto(app.origin+'/app/preview/client?id='+p.id+'&revision=1')
  assert.equal(await page.locator('html').getAttribute('lang'),'es')
  assert.equal(await page.getByRole('heading',{name:'Privacidad de las visitas',exact:true}).count(),1)
  assert.equal(await page.getByRole('button',{name:'Aceptar propuesta',exact:true}).isDisabled(),true)
  await capture('owner-preview')
  await cmd('proposal.approve',{id:p.id,version:2,revision:1})
  await page.goto(app.origin+'/app/proposal?id='+p.id)
  assert.equal(await page.getByLabel('Invitation subject',{exact:true}).inputValue(),'Su propuesta: '+authored.title)
  assert.equal(await page.getByLabel('Invitation message',{exact:true}).inputValue(),'Revise su propuesta y verifique su correo electrónico antes de aceptarla:')
  await page.getByRole('button',{name:'Send this invitation',exact:true}).click()
  const sent=await (await request.get(app.origin+'/api/platter/state')).json(),row=sent.proposals.find(r=>r.id===p.id)
  const path='/p/'+row.shareToken
  // A catalog check applies only to system text: authored interpolations remain exact.
  // Read the English reference at its rendering sites, independently of the
  // translation catalog, so a missing translation cannot remove its own check.
  const catalog=await englishClientCopy()
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
  await page.getByRole('button',{name:'Retirar consentimiento electrónico',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:'Aceptar propuesta',exact:true}).count(),0)
  await spanishScreen();await capture('electronic-consent-withdrawn')
  await page.getByRole('button',{name:'Solicitar copia en papel',exact:true}).click()
  const notices=(await (await request.get(app.origin+'/api/platter/state')).json()).electronicRequests
  assert.equal(notices[0].kind,'paper');assert.equal(notices[0].proposal_id,p.id)
  await spanishScreen();await capture('paper-requested')
  await page.getByRole('button',{name:'Volver a consentir electrónicamente',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:'Aceptar propuesta',exact:true}).count(),1)

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
  for(const kind of ['recurring','tax']) {
   if(kind==='tax')await configureTaxes(cmd)
   const input=kind==='recurring'?recurringFixture():{packages:taxPackages(),pricingTables:taxTables(),tax:taxRequest(),paymentTerms:{netDays:15,milestones:[{label:'Entrega aprobada',event:'Firm event',percent:100}]}}
   const next=await cmd('proposal.prepare',{...authored,...input,clientId:client.id,depositPercent:'25'})
   await cmd('proposal.locale',{id:next.id,version:1,locale:'es'})
   await cmd('proposal.approve',{id:next.id,version:2,revision:1})
   const invitation=await cmd('proposal.send',{id:next.id,version:3})
   await page.goto(invitation.shareUrl+(kind==='recurring'?'?optionId=two':''))
   assert.equal(await page.locator('html').getAttribute('lang'),'es')
   const text=await page.locator('main').innerText()
   assert.match(text,kind==='recurring'?/Total de pago único: USD 2,500.00/:/Impuesto sobre las ventas: USD 82.50/)
   if(kind==='recurring'){assert.match(text,/USD 1,200.00 por mes/);assert.match(text,/Valor del primer año: USD 16,900.00/)}
   else {assert.match(text,/Dirección fiscal \(servicio\)/);assert.match(text,/Austin ciudad/)}
   const controls=await page.locator('h2,h3,button,label').allTextContents()
   for(const control of controls)for(const key of catalog)assert.ok(!control.includes(key),'untranslated summary control: '+key)
   await capture(kind+'-summary')
   await page.getByRole('button',{name:'Enviar código de verificación',exact:true}).click()
   const messages=(await (await request.get(app.origin+'/api/platter/state')).json()).outbox
   const code=messages.find(m=>m.proposal_id===next.id&&m.subject==='Su código de verificación de Platter').body.match(/\b\d{6}\b/)[0]
   await page.getByLabel('Código de verificación por correo electrónico').fill(code);await page.getByRole('button',{name:'Verificar correo electrónico',exact:true}).click()
   await page.getByLabel('Su nombre completo',{exact:true}).fill('Avery Chen')
   const checkbox=page.getByRole('checkbox',{name:/Acepto el alcance del trabajo/})
   await checkbox.check();const actualConsent=(await checkbox.locator('..').innerText()).trim()
   await page.getByRole('button',{name:'Aceptar propuesta',exact:true}).click()
   assert.equal(await page.getByRole('heading',{name:'Propuesta aceptada',exact:true}).count(),1)
   const completed=await request.get(new URL(invitation.shareUrl).origin+new URL(invitation.shareUrl).pathname+'/certificate.json')
   assert.equal(completed.status(),200)
   const receipt=await completed.json();assert.equal(receipt.language,'es');assert.equal(receipt.signers[0].consent,actualConsent)
  }

  for(const [locale,language,heading,requestLabel,codeLabel,verifyLabel,nameLabel,acceptLabel,acceptedHeading,subject] of [
   ['fr','fr','Vérifiez votre adresse e-mail','Envoyer le code de vérification','Code de vérification par e-mail','Vérifier l’adresse e-mail','Votre nom complet','Accepter la proposition','Proposition acceptée','Votre code de vérification Platter'],
   ['de','de','Bestätigen Sie Ihre E-Mail-Adresse','Bestätigungscode senden','E-Mail-Bestätigungscode','E-Mail-Adresse bestätigen','Ihr vollständiger Name','Angebot annehmen','Angebot angenommen','Ihr Platter-Bestätigungscode'],
   ['pt','pt','Verifique seu e-mail','Enviar código de verificação','Código de verificação por e-mail','Verificar e-mail','Seu nome completo','Aceitar proposta','Proposta aceita','Seu código de verificação do Platter'],
   ['auto','fr','Vérifiez votre adresse e-mail','Envoyer le code de vérification','Code de vérification par e-mail','Vérifier l’adresse e-mail','Votre nom complet','Accepter la proposition','Proposition acceptée','Votre code de vérification Platter'],
  ]){
   const next=await cmd('proposal.prepare',{...authored,clientId:client.id,priceOne:'2400',priceTwo:'4200',depositPercent:'25'})
   await cmd('proposal.locale',{id:next.id,version:1,locale})
   await cmd('proposal.approve',{id:next.id,version:2,revision:1})
   const invitation=await cmd('proposal.send',{id:next.id,version:3}),url=new URL(invitation.shareUrl)
   const untranslated=async()=>{
    assert.equal(await page.locator('html').getAttribute('lang'),language)
    let text=await page.locator('body').innerText()
    for(const value of [...Object.values(authored),'Synthetic signer'])text=text.replaceAll(value,'')
    for(const key of catalog)assert.ok(!text.includes(key),'untranslated '+language+' system text: '+key)
    assert.ok((await page.locator('main').innerText()).includes(authored.scope))
   }
   await page.goto(invitation.shareUrl);assert.equal(await page.getByRole('heading',{name:heading,exact:true}).count(),1)
   await untranslated();await capture(locale+'-invitation')
   await page.getByRole('button',{name:requestLabel,exact:true}).click()
   const messages=(await (await request.get(app.origin+'/api/platter/state')).json()).outbox
   const code=messages.find(m=>m.proposal_id===next.id&&m.subject===subject).body.match(/\b\d{6}\b/)[0]
   await page.getByLabel(codeLabel,{exact:true}).fill(code);await page.getByRole('button',{name:verifyLabel,exact:true}).click()
   await untranslated();await capture(locale+'-consent')
   await page.getByRole('radio',{name:/Full campaign/}).check();await page.getByLabel(nameLabel,{exact:true}).fill('Synthetic signer')
   const checkbox=page.locator('input[name="consent"]');await checkbox.check()
   const shownConsent=(await checkbox.locator('..').innerText()).trim()
   await page.getByRole('button',{name:acceptLabel,exact:true}).click()
   assert.equal(await page.getByRole('heading',{name:acceptedHeading,exact:true}).count(),1)
   await untranslated();await capture(locale+'-accepted')
   const certificate=await request.get(url.origin+url.pathname+'/certificate.json');assert.equal(certificate.status(),200)
   const facts=await certificate.json();assert.equal(facts.language,language);assert.equal(facts.signers[0].language,language);assert.equal(facts.signers[0].consent,shownConsent)
  }

  const multi=await cmd('proposal.prepare',{...authored,clientId:client.id,priceOne:'2400',priceTwo:'4200',depositPercent:'25'})
  const email=n=>'synthetic-platter-'+n+String.fromCharCode(64)+'example.test'
  const recipients=[{id:'ceo',name:'Synthetic CEO',email:email(9791),role:'signer',group:1},{id:'cfo',name:'Synthetic CFO',email:email(9792),role:'signer',group:2},{id:'approver',name:'Synthetic approver',email:email(9793),role:'approver',group:2},{id:'owner',name:'Synthetic owner',email:'owner'+String.fromCharCode(64)+'northstar.example',role:'countersigner',group:3},{id:'viewer',name:'Synthetic viewer',email:email(9794),role:'viewer',group:1}]
  await cmd('recipient.save',{id:multi.id,version:1,recipients})
  for(const [index,[id,locale]] of [['ceo','es'],['cfo','fr'],['approver','pt'],['viewer','de']].entries())await cmd('proposal.locale',{id:multi.id,version:index+2,recipientId:id,locale})
  await cmd('proposal.approve',{id:multi.id,version:6,revision:2})
  await page.goto(app.origin+'/app/proposal?id='+multi.id)
  await page.getByRole('button',{name:'Send recipient-language defaults',exact:true}).click()
  const stateAfterSend=await (await request.get(app.origin+'/api/platter/state')).json(),issued=stateAfterSend.proposals.find(r=>r.id===multi.id)
  assert.equal(issued.status,'sent')
  const links=Object.fromEntries(issued.recipientLinks.map(r=>[r.slot_id,app.origin+'/p/'+r.token]))
  const shared=await cmd('recipient.share',{id:multi.id,version:issued.version,recipientName:'Synthetic shared viewer',recipientEmail:email(9795),locale:'es',shareConsent:true,embedOrigin:app.origin})
  const deniedEmbed=await request.get(links.viewer+'?embed=1');assert.equal(deniedEmbed.status(),403)
  await page.route(app.origin+'/synthetic-embed',route=>route.fulfill({contentType:'text/html',body:'<iframe src="'+shared.embedUrl+'" title="Synthetic embedded proposal" style="width:100%;height:850px;border:0"></iframe>'}))
  await page.goto(app.origin+'/synthetic-embed')
  const frame=page.frameLocator('iframe')
  const [embeddedCode]=await Promise.all([page.waitForResponse(r=>r.url().includes('name=code.request')&&r.request().method()==='POST'),frame.getByRole('button',{name:'Enviar código de verificación',exact:true}).click()]);assert.equal(embeddedCode.status(),200,await embeddedCode.text())
  const sharedMail=(await (await request.get(app.origin+'/api/platter/state')).json()).outbox.find(m=>m.proposal_id===multi.id&&m.recipient===email(9795)&&/\b\d{6}\b/.test(m.body))
  await frame.getByLabel('Código de verificación por correo electrónico').fill(sharedMail.body.match(/\b\d{6}\b/)[0]);await frame.getByRole('button',{name:'Verificar correo electrónico',exact:true}).click()
  await frame.getByRole('heading',{name:'Su rol de destinatario',exact:true}).waitFor();assert.equal(await frame.locator('html').getAttribute('lang'),'es');assert.ok((await frame.locator('body').innerText()).includes(authored.scope))
  assert.equal(await frame.locator('form#platter-acceptance').count(),0)
  await capture('embedded-spanish-viewer')
  assert.equal((await request.post(shared.shareUrl+'/action?name=accept',{headers,data:{name:'Synthetic viewer',optionId:'one',consent:true}})).status(),403)
  await cmd('recipient.remove',{id:multi.id,version:issued.version+1,recipientId:shared.recipientId})
  const removed=await request.get(shared.shareUrl);assert.equal(removed.status(),410);assert.ok(!(await removed.text()).includes(authored.scope));assert.match(await removed.text(),/<html lang="es">/)
  for(const [id,prefix] of [['ceo','Su propuesta: '],['cfo','Votre proposition : '],['approver','Sua proposta: '],['viewer','Ihr Angebot: '],['owner','Your proposal: ']]){
   const mail=stateAfterSend.outbox.find(m=>m.proposal_id===multi.id&&m.recipient===recipients.find(r=>r.id===id).email)
   assert.equal(mail.subject,prefix+authored.title)
  }
  const recipientSettings=[
   ['viewer','de','Bestätigungscode senden','E-Mail-Bestätigungscode','E-Mail-Adresse bestätigen','Ihre Empfängerrolle'],
   ['cfo','fr','Envoyer le code de vérification','Code de vérification par e-mail','Vérifier l’adresse e-mail','Votre rôle de destinataire'],
   ['approver','pt','Enviar código de verificação','Código de verificação por e-mail','Verificar e-mail','Sua função de destinatário'],
   ['ceo','es','Enviar código de verificación','Código de verificación por correo electrónico','Verificar correo electrónico','Su rol de destinatario'],
   ['owner','en','Send verification code','Email verification code','Verify email','Your recipient role'],
  ]
  for(const [id,locale,sendCode,codeLabel,verifyCode,roleHeading] of recipientSettings){
   await page.goto(links[id]);assert.equal(await page.locator('html').getAttribute('lang'),locale)
   assert.ok(!(await page.locator('body').innerText()).includes(authored.scope),'personal invitations reveal no offer before verification')
   await page.getByRole('button',{name:sendCode,exact:true}).click()
   const messages=(await (await request.get(app.origin+'/api/platter/state')).json()).outbox
   const mail=messages.find(m=>m.proposal_id===multi.id&&m.recipient===recipients.find(r=>r.id===id).email&&/\b\d{6}\b/.test(m.body))
   await page.getByLabel(codeLabel,{exact:true}).fill(mail.body.match(/\b\d{6}\b/)[0]);await page.getByRole('button',{name:verifyCode,exact:true}).click()
   assert.equal(await page.getByRole('heading',{name:roleHeading,exact:true}).count(),1)
   if(locale!=='en'){
    let text=await page.locator('body').innerText()
    for(const value of [...Object.values(authored),...recipients.map(r=>r.name)])text=text.replaceAll(value,'')
    for(const english of catalog){const escaped=english.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');assert.ok(!new RegExp('(^|[^\\p{L}])'+escaped+'(?=$|[^\\p{L}])','u').test(text),'recipient interface translated: '+english)}
   }
   if(id==='viewer'){
    assert.equal(await page.locator('form#platter-acceptance').count(),0)
    const refused=await request.post(links[id]+'/action?name=accept',{headers,data:{name:'Synthetic viewer',optionId:'one',consent:true}});assert.equal(refused.status(),403)
   }
   if(id==='cfo')assert.equal(await page.locator('form#platter-acceptance').count(),0,'later signer has no signing form')
   await capture('recipient-'+id)
  }
  for(const [id,nameLabel,button] of [['ceo','Su nombre completo','Aceptar propuesta'],['cfo','Votre nom complet','Accepter la proposition'],['approver','Seu nome completo','Aprovar versão do cliente'],['owner','Your full name','Accept proposal']]){
   await page.goto(links[id]);await page.getByLabel(nameLabel,{exact:true}).fill('Synthetic '+id)
   if(id!=='approver')await page.getByRole('radio',{name:/Studio essentials/}).check()
   await page.locator('form#platter-acceptance input[name="consent"]').check()
   await page.getByRole('button',{name:button,exact:true}).click()
  }
  const multiCertificate=await request.get(links.owner+'/certificate.json');assert.equal(multiCertificate.status(),200)
  const multiFacts=await multiCertificate.json();assert.deepEqual(multiFacts.signers.map(s=>s.language),['es','fr','pt','en'])
  const completedMail=(await (await request.get(app.origin+'/api/platter/state')).json()).outbox.filter(m=>m.proposal_id===multi.id)
  for(const [id,prefix] of [['ceo','Acuerdo completo: '],['cfo','Accord terminé : '],['approver','Acordo concluído: '],['viewer','Vertrag abgeschlossen: '],['owner','Agreement complete: ']]){
   assert.ok(completedMail.some(m=>m.recipient===recipients.find(r=>r.id===id).email&&m.subject===prefix+authored.title),'completion mail follows '+id+' language')
  }
  await capture('recipient-completion')
  const correction=await cmd('proposal.prepare',{...authored,clientId:client.id,priceOne:'2400',priceTwo:'4200',depositPercent:'25'})
  await cmd('proposal.locale',{id:correction.id,version:1,locale:'es'});await cmd('proposal.approve',{id:correction.id,version:2,revision:1})
  const original=await cmd('proposal.send',{id:correction.id,version:3})
  await page.goto(original.shareUrl);await capture('replacement-original')
  await page.goto(app.origin+'/app/proposal?id='+correction.id)
  const replacementForm=page.locator('form[action*="signer.replace"]')
  await replacementForm.locator('input[name="recipient"]').fill(email(9796));await replacementForm.locator('input[name="reason"]').fill('Synthetic mailbox correction')
  await replacementForm.locator('select[name="locale"]').selectOption('fr')
  await replacementForm.getByRole('button',{name:'Replace using recipient-language defaults',exact:true}).click()
  await page.locator('.notice a[href*="/p/"]').waitFor()
  const freshLink=await page.locator('.notice a[href*="/p/"]').getAttribute('href')
  assert.equal((await request.get(original.shareUrl)).status(),410)
  await page.goto(freshLink);assert.equal(await page.locator('html').getAttribute('lang'),'fr')
  await page.getByRole('button',{name:'Envoyer le code de vérification',exact:true}).click()
  const replacementMail=(await (await request.get(app.origin+'/api/platter/state')).json()).outbox.find(m=>m.proposal_id===correction.id&&m.subject==='Votre code de vérification Platter')
  await page.getByLabel('Code de vérification par e-mail').fill(replacementMail.body.match(/\b\d{6}\b/)[0]);await page.getByRole('button',{name:'Vérifier l’adresse e-mail',exact:true}).click()
  await page.getByRole('radio',{name:/Studio essentials/}).check();await page.getByLabel('Votre nom complet',{exact:true}).fill('Synthetic replacement')
  await page.locator('form#platter-acceptance input[name="consent"]').check();await page.getByRole('button',{name:'Accepter la proposition',exact:true}).click()
  assert.equal(await page.getByRole('heading',{name:'Proposition acceptée',exact:true}).count(),1)
  const replacementFacts=await (await request.get(freshLink+'/certificate.json')).json();assert.equal(replacementFacts.language,'fr')
  await capture('replacement-french-complete')
  await cmd('tracking.settings',{enabled:'yes',alerts:'no',retentionDays:90,quietMinutes:30,consent:'yes'})
  const forwarded=await cmd('proposal.prepare',{...authored,clientId:client.id,priceOne:'2400',priceTwo:'4200',depositPercent:'25'})
  await cmd('proposal.locale',{id:forwarded.id,version:1,locale:'es'});await cmd('proposal.approve',{id:forwarded.id,version:2,revision:1})
  const forwardedLink=(await cmd('proposal.send',{id:forwarded.id,version:3})).shareUrl
  await page.goto(forwardedLink)
  const stakeholder=page.locator('form[action$="/stakeholder"]')
  await stakeholder.locator('[name="name"]').fill('Synthetic stakeholder');await stakeholder.locator('[name="email"]').fill(email(9797));await stakeholder.locator('[name="consent"]').check();await stakeholder.getByRole('button').click()
  assert.equal(await page.getByRole('heading',{name:'Revise su correo electrónico',exact:true}).count(),1);await capture('stakeholder-code')
  const stakeholderMail=(await (await request.get(app.origin+'/api/platter/state')).json()).outbox.find(m=>m.proposal_id===forwarded.id&&m.recipient===email(9797))
  assert.equal(stakeholderMail.subject,'Verifique su correo de participante')
  await page.getByLabel('Código de verificación de participante').fill(stakeholderMail.body.match(/\b\d{6}\b/)[0]);await page.getByRole('button',{name:'Verificar correo de participante',exact:true}).click()
  assert.equal(await page.getByRole('heading',{name:'Participante identificado',exact:true}).count(),1);await capture('stakeholder-verified')
  assert.equal((await request.post(forwardedLink+'/action?name=accept',{headers,data:{name:'Synthetic stakeholder',optionId:'one',consent:true}})).status(),401)
  await localeProviderBrowser(width,browser,screenshots,catalog)
 } finally {await context?.close();await browser?.close();await app?.close()}
}

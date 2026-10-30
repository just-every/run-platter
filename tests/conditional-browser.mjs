import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pdfPages } from './pdf-document.mjs'
import { regionalFields, regionalTerms, regionalScope } from './conditional-journey.mjs'

// Reuse the compiled editor, variable controls and actual mailbox client flow.
export async function regionalBrowser({page,context,origin,command,width,screenshots}){
 const capture=async name=>{
  await page.waitForLoadState('load')
  await page.evaluate(async()=>{await document.fonts.ready})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  if(screenshots){await mkdir(screenshots,{recursive:true});await page.screenshot({path:join(screenshots,`EDIT-009-variable-${name}-${width}.png`),fullPage:true})}
 }
 const visible=async region=>{
  const text=await page.locator('main').innerText()
  assert.equal(text.includes(regionalTerms),region==='West');assert.ok(text.includes(regionalScope))
 }
 const download=async label=>{
  const pending=page.waitForEvent('download');await page.getByRole('link',{name:label,exact:true}).click()
  return readFile(await(await pending).path())
 }
 for(const [index,region] of ['West','East'].entries()){
  const client=await command('client.save',{name:region+' studio client',email:['synthetic-platter-'+(9210+index),'example.test'].join('@'),variableFields:{custom:{Region:region}}})
  const {sectionConditions,...fields}=regionalFields
  const p=await command('proposal.prepare',{...fields,clientId:client.id})
  await page.goto(origin+'/app/proposal?id='+p.id)
  await page.locator('select[name=termsOption]').selectOption('variable')
  await page.locator('input[name=termsVariable]').fill('Custom.Region')
  await page.locator('input[name=termsVariableValue]').fill('West')
  await page.getByRole('button',{name:'Save revision',exact:true}).click();await capture(region+'-editor')
  await page.goto(origin+`/app/preview/client?id=${p.id}&revision=2&optionId=two`)
  await visible(region);await capture(region+'-preview')
  await page.goto(origin+'/app/proposal?id='+p.id)
  await page.getByRole('button',{name:'Approve this revision'}).click()
  await page.getByRole('button',{name:'Send approved proposal'}).click()
  const state=await(await context.request.get(origin+'/api/platter/state')).json(),sent=state.proposals.find(row=>row.id===p.id),path='/p/'+sent.shareToken
  assert.equal(sent.document.merge.values['Custom.Region'],region)
  await page.goto(origin+path);await page.getByRole('button',{name:'Send verification code'}).click()
  const mailState=await(await context.request.get(origin+'/api/platter/state')).json(),code=mailState.outbox.find(m=>m.proposal_id===p.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
  await page.getByLabel('Email verification code').fill(code);await page.getByRole('button',{name:'Verify email',exact:true}).click()
  await page.getByLabel('Review sections for').selectOption('two');await page.getByRole('button',{name:'Review package',exact:true}).click()
  await visible(region);await capture(region+'-client')
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download unsigned proposal PDF',exact:true}).click()
  const unsigned=(await pdfPages(await readFile(await(await pending).path()))).join(' ')
  assert.equal(unsigned.includes(regionalTerms),region==='West');assert.ok(unsigned.includes(regionalScope));assert.equal(/\bTerms\b/.test(unsigned),region==='West')
  const draft=await command('proposal.duplicate',{id:p.id,version:sent.version,clientId:client.id}),opposite=region==='West'?'East':'West'
  await page.goto(origin+'/app/proposal?id='+draft.id)
  await page.getByLabel('Custom.Region',{exact:true}).fill(opposite)
  await page.getByRole('button',{name:'Fill proposal variables',exact:true}).click()
  await page.goto(origin+`/app/preview/client?id=${draft.id}&revision=2&optionId=two`);await visible(opposite)
  await page.goto(origin+path+'?optionId=two');await visible(region)
  await page.getByRole('radio',{name:/Premium/}).check();await page.getByLabel('Your full name').fill('Synthetic regional signer')
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Accept proposal',exact:true}).click()
  assert.match(await page.locator('main').innerText(),/This agreement is complete/);await visible(region);await capture(region+'-accepted')
  const signed=await download('Signed agreement PDF')
  const signedText=(await pdfPages(signed)).join(' ');assert.equal(signedText.includes(regionalTerms),region==='West');assert.ok(signedText.includes(regionalScope));assert.equal(/\bTerms\b/.test(signedText),region==='West')
  await page.goto(origin+'/app/proposal?id='+draft.id)
  await page.getByLabel('Custom.Region',{exact:true}).fill(region)
  await page.getByRole('button',{name:'Fill proposal variables',exact:true}).click()
  await page.goto(origin+path+'?optionId=two');await visible(region)
  assert.deepEqual(await download('Signed agreement PDF'),signed)
 }
}

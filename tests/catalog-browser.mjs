import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import { catalogCsv } from './catalog-fixture.mjs'

export async function catalogBrowser({origin,owner,sales,op,page,review,command,state,capture,client,width}){
 const scopedScreens=process.env.PLATTER_CATALOG_SCREENSHOTS
 if(scopedScreens){await mkdir(scopedScreens,{recursive:true});capture=async(target,name)=>{
  await target.evaluate(async()=>{await document.fonts.ready})
  for(const shownWidth of [1440,390]){await target.setViewportSize({width:shownWidth,height:900});assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' fits '+shownWidth);const subject=name==='catalog-recurring-draft'?target.locator('[data-pricing-editor]'):target.locator('section').filter({has:target.getByRole('heading',{name:name==='catalog-promotion-review'?'Review priced catalog promotion':name==='catalog-recurrence-choice'?'Add from catalog':'Priced catalog',exact:true})});await subject.screenshot({path:join(scopedScreens,name+'-'+shownWidth+'.png')})}
  await target.setViewportSize({width,height:900})
 }}
 const ownerState=await state(owner);assert.equal(ownerState.actor.role,'owner')
 const count=ownerState.catalogItems.length
 await op.goto(origin+'/app/import')
 await op.locator('select[name=kind]').selectOption('catalog');await op.locator('select[name=format]').selectOption('platter');await op.getByLabel('Business CSV',{exact:true}).fill(catalogCsv())
 await op.getByRole('button',{name:'Preview business CSV',exact:true}).click()
 assert.ok((await op.locator('section').filter({has:op.getByRole('heading',{name:'Review business import',exact:true})}).innerText()).includes('50'))
 await op.getByRole('button',{name:'Apply reviewed business import',exact:true}).click()
 for(let i=0;i<5&&await op.getByRole('button',{name:'Continue reviewed business import',exact:true}).count();i++)await op.getByRole('button',{name:'Continue reviewed business import',exact:true}).click()
 {assert.equal((await state(owner)).businessRecords.catalog.length,50);assert.equal((await state(owner)).catalogItems.length,count,'import keeps prices review only')}
 await op.locator('[name="promote:synthetic-platter-6200"]').check();await op.locator('[name="promote:synthetic-platter-6201"]').check();await op.getByRole('button',{name:'Review selected priced items',exact:true}).click()
 const preview=op.locator('section').filter({has:op.getByRole('heading',{name:'Review priced catalog promotion',exact:true})})
 {assert.ok((await preview.innerText()).includes('$100.00 USD'));assert.ok((await preview.innerText()).includes('monthly'));assert.equal(await preview.locator('li').count(),2)}
 await capture(op,'catalog-promotion-review');await op.getByRole('button',{name:'Promote reviewed priced items',exact:true}).click()
 const imported=(await state(owner)).catalogItems.find(i=>i.source_id==='synthetic-platter-6200')
 {assert.equal((await state(owner)).catalogItems.length,count+2);assert.equal(await op.getByRole('alert').count(),0)}
 await review.goto(origin+'/app/catalog')
 const metadata=review.locator('form').filter({has:review.locator('input[name=id][value="'+imported.id+'"]')});assert.equal(await metadata.getByLabel('Default recurrence').inputValue(),'monthly');assert.equal(await metadata.getByLabel('Tax code',{exact:true}).inputValue(),'service-tax');assert.equal(await metadata.getByLabel('Income account',{exact:true}).inputValue(),'service-income');await capture(review,'catalog-metadata')
 const draft=await command(sales,'template.start',{id:'starter:consultancy',version:1,clientId:client.id})
 await page.goto(origin+'/app/proposal?id='+draft.id)
 const insertion=page.locator('form').filter({has:page.getByRole('button',{name:'Add Synthetic imported service 1 to proposal',exact:true})})
 {assert.equal(await insertion.getByLabel('Recurring installments',{exact:true}).inputValue(),'');assert.equal(await insertion.getByLabel('Recurring start date',{exact:true}).inputValue(),'')}
 await insertion.getByLabel('Recurring installments',{exact:true}).fill('12');await insertion.getByLabel('Recurring start date',{exact:true}).fill('2099-01-31');await capture(page,'catalog-recurrence-choice');await insertion.getByRole('button').click()
 assert.equal(await page.getByRole('alert').count(),0)
 // A normal editor save must retain the copied accounting metadata too.
 await page.getByRole('button',{name:'Save revision',exact:true}).click()
 const current=(await state(sales)).proposals.find(p=>p.id===draft.id),line=current.options[0].tables.at(-1).lines[0]
 {assert.equal(line.unitPrice,'100.00');assert.deepEqual(line.recurrence,{interval:'monthly',term:12,startsOn:'2099-01-31'});assert.equal(line.taxCode,'service-tax');assert.equal(line.incomeAccount,'service-income');assert.equal(line.catalogId,imported.id);assert.equal(Object.hasOwn(current,'internalPricing'),false)}
 await capture(page,'catalog-recurring-draft')
 const frozen=JSON.stringify(current.options)
 await metadata.getByLabel('USD unit price',{exact:true}).fill('150');await metadata.getByLabel('Default recurrence').selectOption('quarterly');await metadata.getByLabel('Tax code',{exact:true}).fill('updated-tax');await metadata.getByLabel('Income account',{exact:true}).fill('updated-income');await metadata.getByRole('button',{name:'Save catalog item',exact:true}).click()
 const updated=(await state(owner)).catalogItems.find(i=>i.id===imported.id);assert.equal(updated.version,2);assert.equal(updated.default_recurrence,'quarterly');assert.equal(updated.tax_code,'updated-tax');assert.equal(updated.income_account,'updated-income');assert.equal(JSON.stringify((await state(sales)).proposals.find(p=>p.id===draft.id).options),frozen)
 await capture(review,'catalog-edited-defaults')
 const future=await command(sales,'template.start',{id:'starter:consultancy',version:1,clientId:client.id});await command(sales,'catalog.insert',{id:future.id,version:1,catalogId:imported.id,catalogVersion:2,optionId:'one',quantity:'1',term:'4',startsOn:'2099-04-01'})
 const futureLine=(await state(sales)).proposals.find(p=>p.id===future.id).options[0].tables.at(-1).lines[0];assert.equal(futureLine.unitPrice,'150.00');assert.equal(futureLine.recurrence.interval,'quarterly');assert.equal(futureLine.taxCode,'updated-tax');assert.equal(futureLine.incomeAccount,'updated-income')

 for(const target of [op,review,page])for(const control of await target.locator('button,a[role=button]').all()){
  const label=(await control.innerText()).trim()
  if(label&&!/[A-Za-z0-9]/.test(label)&&await control.isVisible()){
   const id=await control.getAttribute('aria-describedby');assert.ok(id,'Icon control has a tooltip');await control.focus();assert.equal(await target.locator('#'+id).isVisible(),true);await control.hover();await target.locator('#'+id).waitFor({state:'visible'})
  }
 }
}

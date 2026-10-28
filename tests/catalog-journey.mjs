import assert from 'node:assert/strict'
import { catalogCsv, promoteImported } from './catalog-fixture.mjs'
import { applyBusiness, undoBusiness } from './business-import-fixture.mjs'
import { pdfPages } from './pdf-document.mjs'

export async function catalogJourney(h,{client,people,offer,verified}){
 const count=(await h.state()).catalogItems.length,input={kind:'catalog',format:'platter',csv:catalogCsv()},imported=await applyBusiness(h,input)
 assert.equal(imported.preview.report.catalog,50);assert.equal((await h.state()).businessRecords.catalog.length,50)
 assert.equal((await h.state()).catalogItems.length,count,'CSV import alone never creates priced items')
 const ids=['synthetic-platter-6200','synthetic-platter-6201'],selection={itemIds:ids,fallbackUnit:'each'},preview=await h.cmd('business-import.promote-preview',selection)
 assert.deepEqual(preview.items.map(i=>[i.unitCents,i.defaultRecurrence,i.taxable,i.taxCode,i.incomeAccount]),[[10000,'monthly',false,'service-tax','service-income'],[20000,'one-off',false,'','service-income']])
 const before=await h.state()
 for(const role of Object.keys(people))for(const name of ['business-import.promote-preview','business-import.promote'])await h.cmd(name,{...selection,fingerprint:preview.fingerprint},people[role],403)
 await h.cmd('business-import.promote',{...selection,fallbackUnit:'hour',fingerprint:'unreviewed'},h.owner,409)
 await h.cmd('business-import.promote',{...selection,itemIds:[ids[0]],fingerprint:preview.fingerprint},h.owner,409)
 assert.deepEqual(await h.state(),before,'refused promotions preserve all public business state')
 const promoted=await h.cmd('business-import.promote',{...selection,fingerprint:preview.fingerprint}),item=promoted.items[0],second=promoted.items[1]
 assert.equal((await h.state()).catalogItems.length,count+2)
 const afterPromotion=await h.state();await h.cmd('business-import.promote',{...selection,fingerprint:preview.fingerprint},h.owner,409);assert.deepEqual(await h.state(),afterPromotion,'replay never duplicates priced items')
 const p=await h.cmd('proposal.prepare',{...offer,clientId:client.id}),insert={id:p.id,version:1,catalogId:item.id,catalogVersion:1,optionId:'one',quantity:'2'}
 const beforeInsert=await h.state()
 for(const fields of [{},{term:'12'},{term:'0',startsOn:'2099-01-31'},{term:'12',startsOn:'2099-02-30'}])await h.cmd('catalog.insert',{...insert,...fields},h.owner,400)
 for(const role of ['viewer','billing'])await h.cmd('catalog.insert',{...insert,term:'12',startsOn:'2099-01-31'},people[role],403)
 assert.deepEqual(await h.state(),beforeInsert,'incomplete recurrence and unauthorized insertion make no writes')
 await h.cmd('catalog.insert',{...insert,term:'12',startsOn:'2099-01-31'})
 await h.cmd('catalog.insert',{...insert,version:2,catalogId:second.id,quantity:'1'})
 let current=(await h.state()).proposals.find(r=>r.id===p.id),lines=current.options[0].tables.flatMap(t=>t.lines)
 assert.equal(current.options[0].cents,500000);assert.deepEqual(lines.at(-2).recurrence,{interval:'monthly',term:12,startsOn:'2099-01-31'});assert.equal(lines.at(-2).taxable,false);assert.equal(lines.at(-2).taxCode,'service-tax');assert.equal(lines.at(-2).incomeAccount,'service-income');assert.equal(lines.at(-2).catalogId,item.id)
 assert.equal(current.internalPricing.lines.find(l=>l.name===lines.at(-2).name).costCents,60000)
 const template=await h.cmd('template.save',{id:p.id,version:3,name:'Synthetic catalog defaults'}),copy=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id})
 const copied=(await h.state()).proposals.find(r=>r.id===copy.id);assert.deepEqual(copied.options,current.options);assert.equal(copied.internalPricing.lines.find(l=>l.name===lines.at(-2).name).costCents,60000)
 await h.cmd('proposal.approve',{id:p.id,version:3,revision:3});const path=new URL((await h.cmd('proposal.send',{id:p.id,version:4})).shareUrl).pathname,clientCookie=await verified(h,path)
 const frozen=(await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=3').bind(p.id).first()).snapshot
 const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=one',{headers:{host:new URL(h.origin).host,cookie:clientCookie}});assert.equal(pdf.status,200);const bytes=new Uint8Array(await pdf.arrayBuffer());assert.match((await pdfPages(bytes)).join('\n'),/12 installments from 2099-01-31/)
 const entry=(await h.state()).catalogItems.find(r=>r.id===item.id),edit={id:item.id,version:1,name:entry.name,sku:entry.sku,unit:entry.unit,description:entry.description,unitPrice:'150',unitCost:'30',defaultRecurrence:'quarterly',taxable:'no',taxCode:'updated-tax',incomeAccount:'updated-income'}
 await h.cmd('catalog.save',edit,people.manager)
 const stale=await h.state();await h.cmd('catalog.save',edit,h.owner,409);await h.cmd('catalog.insert',{...insert,version:3,term:'12',startsOn:'2099-01-31'},h.owner,409);assert.deepEqual(await h.state(),stale)
 current=(await h.state()).proposals.find(r=>r.id===p.id);assert.equal(current.options[0].cents,500000);assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=3').bind(p.id).first()).snapshot,frozen);assert.deepEqual((await h.state()).proposals.find(r=>r.id===copy.id).options,copied.options)
 const pdfAfter=await h.mf.dispatchFetch(h.origin+path+'/download.pdf?optionId=one',{headers:{host:new URL(h.origin).host,cookie:clientCookie}});assert.deepEqual(await pdfPages(new Uint8Array(await pdfAfter.arrayBuffer())),await pdfPages(bytes),'catalog edits preserve every visible sent PDF page')
 const fresh=await h.cmd('proposal.prepare',{...offer,clientId:client.id});await h.cmd('catalog.insert',{...insert,id:fresh.id,catalogVersion:2,term:'4',startsOn:'2099-04-01'})
 const newLine=(await h.state()).proposals.find(r=>r.id===fresh.id).options[0].tables[0].lines.at(-1);assert.equal(newLine.unitPrice,'150.00');assert.deepEqual(newLine.recurrence,{interval:'quarterly',term:4,startsOn:'2099-04-01'});assert.equal(newLine.taxable,false);assert.equal(newLine.taxCode,'updated-tax');assert.equal(newLine.incomeAccount,'updated-income')
 // The retained import can be undone; independently reviewed prices and sent snapshots remain.
 await undoBusiness(h,imported.job.id);assert.equal((await h.state()).businessRecords.catalog.length,0);assert.equal((await h.state()).catalogItems.length,count+2)
 const again=await applyBusiness(h,{...input,csv:input.csv+'\n'});const beforeReplay=await h.state();await h.cmd('business-import.promote-preview',selection,h.owner,409);assert.deepEqual(await h.state(),beforeReplay)
 const taxItem=(await promoteImported(h,['synthetic-platter-6202'])).items[0];assert.equal((await h.state()).catalogItems.length,count+3)
 const {configureTaxes,taxRequest}=await import('./taxes-fixture.mjs');await configureTaxes(h.cmd)
 const taxed=await h.cmd('proposal.prepare',{...offer,clientId:client.id,tax:taxRequest()});await h.cmd('catalog.insert',{id:taxed.id,version:1,catalogId:taxItem.id,catalogVersion:1,optionId:'one',quantity:'1'})
 const taxableLine=(await h.state()).proposals.find(r=>r.id===taxed.id).options[0].tables[0].lines.at(-1);assert.equal(taxableLine.taxable,true);assert.equal(taxableLine.taxCode,'service-tax');assert.equal(taxableLine.incomeAccount,'service-income')
 await h.cmd('proposal.approve',{id:taxed.id,version:2,revision:2});const taxedPath=new URL((await h.cmd('proposal.send',{id:taxed.id,version:3})).shareUrl).pathname,taxedCookie=await verified(h,taxedPath)
 assert.match((await h.send(taxedPath,undefined,taxedCookie)).text,/16\.50/)
 const taxFrozen=(await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(taxed.id).first()).snapshot
 const source=(await h.state()).catalogItems.find(r=>r.id===taxItem.id)
 await h.cmd('catalog.save',{id:taxItem.id,version:1,name:source.name,sku:source.sku,description:source.description,unit:source.unit,unitPrice:'250',taxable:'no',taxCode:'changed',incomeAccount:'changed'})
 assert.equal((await h.db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=2').bind(taxed.id).first()).snapshot,taxFrozen)
 const mixed=await h.cmd('proposal.prepare',{...offer,clientId:client.id,tax:taxRequest()}),beforeTaxedRecurrence=await h.state()
 await h.cmd('catalog.insert',{...insert,id:mixed.id,catalogVersion:2,term:'4',startsOn:'2099-04-01'},h.owner,409);assert.deepEqual(await h.state(),beforeTaxedRecurrence,'unsupported taxed recurrence is explicit and changes nothing')
}

import assert from 'node:assert/strict'
import { pdfPages } from './pdf-document.mjs'

export const recurringFixture=(term=12)=>({
 packages:[{id:'one',label:'One-off only',price:'16000'},{id:'two',label:'Setup and care',price:'1',optionalItems:[{id:'seats',label:'Extra seats',unitPrice:'50',min:1,max:10,quantity:1,editable:true,interval:'monthly',term:12,startsOn:'2099-01-31'}]}],
 pricingTables:[{optionId:'two',name:'Services',lines:[{name:'Setup',quantity:'1',unit:'project',unitPrice:'2500'},{name:'Care',quantity:'1',unit:'service',unitPrice:'1200',interval:'monthly',term,startsOn:'2099-01-31'}]}]
})
export async function recurringJourney(h,{offer,verified}) {
 await h.db.prepare('INSERT INTO p_expiry_clock(singleton,observed_at) VALUES(1,?)').bind(Date.parse('2098-12-01T12:00:00Z')).run()
 const client=await h.cmd('client.save',{name:'Recurring client',email:'recurring@studio.example'}),input={...offer,...recurringFixture(),title:'Recurring services',depositPercent:'1',clientId:client.id}
 const p=await h.cmd('proposal.prepare',input),row=async id=>(await h.state()).proposals.find(x=>x.id===(id??p.id))
 assert.equal((await row()).options[1].cents,1690000,'Agreed term value is $16,900, never one installment')
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie:h.owner},body:new URLSearchParams({confirm:'yes'}),redirect:'manual'});assert.equal(setup.status,303)
 const summary=html=>{for(const text of ['One-off total: USD 2,500.00','USD 1,200.00 per month','First-year value: USD 16,900.00'])assert.ok(html.includes(text),'Recurring summary '+text)}
 summary((await h.send('/app/preview/client?id='+p.id+'&revision=1&optionId=two',undefined,h.owner)).text)
 const before=await h.state()
 for(const change of [{interval:'daily'},{term:0},{term:1.5},{term:121},{startsOn:'2099-02-30'}]){const f=recurringFixture();Object.assign(f.pricingTables[0].lines[1],change);await h.cmd('proposal.prepare',{...input,...f},h.owner,400)}
 assert.deepEqual((await h.state()).proposals,before.proposals,'Invalid recurrence writes no proposal')
 const long=await h.cmd('proposal.prepare',{...input,...recurringFixture(24),title:'Long recurring term'}),flat=await h.cmd('proposal.prepare',{...input,packages:[{id:'one',label:'Flat',price:'20000'}],pricingTables:[],title:'Flat services'})
 for(const id of [p.id,long.id,flat.id])await h.cmd('followup.schedule',{id,action:'Discuss the offer',dueDate:'2099-01-01'})
 // Historical currency is fixture state; current proposal creation intentionally only offers USD.
 const aud=await h.cmd('proposal.prepare',{...input,packages:[{id:'one',label:'Historical flat',price:'7000'}],pricingTables:[],title:'Historical AUD services'})
 await h.db.prepare("UPDATE p_proposals SET currency='AUD' WHERE id=?").bind(aud.id).run()
 const queue=(await h.send('/api/platter/followups',undefined,h.owner)).value,rows=queue.rows.filter(r=>[p.id,long.id,flat.id].includes(r.id))
 assert.equal(rows[0].id,flat.id,'$20,000 one-off outranks $16,900 first year even for a $31,300 full term')
 assert.deepEqual(rows.map(r=>[r.valueCents,r.currency]),[[2000000,'USD'],[1690000,'USD'],[1690000,'USD']])
 assert.equal(queue.totals.find(r=>r.currency==='USD').valueCents,5380000)
 assert.deepEqual(queue.totals,[{currency:'AUD',count:1,valueCents:700000},{currency:'USD',count:3,valueCents:5380000}],'Queue totals never combine currencies')
 assert.deepEqual(queue.rows.find(r=>r.id===aud.id).currency,'AUD')
 const selectedPreview=await h.send('/app/preview/client?id='+p.id+'&revision=1&optionId=two&items='+encodeURIComponent(JSON.stringify([{id:'seats',quantity:4}])),undefined,h.owner)
 assert.equal(selectedPreview.status,200)
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1});const path=new URL((await h.cmd('proposal.send',{id:p.id,version:2})).shareUrl).pathname,cookie=await verified(h,path)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Unverified',optionId:'two',items:[],consent:true})).status,401)
 summary((await h.send(path+'?optionId=two',undefined,cookie)).text)
 const query=items=>'?optionId=two&items='+encodeURIComponent(JSON.stringify(items))
 const data=async items=>(await h.send(path+'/data.json'+query(items),undefined,cookie)).value
 let selected=await data([])
 assert.deepEqual([selected.selection.fees.oneOffCents,selected.selection.fees.firstYearCents,selected.selection.totalCents],[250000,1690000,1690000])
 const schedule=selected.paymentSchedule
 assert.equal(schedule.rows.length,14);assert.deepEqual(schedule.rows.slice(0,4).map(r=>[r.kind,r.amountCents,r.date??r.event]),[['deposit',16900,'Acceptance'],['balance',233100,'Acceptance'],['recurring',120000,'2099-01-31'],['recurring',120000,'2099-02-28']])
 assert.equal(schedule.rows.at(-1).date,'2099-12-31');assert.equal(schedule.rows.reduce((n,r)=>n+r.amountCents,0),1690000)
 assert.equal(selected.selection.fees.recurring[0].renewalOn,'2100-01-31')
 const flatSelection=(await h.send(path+'/data.json?optionId=one',undefined,cookie)).value
 assert.equal(flatSelection.selection.optionId,'one','The requested package controls selection')
 assert.equal(flatSelection.selection.totalCents,1600000)
 assert.equal(flatSelection.selection.fees,undefined,'A one-off package cannot inherit another package recurring fees')
 assert.equal(flatSelection.paymentSchedule,undefined,'A one-off package cannot inherit another package installments')
 const items=[{id:'seats',quantity:4}];selected=await data(items)
 assert.deepEqual([selected.selection.fees.oneOffCents,selected.selection.fees.firstYearCents,selected.selection.totalCents],[250000,1930000,1930000])
 assert.deepEqual(selected.selection.fees.recurring.map(r=>r.amountCents),[120000,20000]);assert.equal(selected.paymentSchedule.rows.length,26)
 assert.equal(selected.selection.depositCents,19300,'The deposit includes selected recurring optional value')
 assert.equal(selected.paymentSchedule.rows[0].amountCents,19300,'The selected schedule uses that deposit')
 const dates=['2099-01-31','2099-02-28','2099-03-31','2099-04-30','2099-05-31','2099-06-30','2099-07-31','2099-08-31','2099-09-30','2099-10-31','2099-11-30','2099-12-31']
 const expectedRows=[['Deposit','Acceptance',19300],['One-off balance','Acceptance',230700],...dates.flatMap(date=>[['Care',date,120000],['Extra seats',date,20000]])]
 const htmlRows=html=>{const list=html.match(/<h2[^>]*>Payment schedule<\/h2>[\s\S]*?<ol>([\s\S]*?)<\/ol>/);assert.ok(list,'A visible payment schedule exists');return [...list[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m=>m[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim())}
 const expectedHtml=expectedRows.map(([label,date,cents])=>label+' · '+date+' · $'+(cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' USD · net 0')
 assert.deepEqual(htmlRows(selectedPreview.text),expectedHtml,'Selected preview schedule attaches exact amounts to each line and date')
 const selectedPage=await h.send(path+query(items),undefined,cookie)
 assert.deepEqual(htmlRows(selectedPage.text),expectedHtml,'Selected client schedule attaches exact amounts to each line and date')
 const chosen=await h.send('/app/preview/client?id='+long.id+'&revision=1&optionId=two&items='+encodeURIComponent(JSON.stringify(items)),undefined,h.owner)
 assert.ok(chosen.text.includes('First-year value: USD 19,300.00'));assert.ok(chosen.text.includes('USD 200.00 per month'))
 const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf'+query(items),{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200)
 const pages=await pdfPages(await pdf.arrayBuffer()),text=pages.join(' ');for(const page of pages)assert.match(page,/Not signed, revision 1/)
 assert.ok((await h.send(path+query(items),undefined,cookie)).text.includes('4 × $50.00 USD × 12 installments = $2,400.00 USD'))
 for(const value of ['Extra seats: 4 x USD 50.00 x 12 installments = USD 2,400.00','1 service x USD 1,200.00 x 12 installments = USD 14,400.00','One-off total: USD 2,500.00','USD 1,200.00 per month','USD 200.00 per month','First-year value: USD 19,300.00','2099-02-28'])assert.ok(text.includes(value),value)
 const scheduleText=text.split('Payment schedule')[1].split('Selected optional items')[0].replace(/\s+/g,' ')
 for(const [label,date,cents] of expectedRows)assert.ok(scheduleText.includes(label+': USD '+(cents/100).toFixed(2)+' · '+date+' · net 0'),'Selected PDF schedule: '+label+' '+date+' '+cents)
 const invalid=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items:[{id:'seats',quantity:11}],consent:true},cookie);assert.equal(invalid.status,400);assert.equal((await row()).acceptance,undefined)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items,consent:true},cookie)).status,200)
 assert.equal((await row()).invoice,undefined,'Native recurring acceptance creates no automatic invoice')
 const accepted=(await row()).acceptance,frozen=await h.send(path+'/data.json',undefined,cookie)
 assert.deepEqual(frozen.value.paymentSchedule,selected.paymentSchedule);assert.deepEqual(frozen.value.selection.fees,selected.selection.fees);assert.equal(accepted.totalCents,1930000)
 await h.send(path+'/action?name=accept',{name:'Changed',optionId:'one',items:[],consent:true},cookie);assert.deepEqual((await row()).acceptance,accepted)
 await h.cmd('proposal.revise',{...input,id:p.id,version:4},h.owner,409);assert.deepEqual((await row()).acceptance,accepted,'An accepted term cannot be repriced')
 // Every supported interval crosses actual calendar boundaries, with an explicit independent expected set.
 for(const [interval,term,dates,yearValue,startsOn='2099-01-31'] of [['weekly',3,['2099-01-31','2099-02-07','2099-02-14'],360000],['quarterly',5,['2099-01-31','2099-04-30','2099-07-31','2099-10-31','2100-01-31'],480000],['annual',2,['2099-01-31','2100-01-31'],120000],['annual',2,['2096-02-29','2097-02-28'],120000,'2096-02-29']]){
  const f=recurringFixture();Object.assign(f.pricingTables[0].lines[1],{interval,term,startsOn});f.pricingTables[0].lines.shift();const t=await h.cmd('proposal.prepare',{...input,...f})
  await h.cmd('proposal.approve',{id:t.id,version:1,revision:1});const url=new URL((await h.cmd('proposal.send',{id:t.id,version:2})).shareUrl).pathname,c=await verified(h,url),v=(await h.send(url+'/data.json?optionId=two',undefined,c)).value
  const display=await h.send(url+'?optionId=two',undefined,c)
  const intervalName={weekly:'week',quarterly:'quarter',annual:'year'}[interval]
  assert.ok(display.text.includes('USD 1,200.00 per '+intervalName+' · Care · '+term+' installments from '+startsOn),'Client displays '+interval+' amount and interval together')
  assert.deepEqual(v.paymentSchedule.rows.filter(r=>r.kind==='recurring').map(r=>r.date),dates);assert.equal(v.selection.fees.firstYearCents,yearValue);assert.equal(v.paymentSchedule.rows.reduce((n,r)=>n+r.amountCents,0),120000*term)
 }

 // Supported term endpoints are real schedules, not just accepted metadata.
 for(const [term,count,total,last] of [[1,1,120000,'2099-01-31'],[120,120,14400000,'2108-12-31']]){
  const f=recurringFixture(term);f.pricingTables[0].lines.shift()
  const t=await h.cmd('proposal.prepare',{...input,...f});await h.cmd('proposal.approve',{id:t.id,version:1,revision:1})
  const url=new URL((await h.cmd('proposal.send',{id:t.id,version:2})).shareUrl).pathname,c=await verified(h,url),v=(await h.send(url+'/data.json?optionId=two',undefined,c)).value
  const installments=v.paymentSchedule.rows.filter(r=>r.kind==='recurring')
  assert.equal(installments.length,count,'Term endpoint '+term+' yields every installment')
  assert.equal(installments.at(-1).date,last)
  assert.equal(v.selection.totalCents,total)
 }
 // Optional recurrence accepts each non-monthly interval through selection, not just line pricing.
 for(const [interval,dates] of [['weekly',['2099-01-31','2099-02-07']],['quarterly',['2099-01-31','2099-04-30']],['annual',['2099-01-31','2100-01-31']]]){
  const f=recurringFixture();Object.assign(f.packages[1].optionalItems[0],{interval,term:2})
  const t=await h.cmd('proposal.prepare',{...input,...f});await h.cmd('proposal.approve',{id:t.id,version:1,revision:1})
  const url=new URL((await h.cmd('proposal.send',{id:t.id,version:2})).shareUrl).pathname,c=await verified(h,url),v=(await h.send(url+'/data.json'+query(items),undefined,c)).value
  assert.deepEqual(v.paymentSchedule.rows.filter(r=>r.label==='Extra seats').map(r=>[r.date,r.amountCents]),dates.map(date=>[date,20000]),'Selected '+interval+' optional installments')
  assert.equal(v.selection.totalCents,1730000)
 }
 // The selected optional item begins first, so the anniversary excludes Care after June.
 const staggered=recurringFixture();Object.assign(staggered.packages[1].optionalItems[0],{interval:'annual',term:2,startsOn:'2098-07-01'})
 const early=await h.cmd('proposal.prepare',{...input,...staggered});await h.cmd('proposal.approve',{id:early.id,version:1,revision:1})
 const earlyPath=new URL((await h.cmd('proposal.send',{id:early.id,version:2})).shareUrl).pathname,earlyCookie=await verified(h,earlyPath)
 const earlyData=(await h.send(earlyPath+'/data.json'+query(items),undefined,earlyCookie)).value
 assert.equal(earlyData.selection.fees.firstYearCents,990000,'First year begins at earliest selected recurring start, including across line kinds')
 // A fixed deposit pays setup, then January, then part of February; the last cent survives.
 const credit=await h.cmd('proposal.prepare',{...input,paymentTerms:{netDays:15,depositFixed:'3900.01',milestones:[]}})
 await h.cmd('proposal.approve',{id:credit.id,version:1,revision:1});const creditPath=new URL((await h.cmd('proposal.send',{id:credit.id,version:2})).shareUrl).pathname,creditCookie=await verified(h,creditPath)
 const creditData=(await h.send(creditPath+'/data.json'+query(items),undefined,creditCookie)).value
 assert.deepEqual(creditData.paymentSchedule.rows.slice(0,5).map(r=>[r.kind,r.label,r.date??r.event,r.amountCents,r.prepaidCents??0]),[
  ['deposit','Deposit','Acceptance',390001,0],['recurring','Care','2099-01-31',0,120000],['recurring','Extra seats','2099-01-31',0,20000],['recurring','Care','2099-02-28',119999,1],['recurring','Extra seats','2099-02-28',20000,0]
 ],'Prepayment consumes earliest installments before later dates and retains its residual cent')
 assert.equal(creditData.paymentSchedule.rows.reduce((n,r)=>n+r.amountCents,0),1930000,'Prepayment neither loses nor adds a cent')
 // Uneven discounted term totals retain cents in the earliest installments.
 const residual=recurringFixture(3);residual.pricingTables[0].lines.shift();residual.packages[1].discountAmount='0.01'
 const penny=await h.cmd('proposal.prepare',{...input,...residual});await h.cmd('proposal.approve',{id:penny.id,version:1,revision:1})
 const pennyPath=new URL((await h.cmd('proposal.send',{id:penny.id,version:2})).shareUrl).pathname,pennyCookie=await verified(h,pennyPath),pennyData=(await h.send(pennyPath+'/data.json?optionId=two',undefined,pennyCookie)).value
 assert.deepEqual(pennyData.paymentSchedule.rows.filter(r=>r.kind==='recurring').map(r=>[r.date,r.amountCents,r.prepaidCents??0]),[['2099-01-31',116400,3600],['2099-02-28',120000,0],['2099-03-31',119999,0]],'Uneven term allocation retains every residual cent')
 const beforeRetainer=await h.state()
 await h.cmd('proposal.prepare',{...input,paymentTerms:{netDays:15,milestones:[],retainer:{percent:'10',startsOn:'2099-01-31',months:12}}},h.owner,400)
 assert.deepEqual((await h.state()).proposals,beforeRetainer.proposals,'A duplicate percentage retainer is refused without a new proposal')
 await h.cmd('approval.policy',{version:0,required:false,defaultRole:'owner'})
 const review=await h.cmd('approval.rule',{version:1,name:'Review recurring terms',position:0,condition:{kind:'paymentTerms',minimumDepositBps:1,standardTerms:'Net 30'},approvers:['role:owner']})
 const recurring=await h.cmd('proposal.prepare',{...input,depositPercent:'100',terms:'Net 30'}),plain=await h.cmd('proposal.prepare',{...input,depositPercent:'100',terms:'Net 30',packages:[{id:'one',label:'One-off',price:'1000'}],pricingTables:[]})
 assert.deepEqual((await row(recurring.id)).approval.steps.map(r=>r.id),[review.id],'Recurring line schedules require configured payment-term review')
 assert.deepEqual((await row(plain.id)).approval.steps,[],'Ordinary terms with a sufficient deposit still skip that rule')
 const discounted=recurringFixture();discounted.packages[1].discountPercent='10'
 const reduced=await h.cmd('proposal.prepare',{...input,...discounted});await h.cmd('proposal.approve',{id:reduced.id,version:1,revision:1});const reducedPath=new URL((await h.cmd('proposal.send',{id:reduced.id,version:2})).shareUrl).pathname,reducedCookie=await verified(h,reducedPath),v=(await h.send(reducedPath+'/data.json'+query(items),undefined,reducedCookie)).value
 assert.deepEqual([v.selection.fees.oneOffCents,v.selection.fees.firstYearCents,v.selection.totalCents],[225000,1737000,1737000])
 assert.deepEqual(v.selection.fees.recurring.map(r=>r.amountCents),[108000,18000]);assert.equal(v.paymentSchedule.rows.reduce((n,r)=>n+r.amountCents,0),1737000)

}

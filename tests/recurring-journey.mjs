import assert from 'node:assert/strict'
import { pdfPages } from './pdf-document.mjs'

export const recurringFixture=(term=12)=>({
 packages:[{id:'one',label:'One-off only',price:'16000'},{id:'two',label:'Setup and care',price:'1',optionalItems:[{id:'seats',label:'Extra seats',unitPrice:'50',min:1,max:10,quantity:1,editable:true,interval:'monthly',term:12,startsOn:'2099-01-31'}]}],
 pricingTables:[{optionId:'two',name:'Services',lines:[{name:'Setup',quantity:'1',unit:'project',unitPrice:'2500'},{name:'Care',quantity:'1',unit:'service',unitPrice:'1200',interval:'monthly',term,startsOn:'2099-01-31'}]}]
})
export async function recurringJourney(h,{offer,verified}) {
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
 const queue=(await h.send('/api/platter/followups',undefined,h.owner)).value,rows=queue.rows.filter(r=>[p.id,long.id,flat.id].includes(r.id))
 assert.equal(rows[0].id,flat.id,'$20,000 one-off outranks $16,900 first year even for a $31,300 full term')
 assert.deepEqual(rows.map(r=>[r.valueCents,r.currency]),[[2000000,'USD'],[1690000,'USD'],[1690000,'USD']])
 assert.equal(queue.totals.find(r=>r.currency==='USD').valueCents,5380000)
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
 const items=[{id:'seats',quantity:4}];selected=await data(items)
 assert.deepEqual([selected.selection.fees.oneOffCents,selected.selection.fees.firstYearCents,selected.selection.totalCents],[250000,1930000,1930000])
 assert.deepEqual(selected.selection.fees.recurring.map(r=>r.amountCents),[120000,20000]);assert.equal(selected.paymentSchedule.rows.length,26)
 const chosen=await h.send('/app/preview/client?id='+long.id+'&revision=1&optionId=two&items='+encodeURIComponent(JSON.stringify(items)),undefined,h.owner)
 assert.ok(chosen.text.includes('First-year value: USD 19,300.00'));assert.ok(chosen.text.includes('USD 200.00 per month'))
 const pdf=await h.mf.dispatchFetch(h.origin+path+'/download.pdf'+query(items),{headers:{host:new URL(h.origin).host,cookie}});assert.equal(pdf.status,200)
 const pages=await pdfPages(await pdf.arrayBuffer()),text=pages.join(' ');for(const page of pages)assert.match(page,/Not signed, revision 1/)
 for(const value of ['One-off total: USD 2,500.00','USD 1,200.00 per month','USD 200.00 per month','First-year value: USD 19,300.00','2099-02-28'])assert.ok(text.includes(value),value)
 const invalid=await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items:[{id:'seats',quantity:11}],consent:true},cookie);assert.equal(invalid.status,400);assert.equal((await row()).acceptance,undefined)
 assert.equal((await h.send(path+'/action?name=accept',{name:'Avery Chen',optionId:'two',items,consent:true},cookie)).status,200)
 const accepted=(await row()).acceptance,frozen=await h.send(path+'/data.json',undefined,cookie)
 assert.deepEqual(frozen.value.paymentSchedule,selected.paymentSchedule);assert.deepEqual(frozen.value.selection.fees,selected.selection.fees);assert.equal(accepted.totalCents,1930000)
 await h.send(path+'/action?name=accept',{name:'Changed',optionId:'one',items:[],consent:true},cookie);assert.deepEqual((await row()).acceptance,accepted)
 await h.cmd('proposal.revise',{...input,id:p.id,version:4},h.owner,409);assert.deepEqual((await row()).acceptance,accepted,'An accepted term cannot be repriced')
 // Every supported interval crosses actual calendar boundaries, with an explicit independent expected set.
 for(const [interval,term,dates,yearValue] of [['weekly',3,['2099-01-31','2099-02-07','2099-02-14'],360000],['quarterly',5,['2099-01-31','2099-04-30','2099-07-31','2099-10-31','2100-01-31'],480000],['annual',2,['2099-01-31','2100-01-31'],120000]]){
  const f=recurringFixture();Object.assign(f.pricingTables[0].lines[1],{interval,term});f.pricingTables[0].lines.shift();const t=await h.cmd('proposal.prepare',{...input,...f})
  await h.cmd('proposal.approve',{id:t.id,version:1,revision:1});const url=new URL((await h.cmd('proposal.send',{id:t.id,version:2})).shareUrl).pathname,c=await verified(h,url),v=(await h.send(url+'/data.json?optionId=two',undefined,c)).value
  assert.deepEqual(v.paymentSchedule.rows.filter(r=>r.kind==='recurring').map(r=>r.date),dates);assert.equal(v.selection.fees.firstYearCents,yearValue);assert.equal(v.paymentSchedule.rows.reduce((n,r)=>n+r.amountCents,0),120000*term)
 }
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

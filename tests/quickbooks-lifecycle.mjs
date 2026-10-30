import assert from 'node:assert/strict'
import {harness} from './harness.mjs'
import {quickbooksFixture,connectQuickbooks,acceptedQuickbooksAgreement,quickbooksReviewInput} from './provider-network.mjs'

export async function quickbooksLifecycle(){
 const fake=quickbooksFixture(),h=await harness({outboundService:fake.outboundService})
 const state=async()=>(await h.state()).accounting,writes=()=>fake.calls.filter(c=>c.method==='POST')
 try{
  await connectQuickbooks(h,fake)
  const agreement=await acceptedQuickbooksAgreement(h,'Receipt readback agreement')
  const review=await h.cmd('accounting.review',quickbooksReviewInput(agreement,fake))
  await h.cmd('accounting.apply',{id:review.id,digest:review.digest,consent:true});await h.cmd('accounting.dispatch',{})
  const id=agreement.proposal.id,invoice=[...fake.invoices.values()][0],customer=[...fake.customers.values()][0]
  assert.equal((await h.cmd('accounting.readback',{proposalId:id})).status,'unpaid')
  const receipt=await h.cmd('payment.record',{id,method:'check',amount:'100.01',reference:'Synthetic check 104',receivedOn:'2030-03-02',consent:true})
  const input={paymentId:receipt.id,depositAccountId:fake.bank}
  const foreignBefore=await state(),foreignCalls=fake.calls.length
  await h.cmd('accounting.payment.review',{...input,invoiceTarget:'synthetic-platter-foreign:0'},h.owner,409)
  assert.deepEqual(await state(),foreignBefore);assert.equal(fake.calls.length,foreignCalls)
  const reviewed=await h.cmd('accounting.payment.review',input)
  assert.equal(reviewed.plan.balanceCents,25001);assert.equal(reviewed.plan.cents,10001)
  assert.equal(fake.payments.size,0)
  invoice.Balance=200
  const before=await state(),calls=writes().length
  await h.cmd('accounting.payment.apply',{id:reviewed.id,digest:reviewed.digest,consent:true},h.owner,409)
  assert.deepEqual(await state(),before);assert.equal(writes().length,calls)
  invoice.Balance=250.01
  const fresh=await h.cmd('accounting.payment.review',input),apply={id:fresh.id,digest:fresh.digest,consent:true}
  const results=await Promise.all([h.send('/api/platter/command',{name:'accounting.payment.apply',input:apply},h.owner),h.send('/api/platter/command',{name:'accounting.payment.apply',input:apply},h.owner)])
  assert.ok(results.some(r=>r.status===200));assert.ok(results.every(r=>[200,409].includes(r.status)))
  assert.equal(fake.payments.size,1)
  const payment=[...fake.payments.values()][0]
  assert.equal(payment.TotalAmt,100.01);assert.equal(payment.TxnDate,'2030-03-02');assert.equal(payment.PaymentRefNum,'Synthetic check 104')
  assert.deepEqual(payment.CustomerRef,{value:customer.Id});assert.deepEqual(payment.DepositToAccountRef,{value:fake.bank})
  assert.deepEqual(payment.Line,[{Amount:100.01,LinkedTxn:[{TxnId:invoice.Id,TxnType:'Invoice'}]}])
  assert.equal((await h.cmd('accounting.readback',{proposalId:id})).status,'partially_paid')
  assert.equal((await state()).observations[0].balance_cents,15000)
  await h.cmd('accounting.payment.apply',apply);assert.equal(fake.payments.size,1)
  invoice.TotalAmt=300
  assert.equal((await h.cmd('accounting.readback',{proposalId:id})).status,'mismatch')
  await h.cmd('accounting.payment.review',input,h.owner,409)
  invoice.TotalAmt=250.01
  const second=await h.cmd('payment.record',{id,method:'wire',amount:'150.00',reference:'Synthetic final wire',receivedOn:'2030-03-03',consent:true})
  const secondReview=await h.cmd('accounting.payment.review',{paymentId:second.id,depositAccountId:fake.bank})
  fake.setTimeout('payment')
  assert.equal((await h.cmd('accounting.payment.apply',{id:secondReview.id,digest:secondReview.digest,consent:true})).status,'uncertain')
  fake.setTimeout(undefined)
  await h.cmd('accounting.payment.apply',{id:secondReview.id,digest:secondReview.digest,consent:true})
  assert.equal(fake.payments.size,2,'a lost payment acknowledgement never replays the receipt')
  assert.equal((await h.cmd('accounting.readback',{proposalId:id})).status,'paid')
  assert.equal((await state()).observations[0].balance_cents,0)
  const confirmed=(await state()).postings.find(p=>p.payment_id===receipt.id)
  assert.equal(confirmed.status,'confirmed');assert.equal(confirmed.provider_id,payment.Id)
  const concurrent=await acceptedQuickbooksAgreement(h,'Concurrent receipt reservations')
  const concurrentReview=await h.cmd('accounting.review',quickbooksReviewInput(concurrent,fake))
  await h.cmd('accounting.apply',{id:concurrentReview.id,digest:concurrentReview.digest,consent:true});await h.cmd('accounting.dispatch',{})
  const paymentReviews=[]
  for(const reference of ['Synthetic check A','Synthetic check B']){
   const record=await h.cmd('payment.record',{id:concurrent.proposal.id,method:'check',amount:'200',reference,receivedOn:'2030-03-04',consent:true})
   paymentReviews.push(await h.cmd('accounting.payment.review',{paymentId:record.id,depositAccountId:fake.bank}))
  }
  const paymentsBefore=fake.payments.size
  const reservations=await Promise.all(paymentReviews.map(r=>h.send('/api/platter/command',{name:'accounting.payment.apply',input:{id:r.id,digest:r.digest,consent:true}},h.owner)))
  assert.deepEqual(reservations.map(r=>r.status).sort(),[200,409])
  assert.equal(fake.payments.size,paymentsBefore+1,'different receipts cannot concurrently overpay the same accepted amount')
  await h.cmd('provider.disconnect',{provider:'quickbooks',version:1})
  const disconnected=fake.calls.length
  await h.cmd('accounting.readback',{proposalId:id},h.owner,409)
  await h.cmd('accounting.payment.review',input,h.owner,409)
  assert.equal(fake.calls.length,disconnected)
 }finally{await h.close()}
}

export async function quickbooksSchedule(){
 const fake=quickbooksFixture(),h=await harness({outboundService:fake.outboundService})
 const tick=async day=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(day+'T15:00:00Z'),cron:'*/15 * * * *'})
 const apply=async(a)=>{const review=await h.cmd('accounting.review-scheduled',quickbooksReviewInput(a,fake));await h.cmd('accounting.apply',{id:review.id,digest:review.digest,consent:true});return review}
 try{
  await tick('2030-03-01');await connectQuickbooks(h,fake)
  const event=await acceptedQuickbooksAgreement(h,'Scheduled delivery',undefined,{paymentTerms:{netDays:30,milestones:[{label:'Delivery',percent:100,event:'Delivery complete'}],retainer:null}})
  const review=await apply(event)
  assert.equal(review.plan.schedule[1].amountCents,75002)
  await h.cmd('accounting.dispatch',{})
  assert.equal(fake.invoices.size,1,'acceptance and deposit issue never create an event milestone early')
  const index=1,proposalId=event.proposal.id
  await h.cmd('accounting.milestone',{proposalId,amountIndex:index,event:'Wrong event',consent:true},h.owner,409)
  await h.cmd('accounting.dispatch',{});assert.equal(fake.invoices.size,1)
  await h.cmd('accounting.milestone',{proposalId,amountIndex:index,event:'Delivery complete',consent:true})
  await Promise.all([h.cmd('accounting.dispatch',{}),h.cmd('accounting.dispatch',{}),tick('2030-03-01')])
  assert.equal(fake.invoices.size,2)
  const milestone=[...fake.invoices.values()][1]
  assert.equal(milestone.TotalAmt,750.02);assert.equal(milestone.TxnDate,'2030-03-01');assert.equal(milestone.DueDate,'2030-03-31')
  assert.equal(milestone.Line[0].Description,'Delivery')
  await h.cmd('accounting.milestone',{proposalId,amountIndex:index,event:'Delivery complete',consent:true},h.owner,409)
  await h.cmd('accounting.dispatch',{});assert.equal(fake.invoices.size,2)
  const receipt=await h.cmd('payment.record',{id:proposalId,method:'wire',amount:'750.02',reference:'Synthetic milestone wire',receivedOn:'2030-03-02',consent:true})
  const payment=await h.cmd('accounting.payment.review',{paymentId:receipt.id,amountIndex:1,depositAccountId:fake.bank})
  await h.cmd('accounting.payment.apply',{id:payment.id,digest:payment.digest,consent:true})
  assert.equal([...fake.payments.values()][0].Line[0].LinkedTxn[0].TxnId,milestone.Id)
  assert.equal((await h.cmd('accounting.readback',{proposalId,amountIndex:1})).status,'paid')
  assert.equal((await h.state()).accounting.amountObservations[0].balance_cents,0)

  const dated=await acceptedQuickbooksAgreement(h,'Date invoice',undefined,{paymentTerms:{netDays:15,milestones:[{label:'Dated delivery',percent:100,date:'2030-03-10'}]}})
  await apply(dated);await h.cmd('accounting.dispatch',{})
  assert.equal(fake.invoices.size,3)
  await tick('2030-03-09');assert.equal(fake.invoices.size,3)
  await tick('2030-03-10');assert.equal(fake.invoices.size,4)
  const datedInvoice=[...fake.invoices.values()][3]
  assert.equal(datedInvoice.TxnDate,'2030-03-10');assert.equal(datedInvoice.DueDate,'2030-03-25')

  const recurring=await acceptedQuickbooksAgreement(h,'Recurring invoice',undefined,{packages:[{id:'one',label:'Monthly consulting',price:'1'}],pricingTables:[{optionId:'one',name:'Consulting',lines:[{name:'Monthly care',quantity:'1',unit:'service',unitPrice:'1200',interval:'monthly',term:2,startsOn:'2030-04-01'}]}],paymentTerms:null})
  await h.cmd('accounting.review',quickbooksReviewInput(recurring,fake),h.owner,409)
  const recurringReview=await apply(recurring)
  assert.deepEqual(recurringReview.plan.schedule.map(r=>r.amountCents),[60000,60000,120000])
  await h.cmd('accounting.dispatch',{});assert.equal(fake.invoices.size,5)
  await tick('2030-03-31');assert.equal(fake.invoices.size,5)
  await tick('2030-04-01');assert.equal(fake.invoices.size,6)
  assert.equal([...fake.invoices.values()][5].TotalAmt,600)
  await Promise.all([tick('2030-04-01'),h.cmd('accounting.dispatch',{})]);assert.equal(fake.invoices.size,6)
  fake.setTimeout('invoice');await tick('2030-05-01');assert.equal(fake.invoices.size,7)
  fake.setTimeout(undefined);await tick('2030-06-01');await h.cmd('accounting.dispatch',{});assert.equal(fake.invoices.size,7)
  assert.equal((await h.state()).accounting.amounts.find(a=>a.proposal_id===recurring.proposal.id&&a.amount_index===2).status,'held')
  const slipped=await acceptedQuickbooksAgreement(h,'Delayed milestone dispatch',undefined,{paymentTerms:{netDays:30,milestones:[{label:'Delayed delivery',percent:100,event:'Delivery complete'}]}})
  await apply(slipped);await h.cmd('accounting.dispatch',{})
  await tick('2030-07-01')
  await h.cmd('accounting.milestone',{proposalId:slipped.proposal.id,amountIndex:1,event:'Delivery complete',consent:true})
  const delayedBefore=fake.invoices.size
  await tick('2030-07-02')
  assert.equal(fake.invoices.size,delayedBefore+1)
  assert.equal([...fake.invoices.values()].at(-1).TxnDate,'2030-07-01')
  assert.equal([...fake.invoices.values()].at(-1).DueDate,'2030-07-31')

 }finally{await h.close()}
}

export async function quickbooksTaxedLines(){
 const {configureTaxes,taxRequest,taxPackages,taxTables}=await import('./taxes-fixture.mjs')
 const fake=quickbooksFixture(),h=await harness({outboundService:fake.outboundService})
 try{
  await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-03-01T15:00:00Z'),cron:'*/15 * * * *'})
  await connectQuickbooks(h,fake);await configureTaxes(h.cmd)
  const secondItem='synthetic-platter-9410',secondAccount='synthetic-platter-9411'
  fake.items.set(secondItem,{Id:secondItem,Name:'Non-taxable consulting',Active:true,Type:'Service',IncomeAccountRef:{value:secondAccount}})
  fake.accounts.set(secondAccount,{Id:secondAccount,Name:'Other consulting income',Active:true,AccountType:'Income'})
  const tables=taxTables().map(t=>({...t,lines:t.lines.map((l,i)=>({...l,incomeAccount:i?secondAccount:fake.incomeAccount}))}))
  const agreement=await acceptedQuickbooksAgreement(h,'Frozen Austin lines',undefined,{packages:taxPackages(),pricingTables:tables,tax:taxRequest(),paymentTerms:{netDays:30,milestones:[{label:'Delivery',percent:100,event:'Delivery complete'}]}})
  const input={...quickbooksReviewInput(agreement,fake),lineMappings:[{key:'0',itemId:fake.item,incomeAccountId:fake.incomeAccount},{key:'1',itemId:secondItem,incomeAccountId:secondAccount}],taxGroupId:fake.taxGroup,includeSchedule:'yes'}
  await h.cmd('accounting.review',quickbooksReviewInput(agreement,fake),h.owner,409)
  await h.cmd('accounting.review-mapped',{...input,lineMappings:input.lineMappings.slice(0,1)},h.owner,409)
  await h.cmd('accounting.review-mapped',{...input,lineMappings:[input.lineMappings[0],{...input.lineMappings[1],itemId:fake.item,incomeAccountId:fake.incomeAccount}]},h.owner,409)
  const review=await h.cmd('accounting.review-mapped',input)
  assert.equal(review.plan.depositCents,39563);assert.equal(review.plan.lineDetails.tax.taxCents,8250)
  assert.deepEqual(review.plan.lineDetails.lines.map(l=>[l.netCents,l.taxCode,l.mapping.accountId]),[[100000,'synthetic-platter-service',fake.incomeAccount],[50000,'synthetic-platter-nontaxable',secondAccount]])
  fake.taxRates.get('synthetic-platter-9401').RateValue=7
  await h.cmd('accounting.apply',{id:review.id,digest:review.digest,consent:true},h.owner,409)
  assert.equal(fake.invoices.size,0);assert.equal((await h.state()).accounting.jobs.length,0)
  fake.taxRates.get('synthetic-platter-9401').RateValue=6.25
  await h.cmd('accounting.apply',{id:review.id,digest:review.digest,consent:true});await h.cmd('accounting.dispatch',{})
  assert.equal(fake.invoices.size,1)
  const invoice=[...fake.invoices.values()][0]
  assert.equal(invoice.TotalAmt,395.63)
  assert.deepEqual(invoice.Line.map(l=>[l.Amount,l.SalesItemLineDetail.ItemRef.value,l.SalesItemLineDetail.TaxCodeRef.value]),[[250,fake.item,'TAX'],[125,secondItem,'NON']])
  assert.equal(invoice.TxnTaxDetail.TotalTax,20.63);assert.equal(invoice.TxnTaxDetail.TxnTaxCodeRef.value,fake.taxGroup)
  assert.deepEqual(invoice.TxnTaxDetail.TaxLine.map(l=>[l.Amount,l.TaxLineDetail.TaxPercent,l.TaxLineDetail.NetAmountTaxable]),[[15.63,6.25,250],[2.5,1,250],[2.5,1,250]])
  await h.cmd('accounting.milestone',{proposalId:agreement.proposal.id,amountIndex:1,event:'Delivery complete',consent:true});await h.cmd('accounting.dispatch',{})
  const balance=[...fake.invoices.values()][1]
  assert.equal(balance.TotalAmt,1186.87);assert.deepEqual(balance.Line.map(l=>l.Amount),[750,375]);assert.equal(balance.TxnTaxDetail.TotalTax,61.87)
  assert.equal(invoice.TxnTaxDetail.TotalTax+balance.TxnTaxDetail.TotalTax,82.5)
  const optional=await acceptedQuickbooksAgreement(h,'Discounted selected taxable extras',undefined,{depositPercent:'100',packages:taxPackages(),pricingTables:tables,tax:taxRequest(),paymentTerms:null,acceptanceInput:{optionId:'two',items:[{id:'extra',quantity:3}]}})
  const optionalReview=await h.cmd('accounting.review-mapped',{...input,proposalId:optional.proposal.id,includeSchedule:'no',lineMappings:[...input.lineMappings,{key:'2',itemId:fake.item,incomeAccountId:fake.incomeAccount}]})
  assert.equal(optionalReview.plan.totalCents,144450)
  await h.cmd('accounting.apply',{id:optionalReview.id,digest:optionalReview.digest,consent:true});await h.cmd('accounting.dispatch',{})
  const optionalInvoice=[...fake.invoices.values()].at(-1)
  assert.deepEqual(optionalInvoice.Line.map(l=>l.Amount),[868.25,434.13,65.12])
  assert.equal(optionalInvoice.TxnTaxDetail.TotalTax,77)
  assert.equal(optionalInvoice.TotalAmt,1444.5)
  const immutable=JSON.parse((await h.state()).accounting.jobs[0].plan).lineDetails
  await h.cmd('tax.rate',{version:5,level:'state',region:'TX',percent:'7',startsOn:'2029-01-01'})
  assert.deepEqual(JSON.parse((await h.state()).accounting.jobs[0].plan).lineDetails,immutable)
 }finally{await h.close()}
}

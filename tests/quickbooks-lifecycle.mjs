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
  await h.cmd('provider.disconnect',{provider:'quickbooks',version:1})
  const disconnected=fake.calls.length
  await h.cmd('accounting.readback',{proposalId:id},h.owner,409)
  await h.cmd('accounting.payment.review',input,h.owner,409)
  assert.equal(fake.calls.length,disconnected)
 }finally{await h.close()}
}

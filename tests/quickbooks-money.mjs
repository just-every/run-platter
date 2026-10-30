import assert from 'node:assert/strict'
import {harness} from './harness.mjs'
import {quickbooksFixture,connectQuickbooks,acceptedQuickbooksAgreement,quickbooksReviewInput} from './provider-network.mjs'

export function quickbooksMoneyFixture(){
 const fake=quickbooksFixture(),qbo=fake.outboundService
 const stripeAccount='synthetic-platter-9500',chargeId='synthetic-platter-9501',balanceId='synthetic-platter-9502',payoutId='synthetic-platter-9503',stripeToken='synthetic-platter-9504',clearing='synthetic-platter-9505',expense='synthetic-platter-9506'
 fake.accounts.set(clearing,{Id:clearing,Name:'Stripe clearing',Active:true,AccountType:'Other Current Asset'})
 fake.accounts.set(expense,{Id:expense,Name:'Processor fees',Active:true,AccountType:'Expense'})
 const refunds=new Map(),balances=new Map(),stripeCalls=[]
 let proposalId,amount,fee=750,refunded=0,refundFee=0
 const created=Date.parse('2030-03-02T12:00:00Z')/1000
 const charge=()=>({id:chargeId,paid:true,status:'succeeded',amount,amount_refunded:refunded,currency:'usd',created,balance_transaction:balanceId,metadata:{platter_proposal_id:proposalId,platter_revision:'1'}})
 const balance=()=>({id:balanceId,type:'charge',source:chargeId,amount,fee,net:amount-fee,currency:'usd'})
 fake.outboundService=async request=>{
  const url=new URL(request.url)
  if(url.hostname!=='api.stripe.com')return qbo(request)
  assert.equal(request.headers.get('authorization'),'Bearer '+stripeToken)
  stripeCalls.push({method:request.method,path:url.pathname})
  if(url.pathname==='/v1/account')return Response.json({id:stripeAccount})
  if(url.pathname==='/v1/charges/'+chargeId)return Response.json(charge())
  if(url.pathname==='/v1/balance_transactions/'+balanceId)return Response.json(balance())
  if(url.pathname==='/v1/payouts/'+payoutId)return Response.json({id:payoutId,status:'paid',currency:'usd',amount:amount-fee,arrival_date:created+86400})
  if(url.pathname==='/v1/balance_transactions'){assert.equal(url.searchParams.get('payout'),payoutId);return Response.json({has_more:false,data:[balance()]})}
  if(request.method==='POST'&&url.pathname==='/v1/refunds'){
   const body=new URLSearchParams(await request.text()),cents=Number(body.get('amount'))
   assert.equal(body.get('charge'),chargeId)
   refunded+=cents;assert.ok(refunded<=amount)
   const id='synthetic-platter-'+(9600+refunds.size),bt='synthetic-platter-'+(9700+refunds.size),value={id,charge:chargeId,status:'succeeded',currency:'usd',amount:cents,created:created+172800,balance_transaction:bt}
   refunds.set(id,value);balances.set(bt,{id:bt,type:'refund',source:id,amount:-cents,fee:refundFee,net:-cents-refundFee,currency:'usd'})
   return Response.json(value)
  }
  if(url.pathname.startsWith('/v1/refunds/'))return Response.json(refunds.get(url.pathname.split('/').at(-1)))
  if(url.pathname.startsWith('/v1/balance_transactions/'))return Response.json(balances.get(url.pathname.split('/').at(-1)))
  throw Error('Unexpected Stripe accounting source')
 }
 return Object.assign(fake,{stripeAccount,chargeId,balanceId,payoutId,stripeToken,clearing,expense,stripeCalls,sourceRefunds:refunds,setCharge:(id,cents)=>{proposalId=id;amount=cents},setFee:value=>{fee=value},setRefundFee:value=>{refundFee=value}})
}
export async function postStripeReceipt(h,fake,agreement){
 fake.setCharge(agreement.proposal.id,25001)
 await h.cmd('provider.connect',{provider:'stripe',version:0,token:fake.stripeToken,consent:true})
 const payment=await h.cmd('payment.bind',{id:agreement.proposal.id,chargeId:fake.chargeId,consent:true})
 const review=await h.cmd('accounting.payment.review',{paymentId:payment.id,depositAccountId:fake.clearing})
 await h.cmd('accounting.payment.apply',{id:review.id,digest:review.digest,consent:true})
 return payment
}
export async function quickbooksMoney(){
 const fake=quickbooksMoneyFixture(),h=await harness({outboundService:fake.outboundService})
 const adjustment=async input=>h.cmd('accounting.adjustment.review',input)
 const apply=async review=>h.cmd('accounting.adjustment.apply',{id:review.id,digest:review.digest,consent:true})
 try{
  await connectQuickbooks(h,fake)
  const agreement=await acceptedQuickbooksAgreement(h,'Stripe clearing agreement'),id=agreement.proposal.id
  const review=await h.cmd('accounting.review',quickbooksReviewInput(agreement,fake));await h.cmd('accounting.apply',{id:review.id,digest:review.digest,consent:true});await h.cmd('accounting.dispatch',{})
  const payment=await postStripeReceipt(h,fake,agreement)
  assert.equal(fake.payments.size,1)
  const gross=[...fake.payments.values()][0]
  assert.equal(gross.TotalAmt,250.01);assert.equal(gross.DepositToAccountRef.value,fake.clearing);assert.equal(gross.TxnDate,'2030-03-02')
  await h.cmd('accounting.adjustment.review',{kind:'payout',paymentId:payment.id,payoutId:fake.payoutId,bankAccountId:fake.bank},h.owner,409)
  const feeInput={kind:'fee',paymentId:payment.id,expenseAccountId:fake.expense},feeReview=await adjustment(feeInput)
  fake.setFee(751)
  await h.cmd('accounting.adjustment.apply',{id:feeReview.id,digest:feeReview.digest,consent:true},h.owner,409)
  assert.equal(fake.journals.size,0)
  fake.setFee(750)
  const freshFee=await adjustment(feeInput)
  await Promise.all([apply(freshFee),h.cmd('accounting.dispatch',{})])
  const fee=[...fake.journals.values()][0]
  assert.deepEqual(fee.Line.map(l=>[l.Amount,l.JournalEntryLineDetail.PostingType,l.JournalEntryLineDetail.AccountRef.value]),[[7.5,'Debit',fake.expense],[7.5,'Credit',fake.clearing]])
  await apply(freshFee);assert.equal(fake.journals.size,1)
  const payout=await adjustment({kind:'payout',paymentId:payment.id,payoutId:fake.payoutId,bankAccountId:fake.bank})
  assert.equal(payout.plan.sourceFacts.amount,24251)
  await apply(payout);await apply(payout)
  assert.equal(fake.journals.size,2)
  const transfer=[...fake.journals.values()][1]
  assert.deepEqual(transfer.Line.map(l=>[l.Amount,l.JournalEntryLineDetail.PostingType,l.JournalEntryLineDetail.AccountRef.value]),[[242.51,'Debit',fake.bank],[242.51,'Credit',fake.clearing]])
  assert.equal(Math.round((gross.TotalAmt-fee.Line[1].Amount-transfer.Line[1].Amount)*100),0,'gross less fee and payout leaves clearing at zero')
  const refundInput={paymentId:payment.id,amount:'100',requestId:'synthetic-platter-9800',reason:'Reviewed synthetic refund',consent:true}
  const refund=await h.cmd('payment.refund',refundInput)
  assert.equal(refund.status,'succeeded')
  const reflect=await adjustment({kind:'refund',paymentId:payment.id,refundId:refund.id})
  await apply(reflect);await apply(reflect)
  assert.equal(fake.refundReceipts.size,1)
  const reflected=[...fake.refundReceipts.values()][0]
  assert.equal(reflected.TotalAmt,100);assert.equal(reflected.DepositToAccountRef.value,fake.clearing);assert.equal(reflected.CustomerRef.value,gross.CustomerRef.value)
  const second=await h.cmd('payment.refund',{...refundInput,amount:'50',requestId:'synthetic-platter-9801'})
  const secondReview=await adjustment({kind:'refund',paymentId:payment.id,refundId:second.id})
  fake.setTimeout('refundreceipt')
  assert.equal((await apply(secondReview)).status,'uncertain')
  fake.setTimeout(undefined);await apply(secondReview)
  assert.equal(fake.refundReceipts.size,2,'a lost refund reflection acknowledgement cannot post another refund')
  fake.setRefundFee(-100)
  const feeRefund=await h.cmd('payment.refund',{...refundInput,amount:'25',requestId:'synthetic-platter-9802'})
  await h.cmd('accounting.adjustment.review',{kind:'refund_fee',paymentId:payment.id,refundId:feeRefund.id,expenseAccountId:fake.expense},h.owner,409)
  await apply(await adjustment({kind:'refund',paymentId:payment.id,refundId:feeRefund.id}))
  const refundFee=await adjustment({kind:'refund_fee',paymentId:payment.id,refundId:feeRefund.id,expenseAccountId:fake.expense})
  await apply(refundFee);await apply(refundFee)
  const reversal=[...fake.journals.values()].at(-1)
  assert.deepEqual(reversal.Line.map(l=>[l.Amount,l.JournalEntryLineDetail.PostingType,l.JournalEntryLineDetail.AccountRef.value]),[[1,'Debit',fake.clearing],[1,'Credit',fake.expense]])
  const state=(await h.state()).accounting
  assert.equal(state.adjustments.filter(a=>a.status==='confirmed').length,5)
  assert.equal(state.adjustments.filter(a=>a.status==='uncertain').length,1)
  assert.ok(!JSON.stringify(state).includes(fake.stripeToken))
  await h.cmd('provider.disconnect',{provider:'stripe',version:1})
  const calls=fake.calls.length
  await h.cmd('accounting.adjustment.review',feeInput,h.owner,409)
  assert.equal(fake.calls.length,calls)
 }finally{await h.close()}
}

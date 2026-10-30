import assert from 'node:assert/strict'
import { allocationAgreement, receiptInput, allocationInput } from './payment-allocation-fixture.mjs'

export function offlineAccountingFake() {
 const invoices = new Map(), calls = [], writes = [], payments = [], issueWrites=[]
 const fake = { invoices, calls, writes, payments, issueWrites, mode: 'ok', customerName:'Synthetic reviewed customer', incomeAccount:'synthetic-platter-income', beforeRead: null, beforeWrite: null,
  invoice(id='synthetic-platter-invoice-1', extra={}) { const value={ Id:id,CustomerRef:{value:'synthetic-platter-customer-1'},DocNumber:'SYN-700',CurrencyRef:{value:'USD'},TotalAmt:700,Balance:700,DueDate:'2000-01-15',CustomerMemo:{value:'Send a check to Synthetic Studio, 100 Example Street. Use the invoice number as reference.'},...extra }; invoices.set(id,value); return value },
  async receive(request) {
   const url=new URL(request.url);assert.equal(url.hostname,'quickbooks.api.intuit.com')
   calls.push({path:url.pathname,method:request.method})
   if(url.pathname.includes('/companyinfo/'))return Response.json({CompanyInfo:{CompanyName:'Synthetic company'}})
   if(request.method==='GET'){
    if(fake.beforeRead){const action=fake.beforeRead;fake.beforeRead=null;await action()}
    if(url.pathname.includes('/customer/')){const id=url.pathname.split('/').at(-1);return Response.json({Customer:{Id:id,DisplayName:fake.customerName,Active:true,CurrencyRef:{value:'USD'}}})}
    if(url.pathname.includes('/item/')){const id=url.pathname.split('/').at(-1);return Response.json({Item:{Id:id,Name:'Synthetic reviewed service',Type:'Service',Active:true,IncomeAccountRef:{value:fake.incomeAccount}}})}
    if(url.pathname.includes('/paymentmethod/')){const id=url.pathname.split('/').at(-1);return Response.json({PaymentMethod:{Id:id,Active:true,Name:{check:'Check',wire:'Wire',ach_credit:'ACH Credit'}[id]??'Cash'}})}
    const invoice=invoices.get(url.pathname.split('/').at(-1));assert.ok(invoice,'existing provider invoice requested');return Response.json({Invoice:invoice})
   }
   if(url.pathname.endsWith('/invoice')){const payload=await request.json();issueWrites.push({payload,requestId:url.searchParams.get('requestid')});if(fake.mode==='timeout')throw Error('synthetic-platter-uncertain-invoice');const invoice=fake.invoice('synthetic-platter-issued-'+issueWrites.length,{...payload,DocNumber:'SYN-ISSUED-'+issueWrites.length,TotalAmt:payload.Line[0].Amount,Balance:payload.Line[0].Amount});return Response.json({Invoice:invoice})}
   assert.ok(url.pathname.endsWith('/payment'))
   const payload=await request.json();writes.push({payload,requestId:url.searchParams.get('requestid')})
   if(fake.beforeWrite){const action=fake.beforeWrite;fake.beforeWrite=null;await action()}
   if(fake.mode==='timeout')throw Error('synthetic-platter-uncertain-write')
   const invoice=invoices.get(payload.Line[0].LinkedTxn[0].TxnId);invoice.Balance=Math.round((invoice.Balance-payload.TotalAmt)*100)/100
   const payment={...payload,Id:'synthetic-platter-payment-'+writes.length};payments.push(payment)
   if(fake.mode==='wrong-receipt')return Response.json({Payment:{...payment,CustomerRef:{value:'synthetic-platter-wrong-customer'}}})
   return Response.json({Payment:payment})
  }
 }
 return fake
}
export async function connectOfflineAccounting(h) {
 return h.cmd('provider.connect',{provider:'quickbooks',version:0,realmId:'synthetic-platter-realm-1',token:'synthetic-platter-token-1',consent:true})
}
export async function invoiceLinkInput(h,id,invoiceId='synthetic-platter-invoice-1') {
 const s=await h.state(),schedule=s.paymentSchedules.find(x=>x.proposalId===id),row=schedule.rows[0],c=s.connections.find(x=>x.provider==='quickbooks')
 return {id,rowIndex:row.index,agreementHash:schedule.agreementHash,rowHash:row.rowHash,invoiceId,customerId:'synthetic-platter-customer-1',documentNumber:'SYN-700',connectionVersion:c.version,consent:true}
}
export const accountingSyncInput=(id,allocationId,methodId='check')=>({id,allocationId,requestId:crypto.randomUUID(),methodId,consent:true})

export async function offlineAccountingJourney(h,fake,billing,sales) {
 await connectOfflineAccounting(h)
 const agreement=await allocationAgreement(h),original=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(agreement.id).first()
 fake.invoice()
 const link=await invoiceLinkInput(h,agreement.id)
 const financial=async()=>Object.fromEntries(await Promise.all(['p_offline_invoices','p_offline_invoice_authority','p_offline_accounting','p_payment_records','p_payment_allocations','p_acceptances','p_invoices','p_audit'].map(async table=>[table,(await h.db.prepare('SELECT * FROM '+table+' ORDER BY rowid').all()).results])))
 const refuse=async(name,input,cookie,status=409)=>{const before=await financial(),writes=fake.writes.length;await h.cmd(name,input,cookie,status);assert.deepEqual(await financial(),before);assert.equal(fake.writes.length,writes)}
 await refuse('payment.invoice-link',link,billing.cookie,403)
 await refuse('payment.invoice-link',link,sales.cookie,403)
 for(const change of [{customerId:'synthetic-platter-wrong-customer'},{documentNumber:'wrong'},{connectionVersion:0},{rowHash:'0'.repeat(64)}])await refuse('payment.invoice-link',{...link,...change},h.owner)
 for(const extra of [{CurrencyRef:{value:'AUD'}},{TotalAmt:701},{Balance:699},{CustomerMemo:{value:''}}]){fake.invoice('synthetic-platter-invoice-1',extra);await refuse('payment.invoice-link',link,h.owner)}
 fake.invoice();await h.cmd('payment.invoice-link',link)
 let state=await h.state(billing.cookie);assert.deepEqual(state.offlineInvoices.map(x=>[x.document_number,x.total_cents,x.balance_cents,x.overdue,x.authorized,x.remittance]),[['SYN-700',70000,70000,true,1,'Send a check to Synthetic Studio, 100 Example Street. Use the invoice number as reference.']])
 assert.equal((await h.send('/api/platter/offline-invoices?overdue=yes',undefined,billing.cookie)).value.count,1)
 await h.send('/api/platter/offline-invoices',undefined,sales.cookie).then(r=>assert.equal(r.status,403))
 for(const [method,amount,remaining] of [['check','300',40000],['wire','200',20000],['ach_credit','200',0]]){
  const receipt=await h.cmd('payment.record',receiptInput(agreement.id,method,amount),billing.cookie),allocation=await allocationInput(h,agreement.id,receipt.id,amount);await h.cmd('payment.allocate',allocation,billing.cookie)
  const sync=accountingSyncInput(agreement.id,allocation.requestId,method)
  await refuse('payment.accounting-sync',sync,sales.cookie,403)
  await refuse('payment.accounting-sync',{...sync,consent:false},billing.cookie,400)
  await refuse('payment.accounting-sync',{...sync,methodId:'cash'},billing.cookie)
  const priorBalance=fake.invoices.get('synthetic-platter-invoice-1').Balance;fake.invoices.get('synthetic-platter-invoice-1').Balance=priorBalance-1
  await refuse('payment.accounting-sync',sync,billing.cookie);fake.invoices.get('synthetic-platter-invoice-1').Balance=priorBalance
  const writes=fake.writes.length,results=await Promise.all([1,2].map(()=>h.send('/api/platter/command',{name:'payment.accounting-sync',input:sync},billing.cookie)))
  assert.ok(results.some(x=>x.status===200));assert.ok(results.every(x=>[200,409].includes(x.status)));assert.equal(fake.writes.length,writes+1)
  assert.deepEqual(fake.writes.at(-1),{requestId:sync.requestId,payload:{CustomerRef:{value:'synthetic-platter-customer-1'},CurrencyRef:{value:'USD'},TotalAmt:Number(amount),TxnDate:'2030-01-15',PaymentMethodRef:{value:method},PrivateNote:'synthetic-platter-9901-'+method,Line:[{Amount:Number(amount),LinkedTxn:[{TxnId:'synthetic-platter-invoice-1',TxnType:'Invoice'}]}]}})
  assert.equal((await h.cmd('payment.accounting-sync',sync,billing.cookie)).status,'confirmed');assert.equal(fake.writes.length,writes+1)
  await refuse('payment.accounting-sync',{...sync,requestId:crypto.randomUUID()},billing.cookie)
  state=await h.state(billing.cookie);assert.equal(state.offlineInvoices[0].balance_cents,remaining);assert.equal(state.offlineInvoices[0].overdue,remaining!==0)
 }
 assert.deepEqual((await h.send('/api/platter/offline-invoices?overdue=yes',undefined,billing.cookie)).value.rows,[]);
 assert.equal(state.offlineInvoices[0].balanceStatus,'paid');assert.equal(state.offlineAccounting.filter(x=>x.status==='confirmed').length,3)
 assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(agreement.id).first(),original)
 assert.equal(JSON.stringify(state.offlineAccounting).includes('synthetic-platter-token-1'),false)
 assert.deepEqual((await h.state(sales.cookie)).offlineInvoices,[])
 const paidCheck=await allocationAgreement(h);fake.invoice('synthetic-platter-invoice-check');await h.cmd('payment.invoice-link',await invoiceLinkInput(h,paidCheck.id,'synthetic-platter-invoice-check'))
 const fullCheck=await h.cmd('payment.record',{...receiptInput(paidCheck.id,'check','700'),reference:'Synthetic check 123'},billing.cookie),fullAllocation=await allocationInput(h,paidCheck.id,fullCheck.id,'700');await h.cmd('payment.allocate',fullAllocation,billing.cookie)
 const fullSync=accountingSyncInput(paidCheck.id,fullAllocation.requestId);assert.equal((await h.cmd('payment.accounting-sync',fullSync,billing.cookie)).status,'confirmed');assert.equal(fake.writes.at(-1).payload.PaymentRefNum,'Synthetic check 123')
 assert.equal((await h.state(billing.cookie)).offlineInvoices.find(x=>x.proposal_id===paidCheck.id).balanceStatus,'paid')
 assert.ok(!(await h.send('/api/platter/offline-invoices?overdue=yes',undefined,billing.cookie)).value.rows.some(x=>x.proposal_id===paidCheck.id))
 // A provider-confirmed write whose response is lost stays held, even under a new request identity.
 const uncertain=await allocationAgreement(h);fake.invoice('synthetic-platter-invoice-2');await h.cmd('payment.invoice-link',await invoiceLinkInput(h,uncertain.id,'synthetic-platter-invoice-2'))
 const receipt=await h.cmd('payment.record',receiptInput(uncertain.id,'check','300'),billing.cookie),allocation=await allocationInput(h,uncertain.id,receipt.id);await h.cmd('payment.allocate',allocation,billing.cookie)
 const request=accountingSyncInput(uncertain.id,allocation.requestId),writes=fake.writes.length;fake.mode='timeout'
 assert.equal((await h.cmd('payment.accounting-sync',request,billing.cookie)).status,'needs_review');assert.equal(fake.writes.length,writes+1)
 assert.equal((await h.cmd('payment.accounting-sync',request,billing.cookie)).status,'needs_review');assert.equal(fake.writes.length,writes+1)
 await refuse('payment.accounting-sync',{...request,requestId:crypto.randomUUID()},billing.cookie)
 fake.mode='ok'
 // A response naming the wrong customer never confirms payment or clears the overdue invoice.
 const wrong=await allocationAgreement(h);fake.invoice('synthetic-platter-invoice-wrong');await h.cmd('payment.invoice-link',await invoiceLinkInput(h,wrong.id,'synthetic-platter-invoice-wrong'))
 const wrongReceipt=await h.cmd('payment.record',receiptInput(wrong.id),billing.cookie),wrongAllocation=await allocationInput(h,wrong.id,wrongReceipt.id);await h.cmd('payment.allocate',wrongAllocation,billing.cookie)
 fake.mode='wrong-receipt';const wrongRequest=accountingSyncInput(wrong.id,wrongAllocation.requestId);assert.equal((await h.cmd('payment.accounting-sync',wrongRequest,billing.cookie)).status,'needs_review');fake.mode='ok'
 const retained=(await h.state()).offlineInvoices.find(x=>x.proposal_id===wrong.id);assert.equal(retained.balance_cents,70000);assert.equal(retained.overdue,true)
 // Demotion while fetching provider facts must prevent the later accounting write.
 const revoked=await allocationAgreement(h);fake.invoice('synthetic-platter-invoice-3');await h.cmd('payment.invoice-link',await invoiceLinkInput(h,revoked.id,'synthetic-platter-invoice-3'))
 const revokedReceipt=await h.cmd('payment.record',receiptInput(revoked.id),billing.cookie),revokedAllocation=await allocationInput(h,revoked.id,revokedReceipt.id);await h.cmd('payment.allocate',revokedAllocation,billing.cookie)
 fake.beforeRead=()=>h.cmd('member.set',{operatorId:billing.id,version:1,role:'sales',teams:[]})
 const count=fake.writes.length;await h.cmd('payment.accounting-sync',accountingSyncInput(revoked.id,revokedAllocation.requestId),billing.cookie,409);assert.equal(fake.writes.length,count)
 const ownerRequest=accountingSyncInput(revoked.id,revokedAllocation.requestId)
 fake.beforeRead=()=>h.cmd('provider.disconnect',{provider:'quickbooks',version:1})
 await h.cmd('payment.accounting-sync',ownerRequest,h.owner,409);assert.equal(fake.writes.length,count)
 await h.cmd('provider.connect',{provider:'quickbooks',version:2,realmId:'synthetic-platter-realm-1',token:'synthetic-platter-token-2',consent:true})
 await refuse('payment.accounting-sync',ownerRequest,h.owner);assert.equal(fake.writes.length,count)
}

export async function invoicePreparationInput(h,id){
 const schedule=(await h.state()).paymentSchedules.find(x=>x.proposalId===id),row=schedule.rows[0],connection=(await h.state()).connections.find(x=>x.provider==='quickbooks')
 return {id,rowIndex:row.index,agreementHash:schedule.agreementHash,rowHash:row.rowHash,connectionVersion:connection.version,customerId:'synthetic-platter-customer-1',itemId:'synthetic-platter-item-1',remittance:'Send a check to Synthetic Studio, 100 Example Street. Reference the invoice number.',consent:true}
}
export async function offlineInvoiceJourney(h,fake,sales){
 await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2030-06-01T12:00:00Z'),cron:'*/15 * * * *'})
 const agreement=await allocationAgreement(h,{paymentTerms:{netDays:30,milestones:[{label:'Delivered scope',date:'2030-06-01',percent:100}]}}),input=await invoicePreparationInput(h,agreement.id)
 const before=(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(agreement.id).first())
 await h.cmd('payment.invoice-prepare',input,sales.cookie,403)
 const prepared=await h.cmd('payment.invoice-prepare',input),request={id:agreement.id,requestId:prepared.id,reviewHash:prepared.reviewHash,consent:true}
 assert.equal(fake.issueWrites.length,0,'preparing is a read-only provider operation')
 await h.cmd('payment.invoice-issue',request,sales.cookie,403)
 await h.cmd('payment.invoice-issue',{...request,reviewHash:'0'.repeat(64)},h.owner,409)
 await h.cmd('payment.invoice-issue',{...request,consent:false},h.owner,400);assert.equal(fake.issueWrites.length,0)
 fake.customerName='Changed customer';await h.cmd('payment.invoice-issue',request,h.owner,409);fake.customerName='Synthetic reviewed customer'
 fake.incomeAccount='Changed income account';await h.cmd('payment.invoice-issue',request,h.owner,409);fake.incomeAccount='synthetic-platter-income';assert.equal(fake.issueWrites.length,0)
 const attempts=await Promise.all([1,2].map(()=>h.send('/api/platter/command',{name:'payment.invoice-issue',input:request},h.owner)))
 assert.ok(attempts.some(x=>x.status===200));assert.ok(attempts.every(x=>[200,409].includes(x.status)));assert.equal(fake.issueWrites.length,1)
 assert.deepEqual(fake.issueWrites[0],{requestId:prepared.id,payload:{CustomerRef:{value:'synthetic-platter-customer-1'},CurrencyRef:{value:'USD'},TxnDate:'2030-06-01',DueDate:'2030-07-01',CustomerMemo:{value:input.remittance},Line:[{Amount:700,Description:'Delivered scope',DetailType:'SalesItemLineDetail',SalesItemLineDetail:{ItemRef:{value:'synthetic-platter-item-1'},Qty:1,UnitPrice:700,TaxCodeRef:{value:'NON'}}}]}})
 assert.equal((await h.cmd('payment.invoice-issue',request)).status,'confirmed');assert.equal(fake.issueWrites.length,1)
 const invoice=(await h.state()).offlineInvoices.find(x=>x.proposal_id===agreement.id);assert.deepEqual([invoice.document_number,invoice.total_cents,invoice.due_on,invoice.remittance],['SYN-ISSUED-1',70000,'2030-07-01',input.remittance])
 await h.cmd('payment.invoice-prepare',input,h.owner,409);assert.equal(fake.issueWrites.length,1)
 const privateInvoices=await h.send(agreement.path+'/invoices.json',undefined,agreement.cookie);assert.equal(privateInvoices.status,200,privateInvoices.text);assert.deepEqual(privateInvoices.value.invoices,[])
 assert.equal((await h.send(agreement.path+'/invoices.json')).status,401)
 const share={id:agreement.id,invoiceId:invoice.id,enabled:'yes',consent:true},custody=async()=>Object.fromEntries(await Promise.all(['p_offline_invoice_publications','p_offline_invoice_visibility','p_offline_invoices','p_audit'].map(async t=>[t,(await h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()).results])))
 const shareBefore=await custody();await h.cmd('payment.invoice-share',share,sales.cookie,403);assert.deepEqual(await custody(),shareBefore)
 await h.cmd('payment.invoice-share',{...share,consent:false},h.owner,400);assert.deepEqual(await custody(),shareBefore)
 await h.cmd('payment.invoice-share',share)
 const clientInvoices=await h.send(agreement.path+'/invoices.json',undefined,agreement.cookie)
 assert.deepEqual(clientInvoices.value.invoices,[{number:'SYN-ISSUED-1',currency:'USD',totalCents:70000,balanceCents:70000,issuedOn:'2030-06-01',dueOn:'2030-07-01',remittance:input.remittance,status:'due'}])
 assert.doesNotMatch(clientInvoices.text,/synthetic-platter-(?:token|realm|customer|income|item)/)
 const clientPage=await h.send(agreement.path,undefined,agreement.cookie);assert.equal(clientPage.status,200);assert.match(clientPage.text,/Invoice SYN-ISSUED-1/);assert.ok(clientPage.text.includes(input.remittance))
 const other=await allocationAgreement(h);assert.deepEqual((await h.send(other.path+'/invoices.json',undefined,other.cookie)).value.invoices,[])
 assert.equal((await h.send(other.path+'/invoices.json',undefined,agreement.cookie)).status,401)
 await h.cmd('payment.invoice-share',{...share,enabled:'no'});assert.deepEqual((await h.send(agreement.path+'/invoices.json',undefined,agreement.cookie)).value.invoices,[])

 assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(agreement.id).first(),before)
 const future=await allocationAgreement(h,{paymentTerms:{netDays:15,milestones:[{label:'Future delivery',date:'2030-06-02',percent:100}]}}),futurePreview=await h.cmd('payment.invoice-prepare',await invoicePreparationInput(h,future.id))
 await h.cmd('payment.invoice-issue',{id:future.id,requestId:futurePreview.id,reviewHash:futurePreview.reviewHash,consent:true},h.owner,409);assert.equal(fake.issueWrites.length,1,'no invoice is issued before its date')
 const uncertain=await allocationAgreement(h,{paymentTerms:{netDays:15,milestones:[{label:'Uncertain delivery',date:'2030-06-01',percent:100}]}}),uncertainInput=await invoicePreparationInput(h,uncertain.id),uncertainPreview=await h.cmd('payment.invoice-prepare',uncertainInput),uncertainRequest={id:uncertain.id,requestId:uncertainPreview.id,reviewHash:uncertainPreview.reviewHash,consent:true}
 fake.mode='timeout';assert.equal((await h.cmd('payment.invoice-issue',uncertainRequest)).status,'needs_review');fake.mode='ok'
 assert.equal((await h.cmd('payment.invoice-issue',uncertainRequest)).status,'needs_review');assert.equal(fake.issueWrites.length,2)
 const later=await h.cmd('payment.invoice-prepare',uncertainInput);await h.cmd('payment.invoice-issue',{id:uncertain.id,requestId:later.id,reviewHash:later.reviewHash,consent:true},h.owner,409);assert.equal(fake.issueWrites.length,2)
 const event=await allocationAgreement(h,{paymentTerms:{netDays:30,milestones:[{label:'Approved event delivery',event:'Client approves delivery',percent:100}]}}),eventPreview=await h.cmd('payment.invoice-prepare',await invoicePreparationInput(h,event.id)),eventRequest={id:event.id,requestId:eventPreview.id,reviewHash:eventPreview.reviewHash,consent:true}
 await h.cmd('payment.invoice-issue',eventRequest,h.owner,409);assert.equal(fake.issueWrites.length,2)
 const {completeEventInput}=await import('./payment-allocation-fixture.mjs');await h.cmd('payment.milestone-complete',{...await completeEventInput(h,event.id),completedOn:'2030-06-01'})
 assert.equal((await h.cmd('payment.invoice-issue',eventRequest)).status,'confirmed');assert.equal(fake.issueWrites.length,3)
 const recurring=await allocationAgreement(h,{depositPercent:'30',paymentTerms:null,pricingTables:[{optionId:'main',name:'Monthly care',lines:[{name:'Care',quantity:'1',unit:'month',unitPrice:'1000',interval:'monthly',term:3,startsOn:'2031-01-31'}]}]})
 await (await h.mf.getWorker()).scheduled({scheduledTime:new Date('2031-01-31T12:00:00Z'),cron:'*/15 * * * *'});assert.equal(fake.issueWrites.length,3,'a schedule alone grants no outbound invoice authority')
 const monthly=await h.cmd('payment.invoice-prepare',await invoicePreparationInput(h,recurring.id));assert.equal((await h.cmd('payment.invoice-issue',{id:recurring.id,requestId:monthly.id,reviewHash:monthly.reviewHash,consent:true})).status,'confirmed')
 assert.equal(fake.issueWrites.at(-1).payload.Line[0].Amount,100,'the issued installment excludes the retained deposit credit')
 const receipt=await h.cmd('payment.record',receiptInput(recurring.id,'ach_credit','100')),allocation=await allocationInput(h,recurring.id,receipt.id,'100');await h.cmd('payment.allocate',allocation)
 assert.equal((await h.cmd('payment.accounting-sync',accountingSyncInput(recurring.id,allocation.requestId,'ach_credit'))).status,'confirmed')
 const rows=(await h.state()).paymentSchedules.find(x=>x.proposalId===recurring.id).rows;assert.deepEqual(rows.map(x=>x.remainingCents),[0,100000,100000])
 assert.equal((await h.state()).offlineInvoices.find(x=>x.proposal_id===recurring.id).balance_cents,0)

}

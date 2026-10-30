import assert from 'node:assert/strict'
import { allocationAgreement, receiptInput, allocationInput } from './payment-allocation-fixture.mjs'

export function offlineAccountingFake() {
 const invoices = new Map(), calls = [], writes = [], payments = []
 const fake = { invoices, calls, writes, payments, mode: 'ok', beforeRead: null, beforeWrite: null,
  invoice(id='synthetic-platter-invoice-1', extra={}) { const value={ Id:id,CustomerRef:{value:'synthetic-platter-customer-1'},DocNumber:'SYN-700',CurrencyRef:{value:'USD'},TotalAmt:700,Balance:700,DueDate:'2000-01-15',CustomerMemo:{value:'Send a check to Synthetic Studio, 100 Example Street. Use the invoice number as reference.'},...extra }; invoices.set(id,value); return value },
  async receive(request) {
   const url=new URL(request.url);assert.equal(url.hostname,'quickbooks.api.intuit.com')
   calls.push({path:url.pathname,method:request.method})
   if(url.pathname.includes('/companyinfo/'))return Response.json({CompanyInfo:{CompanyName:'Synthetic company'}})
   if(request.method==='GET'){
    if(fake.beforeRead){const action=fake.beforeRead;fake.beforeRead=null;await action()}
    if(url.pathname.includes('/paymentmethod/')){const id=url.pathname.split('/').at(-1);return Response.json({PaymentMethod:{Id:id,Active:true,Name:{check:'Check',wire:'Wire',ach_credit:'ACH Credit'}[id]??'Cash'}})}
    const invoice=invoices.get(url.pathname.split('/').at(-1));assert.ok(invoice,'existing provider invoice requested');return Response.json({Invoice:invoice})
   }
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
 for(const [method,amount,remaining] of [['check','300',40000],['wire','200',20000],['ach_credit','200',0]]){
  const receipt=await h.cmd('payment.record',receiptInput(agreement.id,method,amount),billing.cookie),allocation=await allocationInput(h,agreement.id,receipt.id,amount);await h.cmd('payment.allocate',allocation,billing.cookie)
  const sync=accountingSyncInput(agreement.id,allocation.requestId,method)
  await refuse('payment.accounting-sync',sync,sales.cookie,403)
  await refuse('payment.accounting-sync',{...sync,consent:false},billing.cookie,400)
  await refuse('payment.accounting-sync',{...sync,methodId:'cash'},billing.cookie)
  const writes=fake.writes.length,results=await Promise.all([1,2].map(()=>h.send('/api/platter/command',{name:'payment.accounting-sync',input:sync},billing.cookie)))
  assert.ok(results.some(x=>x.status===200));assert.ok(results.every(x=>[200,409].includes(x.status)));assert.equal(fake.writes.length,writes+1)
  assert.deepEqual(fake.writes.at(-1),{requestId:sync.requestId,payload:{CustomerRef:{value:'synthetic-platter-customer-1'},CurrencyRef:{value:'USD'},TotalAmt:Number(amount),TxnDate:'2030-01-15',PaymentMethodRef:{value:method},PrivateNote:'synthetic-platter-9901-'+method,Line:[{Amount:Number(amount),LinkedTxn:[{TxnId:'synthetic-platter-invoice-1',TxnType:'Invoice'}]}]}})
  assert.equal((await h.cmd('payment.accounting-sync',sync,billing.cookie)).status,'confirmed');assert.equal(fake.writes.length,writes+1)
  await refuse('payment.accounting-sync',{...sync,requestId:crypto.randomUUID()},billing.cookie)
  state=await h.state(billing.cookie);assert.equal(state.offlineInvoices[0].balance_cents,remaining);assert.equal(state.offlineInvoices[0].overdue,remaining!==0)
 }
 assert.equal(state.offlineInvoices[0].balanceStatus,'paid');assert.equal(state.offlineAccounting.filter(x=>x.status==='confirmed').length,3)
 assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(agreement.id).first(),original)
 assert.equal(JSON.stringify(state.offlineAccounting).includes('synthetic-platter-token-1'),false)
 assert.deepEqual((await h.state(sales.cookie)).offlineInvoices,[])
 // A provider-confirmed write whose response is lost stays held, even under a new request identity.
 const uncertain=await allocationAgreement(h);fake.invoice('synthetic-platter-invoice-2');await h.cmd('payment.invoice-link',await invoiceLinkInput(h,uncertain.id,'synthetic-platter-invoice-2'))
 const receipt=await h.cmd('payment.record',receiptInput(uncertain.id,'check','300'),billing.cookie),allocation=await allocationInput(h,uncertain.id,receipt.id);await h.cmd('payment.allocate',allocation,billing.cookie)
 const request=accountingSyncInput(uncertain.id,allocation.requestId),writes=fake.writes.length;fake.mode='timeout'
 assert.equal((await h.cmd('payment.accounting-sync',request,billing.cookie)).status,'needs_review');assert.equal(fake.writes.length,writes+1)
 assert.equal((await h.cmd('payment.accounting-sync',request,billing.cookie)).status,'needs_review');assert.equal(fake.writes.length,writes+1)
 await refuse('payment.accounting-sync',{...request,requestId:crypto.randomUUID()},billing.cookie)
 fake.mode='ok'
 // Demotion while fetching provider facts must prevent the later accounting write.
 const revoked=await allocationAgreement(h);fake.invoice('synthetic-platter-invoice-3');await h.cmd('payment.invoice-link',await invoiceLinkInput(h,revoked.id,'synthetic-platter-invoice-3'))
 const revokedReceipt=await h.cmd('payment.record',receiptInput(revoked.id),billing.cookie),revokedAllocation=await allocationInput(h,revoked.id,revokedReceipt.id);await h.cmd('payment.allocate',revokedAllocation,billing.cookie)
 fake.beforeRead=()=>h.cmd('member.set',{operatorId:billing.id,version:1,role:'sales',teams:[]})
 const count=fake.writes.length;await h.cmd('payment.accounting-sync',accountingSyncInput(revoked.id,revokedAllocation.requestId),billing.cookie,409);assert.equal(fake.writes.length,count)
 const ownerRequest=accountingSyncInput(revoked.id,revokedAllocation.requestId)
 fake.beforeRead=()=>h.cmd('provider.disconnect',{provider:'quickbooks',version:1})
 await h.cmd('payment.accounting-sync',ownerRequest,h.owner,409);assert.equal(fake.writes.length,count)
}

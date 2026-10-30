import assert from 'node:assert/strict'

export async function allocationAgreement(h, extra={}) {
 const client=await h.cmd('client.save',{name:'Synthetic allocation client',email:'synthetic-platter-9900-'+crypto.randomUUID()+String.fromCharCode(64)+'example.test'})
 const input={clientId:client.id,title:'Synthetic dated delivery',scope:'An agreed one-off delivery',packages:[{id:'main',label:'Delivery',price:'1000'}],depositPercent:'30',paymentTerms:{netDays:15,milestones:[{label:'Dated delivery',date:'2099-06-01',percent:100}]},...extra}
 const p=await h.cmd('proposal.prepare',input)
 let row=(await h.state()).proposals.find(x=>x.id===p.id)
 if(!row.approval.complete){await h.cmd('proposal.approve',{id:p.id,version:row.version,revision:row.revision});row=(await h.state()).proposals.find(x=>x.id===p.id)}
 const path=new URL((await h.cmd('proposal.send',{id:p.id,version:row.version})).shareUrl).pathname
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const mail=await h.db.prepare("SELECT body FROM p_mail WHERE proposal_id=? AND subject='Your Platter verification code' ORDER BY created_at DESC LIMIT 1").bind(p.id).first()
 const verified=await h.send(path+'/action?name=code.verify',{code:mail.body.match(/\b\d{6}\b/)[0]})
 assert.equal(verified.status,200,verified.text)
 const accepted=await h.send(path+'/action?name=accept',{name:'Synthetic client',optionId:'main',consent:true},verified.cookie)
 assert.equal(accepted.status,200,accepted.text)
 return {id:p.id,clientId:client.id,path,cookie:verified.cookie,input}
}
export const receiptInput=(id,method='check',amount='300')=>({id,requestId:crypto.randomUUID(),revision:1,currency:'USD',method,amount,reference:'synthetic-platter-9901-'+method,receivedOn:'2030-01-15',consent:true})
export async function allocationInput(h,id,paymentId,amount='300'){
 const state=await h.state(),schedule=state.paymentSchedules.find(x=>x.proposalId===id),row=schedule.rows[0],payment=state.paymentRecords.find(x=>x.id===paymentId)
 return {id,paymentId,requestId:crypto.randomUUID(),revision:schedule.revision,currency:schedule.currency,agreementHash:schedule.agreementHash,rowIndex:row.index,rowHash:row.rowHash,paymentVersion:payment.version,remainingCents:row.remainingCents,amount,consent:true}
}

export async function completeEventInput(h,id) {
 const schedule=(await h.state()).paymentSchedules.find(x=>x.proposalId===id),row=schedule.rows[0]
 return {id,rowIndex:row.index,agreementHash:schedule.agreementHash,rowHash:row.rowHash,requestId:crypto.randomUUID(),completedOn:'2000-01-15',note:'Synthetic delivery accepted by the owner',consent:true}
}
export async function scheduledReceiptJourney(h,billing,sales) {
 const event=await allocationAgreement(h,{paymentTerms:{netDays:30,milestones:[{label:'Approved delivery',event:'Client approves delivery',percent:100}]}})
 const accepted=await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(event.id).first(),receipt=await h.cmd('payment.record',receiptInput(event.id,'check','700'),billing.cookie),allocation=await allocationInput(h,event.id,receipt.id,'700'),completion=await completeEventInput(h,event.id)
 const records=async()=>Object.fromEntries(await Promise.all(['p_payment_milestone_events','p_payment_records','p_payment_allocations','p_acceptances','p_proposals','p_audit'].map(async t=>[t,(await h.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()).results])))
 const refuse=async(name,input,cookie,status=409)=>{const before=await records();await h.cmd(name,input,cookie,status);assert.deepEqual(await records(),before)}
 assert.equal((await h.state()).paymentSchedules.find(x=>x.proposalId===event.id).rows[0].status,'awaiting completion')
 await refuse('payment.allocate',allocation,billing.cookie)
 await refuse('payment.milestone-complete',completion,billing.cookie,403);await refuse('payment.milestone-complete',completion,sales.cookie,403)
 await refuse('payment.milestone-complete',{...completion,rowHash:'0'.repeat(64)},h.owner)
 await refuse('payment.milestone-complete',{...completion,consent:false},h.owner,400)
 await refuse('payment.milestone-complete',{...completion,completedOn:'9998-01-01'},h.owner)
 const concurrent=await Promise.all([completion,{...completion,requestId:crypto.randomUUID()}].map(input=>h.send('/api/platter/command',{name:'payment.milestone-complete',input},h.owner)))
 assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409])
 // The same supplied request remains historical; a different completion cannot replace it.
 const saved=(await h.db.prepare('SELECT * FROM p_payment_milestone_events WHERE proposal_id=?').bind(event.id).all()).results;assert.equal(saved.length,1)
 const replay={...completion,requestId:saved[0].request_id};await h.cmd('payment.milestone-complete',replay)
 await refuse('payment.milestone-complete',{...replay,note:'Different completion'},h.owner)
 await h.cmd('payment.allocate',allocation,billing.cookie)
 const eventRow=(await h.state()).paymentSchedules.find(x=>x.proposalId===event.id).rows[0]
 assert.deepEqual([eventRow.ready,eventRow.completion.completed_on,eventRow.completion.note,eventRow.allocatedCents,eventRow.remainingCents,eventRow.status],[true,'2000-01-15','Synthetic delivery accepted by the owner',70000,0,'paid'])
 assert.deepEqual(await h.db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(event.id).first(),accepted)
 // The deposit is already a credit in the frozen installment cents: allocating a receipt must not count it again.
 const recurring=await allocationAgreement(h,{depositPercent:'30',paymentTerms:null,pricingTables:[{optionId:'main',name:'Monthly care',lines:[{name:'Care',quantity:'1',unit:'month',unitPrice:'1000',interval:'monthly',term:3,startsOn:'2099-01-31'}]}]})
 let schedule=(await h.state()).paymentSchedules.find(x=>x.proposalId===recurring.id)
 assert.deepEqual(schedule.rows.map(x=>[x.kind,x.date,x.amountCents]),[['recurring','2099-01-31',10000],['recurring','2099-02-28',100000],['recurring','2099-03-31',100000]])
 const lump=await h.cmd('payment.record',receiptInput(recurring.id,'ach_credit','2100'),billing.cookie)
 for(const [index,amount] of [[0,'100'],[1,'1000'],[2,'1000']]){
  const state=await h.state(),row=state.paymentSchedules.find(x=>x.proposalId===recurring.id).rows[index],payment=state.paymentRecords.find(x=>x.id===lump.id)
  const input={...await allocationInput(h,recurring.id,lump.id,amount),rowIndex:row.index,rowHash:row.rowHash,remainingCents:row.remainingCents,paymentVersion:payment.version}
  await h.cmd('payment.allocate',input,billing.cookie)
 }
 schedule=(await h.state()).paymentSchedules.find(x=>x.proposalId===recurring.id)
 assert.deepEqual(schedule.rows.map(x=>[x.allocatedCents,x.remainingCents,x.status]),[[10000,0,'paid'],[100000,0,'paid'],[100000,0,'paid']])
 assert.equal((await h.state()).paymentRecords.find(x=>x.id===lump.id).unallocatedCents,0)
 return {event,recurring,completion:replay}
}

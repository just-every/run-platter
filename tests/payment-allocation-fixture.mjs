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

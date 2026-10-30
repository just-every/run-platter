import assert from 'node:assert/strict'
export const clientAddress='synthetic-platter-11004'+String.fromCharCode(64)+'example.test'
export async function connectXero(h,edge,cookie=h.owner,version=0){return h.cmd('provider.connect',{provider:'xero',version,organizationId:edge.accountId,token:edge.token,consent:true},cookie)}
export async function chooseXero(h,edge,cookie=h.owner,version=0,connectionVersion=1){return h.cmd('xero.authority',{authority:'xero',version,accountId:edge.accountId,connectionVersion,consent:true},cookie)}
export async function acceptXeroDeposit(h,title='Synthetic Xero deposit',clientId){
 const client=clientId?{id:clientId}:await h.cmd('client.save',{name:'Synthetic deposit client',email:clientAddress})
 const p=await h.cmd('proposal.prepare',{clientId:client.id,title,scope:'Accepted independent scope',optionOne:'Project',priceOne:'8000.04',optionTwo:'Extended',priceTwo:'12000',depositPercent:'25',paymentTerms:{netDays:30,milestones:[{label:'Delivery',event:'Delivery complete',percent:100}],retainer:{percent:10,startsOn:'2035-04-01',months:2}}})
 await h.cmd('proposal.approve',{id:p.id,version:1,revision:1})
 const path=new URL((await h.cmd('proposal.send',{id:p.id,version:2})).shareUrl).pathname
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const code=(await h.state()).outbox.find(m=>m.proposal_id===p.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
 const verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200)
 const result=await h.send(path+'/action?name=accept',{name:'Synthetic client',optionId:'one',consent:true},verified.cookie);assert.equal(result.status,200,result.text)
 return {p,client,path,cookie:verified.cookie}
}
export async function reviewXero(h,id,cookie=h.owner,extra={}){return h.cmd('xero.review',{id,accountCode:'200',createContact:true,...extra},cookie)}
export async function issueXero(h,review,cookie=h.owner,status=200){return h.cmd('xero.issue',{id:review.id,digest:review.digest,consent:true},cookie,status)}

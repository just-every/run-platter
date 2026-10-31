import assert from 'node:assert/strict'
export const mailbox=n=>'synthetic-platter-'+n+String.fromCharCode(64)+'example.test'
export async function intakeTemplate(h) {
 const client=await h.cmd('client.save',{name:'Private directory company',email:mailbox(9900)})
 const source={clientId:client.id,title:'Public studio request',scope:'One studio session with licensed photographs.',terms:'Private unselected terms sentinel',depositPercent:25,paymentTerms:{netDays:30,depositFixed:'500',milestones:[]},packages:[{id:'studio',label:'Studio',price:'2000',optionalItems:[{id:'prints',label:'Print set',unitPrice:'100',min:1,max:5,quantity:1,editable:true}]},{id:'campaign',label:'Campaign',price:'4000'}],document:{version:1,blocks:[{id:'public-text',type:'text',title:'About the session',text:'A studio appointment reviewed by the firm.'},{id:'brief',type:'field',title:'Project brief',text:'',recipientRole:'client',fieldKind:'text',required:true}]}}
 const p=await h.cmd('proposal.prepare',source)
 const privateLine=(await h.state()).proposals.find(r=>r.id===p.id).internalPricing.lines[0]
 await h.cmd('pricing.cost',{id:p.id,version:1,lineKey:privateLine.key,unitCost:'784.31'})
 await h.cmd('expiry.set',{id:p.id,version:2,mode:'days',days:7,warningDays:1})
 const template=await h.cmd('template.save',{id:p.id,version:3,name:'Public studio'})
 return {client,p,template,source}
}
export function intakeReview(template,extra={}) {
 return {templateId:template.id,version:template.version,textFields:['title','scope'],packageIds:['studio','campaign'],optionalIds:{studio:['prints']},blockIds:['public-text'],fieldIds:['brief'],submissionCap:2,expiresAt:'2031-07-01T00:00:00Z',...extra}
}
export async function publishIntake(h,template,extra={}) {
 const review=await h.cmd('public-intake.review',intakeReview(template,extra))
 const form=await h.cmd('public-intake.publish',{id:review.id,digest:review.digest,consent:true})
 return {...form,path:new URL(form.shareUrl).pathname,review}
}
export const visitor=(n,extra={})=>({name:'Visitor '+n,email:mailbox(n),company:'Company '+n,optionId:'studio',items:[], 'field:brief':'Independent request '+n,...extra})
export async function intakeChallenge(h,path,input) {
 const response=await h.send(path+'/challenge',input)
 assert.equal(response.status,200,response.text)
 const mail=(await h.state()).publicIntakeMail.find(m=>m.recipient===input.email&&/\b\d{6}\b/.test(m.body))
 assert.ok(mail,'verification mail is captured for the exact visitor')
 return {challenge:response.value.challenge,code:mail.body.match(/\b\d{6}\b/)[0]}
}

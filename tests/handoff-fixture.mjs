import assert from 'node:assert/strict'

export const asanaAccount='synthetic-platter-9400',asanaWorkspace='synthetic-platter-9401',asanaTeam='synthetic-platter-9402',asanaToken='synthetic-platter-9403'
export const handoffStripeToken='synthetic-platter-9420'
export const handoffSettings={version:0,accountId:asanaAccount,connectionVersion:1,workspaceId:asanaWorkspace,teamId:asanaTeam,consent:true}
export function handoffFixture(){
 const calls=[],projects=[],tasks=[],paymentCalls=[],intents=new Map();let sequence=0,uncertain,hook
 const outboundService=async request=>{
  const url=new URL(request.url)
  if(url.hostname==='api.stripe.com'){
   assert.equal(request.headers.get('authorization'),'Bearer '+handoffStripeToken)
   paymentCalls.push({path:url.pathname,method:request.method})
   if(url.pathname==='/v1/account')return Response.json({id:'synthetic-platter-9421',default_currency:'usd'})
   if(url.pathname==='/v1/payment_intents'&&request.method==='POST'){
    const body=new URLSearchParams(await request.text()),id='synthetic-platter-'+(9422+intents.size)
    const intent={id,amount:Number(body.get('amount')),currency:body.get('currency'),status:'requires_payment_method',client_secret:'synthetic-platter-9430',payment_method_types:['card'],metadata:{platter_proposal_id:body.get('metadata[platter_proposal_id]'),platter_revision:body.get('metadata[platter_revision]')}}
    intents.set(id,intent);return Response.json(intent)
   }
   const intent=intents.get(url.pathname.split('/').at(-1));assert.ok(intent,'a retained provider intent must exist');return Response.json(intent)
  }
  const data=request.method==='POST'?(await request.json()).data:undefined
  assert.equal(url.hostname,'app.asana.com');assert.equal(request.headers.get('authorization'),'Bearer '+asanaToken)
  const call={path:url.pathname,method:request.method,data};calls.push(call);if(hook)await hook(call)
  if(url.pathname.endsWith('/users/me'))return Response.json({data:{gid:asanaAccount}})
  if(request.method==='GET'&&url.pathname.includes('/workspaces/'))return Response.json({data:{gid:asanaWorkspace,name:'Synthetic workspace'}})
  if(request.method==='GET'&&url.pathname.includes('/teams/'))return Response.json({data:{gid:asanaTeam,name:'Synthetic delivery',organization:{gid:asanaWorkspace}}})
  assert.equal(request.method,'POST');assert.ok(['/api/1.0/projects','/api/1.0/tasks'].includes(url.pathname))
  const kind=url.pathname.endsWith('/projects')?'project':'task',row={gid:'synthetic-platter-'+(++sequence+9403),...data};(kind==='project'?projects:tasks).push(row)
  if(uncertain===kind)return new Response('synthetic-platter-acknowledgement-lost',{status:503})
  return Response.json({data:{gid:row.gid}})
 }
 return {calls,projects,tasks,paymentCalls,intents,outboundService,setUncertain:value=>{uncertain=value},setHook:value=>{hook=value}}
}
export async function connectAsana(h,cookie=h.owner){
 await h.cmd('provider.connect',{provider:'asana',version:0,token:asanaToken,consent:true},cookie)
 await h.cmd('handoff.configure',handoffSettings,cookie)
}
export async function handoffOffer(h,title='Synthetic handoff agreement',clientId,settings={}){
 const client=clientId?{id:clientId}:await h.cmd('client.save',{name:'Synthetic delivery client',email:['synthetic-platter-9410','example.test'].join('@')})
 const line=(name,quantity,unitPrice,description)=>({name,description,quantity,unit:'day',unitPrice,group:''})
 const proposal=await h.cmd('proposal.prepare',{clientId:client.id,title,scope:'Only the reviewed delivery scope.',depositPercent:'25',...(settings.recipients?{recipientPlan:settings.recipients}:{}),packages:[{id:'selected',label:'Selected delivery',optionalItems:[{id:'training',label:'Training',unitPrice:'25',min:1,max:3,quantity:1,editable:true},{id:'excluded',label:'Unselected extra',unitPrice:'99',min:1,max:1,quantity:1,editable:false}]},{id:'other',label:'Unselected package',price:'999'}],pricingTables:[{optionId:'selected',name:'Delivery',lines:[line('Design','1','100','Reviewed design'),line('Build','2','100','Reviewed build'),line('Launch','3','100','Reviewed launch')]}],paymentTerms:{netDays:15,milestones:[{label:'Design',percent:25,date:'2099-03-01'},{label:'Build',percent:25,date:'2099-03-08'},{label:'Launch',percent:25,event:'Approval'},{label:'Training',percent:25,date:'2099-03-15'}]}})
 let version=1
 if(settings.completion){await h.cmd('payment.collection',{id:proposal.id,version,completion:settings.completion,paymentMethods:['card']});version++}
 await h.cmd('proposal.approve',{id:proposal.id,version,revision:1})
 const shared=await h.cmd('proposal.send',{id:proposal.id,version:version+1}),path=new URL(shared.shareUrl).pathname
 return {proposal,client,path,version:version+2,recipients:shared.recipients}
}
export async function verifyHandoff(h,path){
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const share=await h.db.prepare('SELECT proposal_id,recipient FROM p_shares WHERE token=?').bind(path.split('/').at(-1)).first()
 const code=(await h.state()).outbox.find(m=>m.proposal_id===share.proposal_id&&(!share.recipient||m.recipient===share.recipient)&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
 const verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200)
 return verified.cookie
}
export async function completeHandoffAgreement(h,title,clientId,accept=true,settings={}){
 const offer=await handoffOffer(h,title,clientId,settings),{path}=offer,cookie=await verifyHandoff(h,path)
 const input={name:'Synthetic delivery signer',optionId:'selected',items:[{id:'training',quantity:2}],consent:true}
 if(accept){const result=await h.send(path+'/action?name=accept',input,cookie);assert.equal(result.status,200,result.text)}
 return {...offer,cookie,input}
}
export async function recordHandoffUpload(h,offer,cookie=h.owner,patch={}){
 const form=new FormData()
 for(const [key,value] of Object.entries({id:offer.proposal.id,version:offer.version,optionId:'selected',items:JSON.stringify([{id:'training',quantity:2}]),signer:'Synthetic paper signer',signedOn:'2020-01-15',attest:'yes',...patch}))form.set(key,String(value))
 form.set('file',new File(['Synthetic retained signed agreement'],'synthetic-platter-9412.txt',{type:'text/plain'}))
 const request=new Request(h.origin+'/app/paper-acceptance',{method:'POST',headers:{host:new URL(h.origin).host,origin:h.origin,cookie},body:form})
 const response=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()})
 return {status:response.status,text:await response.text()}
}

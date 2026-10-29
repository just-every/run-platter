import assert from 'node:assert/strict'

export const asanaAccount='synthetic-platter-9400',asanaWorkspace='synthetic-platter-9401',asanaTeam='synthetic-platter-9402',asanaToken='synthetic-platter-9403'
export const handoffSettings={version:0,accountId:asanaAccount,connectionVersion:1,workspaceId:asanaWorkspace,teamId:asanaTeam,consent:true}
export function handoffFixture(){
 const calls=[],projects=[],tasks=[];let sequence=0,uncertain,hook
 const outboundService=async request=>{
  const url=new URL(request.url),data=request.method==='POST'?(await request.json()).data:undefined
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
 return {calls,projects,tasks,outboundService,setUncertain:value=>{uncertain=value},setHook:value=>{hook=value}}
}
export async function connectAsana(h,cookie=h.owner){
 await h.cmd('provider.connect',{provider:'asana',version:0,token:asanaToken,consent:true},cookie)
 await h.cmd('handoff.configure',handoffSettings,cookie)
}
export async function completeHandoffAgreement(h,title='Synthetic handoff agreement',clientId,accept=true){
 const client=clientId?{id:clientId}:await h.cmd('client.save',{name:'Synthetic delivery client',email:['synthetic-platter-9410','example.test'].join('@')})
 const line=(name,quantity,unitPrice,description)=>({name,description,quantity,unit:'day',unitPrice,group:''})
 const proposal=await h.cmd('proposal.prepare',{clientId:client.id,title,scope:'Only the reviewed delivery scope.',depositPercent:'25',packages:[{id:'selected',label:'Selected delivery',optionalItems:[{id:'training',label:'Training',unitPrice:'25',min:1,max:3,quantity:1,editable:true},{id:'excluded',label:'Unselected extra',unitPrice:'99',min:1,max:1,quantity:1,editable:false}]},{id:'other',label:'Unselected package',price:'999'}],pricingTables:[{optionId:'selected',name:'Delivery',lines:[line('Design','1','100','Reviewed design'),line('Build','2','100','Reviewed build'),line('Launch','3','100','Reviewed launch')]}],paymentTerms:{netDays:15,milestones:[{label:'Design',percent:25,date:'2099-03-01'},{label:'Build',percent:25,date:'2099-03-08'},{label:'Launch',percent:25,event:'Approval'},{label:'Training',percent:25,date:'2099-03-15'}]}})
 await h.cmd('proposal.approve',{id:proposal.id,version:1,revision:1})
 const shared=await h.cmd('proposal.send',{id:proposal.id,version:2}),path=new URL(shared.shareUrl).pathname
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const code=(await h.state()).outbox.find(m=>m.proposal_id===proposal.id&&m.subject.includes('verification code')).body.match(/\b\d{6}\b/)[0]
 const verified=await h.send(path+'/action?name=code.verify',{code});assert.equal(verified.status,200)
 const input={name:'Synthetic delivery signer',optionId:'selected',items:[{id:'training',quantity:2}],consent:true}
 if(accept)assert.equal((await h.send(path+'/action?name=accept',input,verified.cookie)).status,200)
 return {proposal,client,path,cookie:verified.cookie,input}
}

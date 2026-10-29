import assert from 'node:assert/strict'
import { verifyRecipient, decision } from './recipients-http.mjs'

const address=n=>['synthetic-platter-'+n,'example.test'].join(String.fromCharCode(64))

/** Exercise template custody through native person commands and real mailbox acceptance. */
export async function duplicateTemplateRecipients(h,{client,beta,member,actor}){
 const get=async id=>(await h.state()).proposals.find(p=>p.id===id)
 await h.cmd('approval.policy',{version:(await h.state()).approvalSettings.policy.version,required:true,defaultRole:'owner'})
 const plan=[
  {id:'client',name:'Client signer',email:'{{Client.Email}}',role:'signer',group:1},
  {id:'cfo',name:'Client CFO',email:address(1231),role:'approver',group:2},
  {id:'owner',name:'Firm owner',email:h.auth.OWNER_EMAIL,role:'countersigner',group:3},
 ]
 const document={version:1,blocks:[
  {id:'scope',type:'text',title:'Scope',text:'Prepared for {{Client.Company}} in {{Custom.Region}}'},
  {id:'signature',type:'signature',title:'Client signature',text:'',recipientRole:'slot',recipientId:'client'},
  {id:'po',type:'field',title:'Purchase order',text:'',recipientRole:'slot',recipientId:'client',fieldKind:'text',required:true},
  {id:'signed-on',type:'field',title:'Signed date',text:'',recipientRole:'slot',recipientId:'owner',fieldKind:'date',required:true},
 ]}
 const seed=await h.cmd('proposal.prepare',{clientId:client.id,title:'{{Client.Company}} leadership',scope:'Independent recipient custody.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25',variableValues:{},recipientPlan:plan,document})
 const forged=await h.cmd('proposal.prepare',{clientId:client.id,title:'Untrusted preassignment',scope:'No implicit preassignment.',optionOne:'Studio',priceOne:'2400',optionTwo:'Campaign',priceTwo:'4200',depositPercent:'25',recipientPlan:plan.map(r=>({...r,email:r.id==='client'?address(1232):r.email,preassignedEmail:r.id==='owner'?h.auth.OWNER_EMAIL:undefined}))})
 const unassigned=await h.cmd('proposal.duplicate',{id:forged.id,version:1})
 assert.ok(JSON.parse((await get(unassigned.id)).recipient_plan).every(r=>r.email===null),'ordinary assigned and caller-forged preassignment addresses are cleared')
 const before=await h.state()
 await h.cmd('template.save',{id:seed.id,version:1,name:'Invalid preassignment',preassignedRecipientIds:['client']},h.owner,403)
 assert.deepEqual(await h.state(),before,'a client cannot become a preassigned firm countersigner')
 await h.cmd('proposal.share',{id:seed.id,operatorId:actor.id})
 const scopedBefore=await h.state()
 await h.cmd('template.save',{id:seed.id,version:1,name:'Unauthorized preassignment',preassignedRecipientIds:['owner']},member,403)
 assert.deepEqual(await h.state(),scopedBefore,'a member cannot grant template preassignment')
 const template=await h.cmd('template.save',{id:seed.id,version:1,name:'Leadership snapshot',preassignedRecipientIds:['owner']})
 const source=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id})
 const started=await get(source.id),slots=JSON.parse(started.recipient_plan)
 assert.deepEqual(slots.map(r=>[r.id,r.role,r.group,r.email]),[['client','signer',1,address(1201)],['cfo','approver',2,null],['owner','countersigner',3,h.auth.OWNER_EMAIL]])
 assert.equal(slots[2].preassignedEmail,h.auth.OWNER_EMAIL)
 await h.cmd('recipient.save',{id:source.id,version:1,recipients:slots.map(r=>r.id==='cfo'?{...r,email:address(1231)}:r)})
 let row=await get(source.id)
 await h.cmd('proposal.approve',{id:row.id,version:row.version,revision:row.revision})
 const sent=await h.cmd('proposal.send',{id:row.id,version:row.version+1}),links=Object.fromEntries(sent.recipients.map(r=>[r.id,new URL(r.shareUrl).pathname]))
 const cookies={};for(const [id,path] of Object.entries(links))cookies[id]=await verifyRecipient(h,path)
 assert.equal((await decision(h,links.owner,cookies.owner,'one','accept',{'field:signed-on':'2030-06-03'})).status,409)
 assert.equal((await decision(h,links.client,cookies.client,'one','accept',{'signature:signature':'Synthetic signer','field:po':'synthetic-platter-1233'})).status,200)
 assert.equal((await decision(h,links.cfo,cookies.cfo,'one','recipient.approve')).status,200)
 assert.equal((await decision(h,links.owner,cookies.owner,'one','accept',{'field:signed-on':'2030-06-03'})).status,200)
 const accepted=await get(source.id);assert.equal(accepted.status,'accepted');assert.equal(accepted.recipientSignatures.length,3)
 const artifact=async kind=>{const r=await h.mf.dispatchFetch(h.origin+'/api/platter/'+kind+'?id='+source.id,{headers:{cookie:h.owner}});assert.equal(r.status,200);return new Uint8Array(await r.arrayBuffer())}
 const pdf=await artifact('agreement.pdf'),certificate=await artifact('certificate.pdf')
 // A later template revision clears preassignment and changes order; it cannot rewrite this source.
 await h.cmd('recipient.save',{id:seed.id,version:1,recipients:plan.map(r=>({...r,email:r.id==='client'?address(1201):r.email,group:r.id==='cfo'?1:r.id==='client'?2:3}))})
 await h.cmd('template.save',{id:seed.id,version:2,templateId:template.id,templateVersion:1,name:'Leadership snapshot',preassignedRecipientIds:[]})
 assert.deepEqual(await get(source.id),accepted)
 await h.cmd('proposal.share',{id:source.id,operatorId:actor.id})
 const copy=await h.cmd('proposal.duplicate',{id:source.id,version:accepted.version,clientId:beta.id},member),copied=await get(copy.id)
 const expected=[{id:'client',name:'Client signer',email:null,role:'signer',group:1},{id:'cfo',name:'Client CFO',email:null,role:'approver',group:2},{id:'owner',name:'Firm owner',email:h.auth.OWNER_EMAIL,role:'countersigner',group:3,preassignedEmail:h.auth.OWNER_EMAIL}]
 assert.deepEqual(JSON.parse(copied.recipient_plan),expected,'the source snapshot, rather than the changed template, controls the copy')
 assert.equal(copied.document.blocks[0].text,'Prepared for Beta Co in East')
 assert.deepEqual(copied.document.blocks.slice(1),document.blocks.slice(1),'signature and required fields retain their exact slot assignments')
 for(const key of ['recipientLinks','recipientSignatures','questions','invitationMessages','deliveries'])assert.deepEqual(copied[key],[],key+' starts empty')
 assert.equal(copied.acceptance,undefined);assert.equal(copied.invoice,undefined);assert.equal(copied.approved_by,null)
 assert.ok(!(await h.state()).outbox.some(m=>m.proposal_id===copy.id))
 await h.cmd('proposal.approve',{id:copy.id,version:1,revision:1})
 const missing=await h.send('/api/platter/command',{name:'proposal.send',input:{id:copy.id,version:2}},h.owner)
 assert.equal(missing.status,409);assert.match(missing.text,/Client signer, Client CFO/)
 assert.deepEqual(JSON.parse((await get(copy.id)).recipient_plan),expected,'refused sending assigns nobody and issues no invitation')
 await h.cmd('recipient.save',{id:copy.id,version:2,recipients:expected.map(r=>({...r,email:r.id==='client'?address(1202):r.id==='cfo'?address(1234):r.email}))})
 row=await get(copy.id);assert.equal(row.approved_by,null)
 await h.cmd('proposal.send',{id:copy.id,version:row.version},h.owner,409)
 await h.cmd('proposal.approve',{id:copy.id,version:row.version,revision:row.revision})
 const resent=await h.cmd('proposal.send',{id:copy.id,version:row.version+1})
 assert.deepEqual(resent.recipients.map(r=>r.email),[address(1202),address(1234),h.auth.OWNER_EMAIL])
 const next=await h.cmd('proposal.duplicate',{id:copy.id,version:row.version+2,clientId:client.id})
 assert.deepEqual(JSON.parse((await get(next.id)).recipient_plan),expected,'editing ordinary recipients preserves only the original preassignment for the next copy')
 assert.equal((await decision(h,new URL(resent.recipients[0].shareUrl).pathname,cookies.client)).status,401,'source verification cannot authorize the copied recipient')
 assert.deepEqual(await get(source.id),accepted);assert.deepEqual(await artifact('agreement.pdf'),pdf);assert.deepEqual(await artifact('certificate.pdf'),certificate)
}

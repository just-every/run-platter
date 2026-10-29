import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'

export const clientFileBlocks=()=>[
 {id:'billing',type:'field',title:'Billing address',text:'',recipientRole:'client',fieldKind:'text',required:true},
 {id:'purchase-file',type:'field',title:'Purchase order PDF',text:'',recipientRole:'client',fieldKind:'file',required:true},
 {id:'insurance-file',type:'field',title:'Insurance image',text:'',recipientRole:'client',fieldKind:'file',required:false},
]
export async function clientPdfBytes(){const pdf=await PDFDocument.create();pdf.addPage().drawText('Synthetic Platter purchase order');return pdf.save()}
export async function uploadClientOriginal(h,path,cookie,{fieldId='purchase-file',revision=2,bytes,filename='synthetic-platter-9801.pdf',type='application/pdf'}={}){
 const data=new FormData();data.set('fieldId',fieldId);data.set('revision',String(revision));data.set('file',new File([bytes??await clientPdfBytes()],filename,{type}))
 const request=new Request(h.origin+path+'/client-files',{method:'POST',headers:{origin:h.origin,cookie:cookie??'',accept:'application/json'},body:data})
 return h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()})
}
export async function verifiedClient(h,path){
 assert.equal((await h.send(path+'/action?name=code.request',{})).status,200)
 const mail=(await h.state()).outbox.find(row=>row.subject.includes('verification code')),code=mail.body.match(/\b\d{6}\b/)[0]
 const response=await h.send(path+'/action?name=code.verify',{code});assert.equal(response.status,200,response.text);return response.cookie
}

export async function configuredClientOriginals(h,client,offer,bytes){
 const clientSlot='synthetic-platter-file-client',cfoSlot='synthetic-platter-file-cfo',viewerSlot='synthetic-platter-file-viewer'
 const mailbox=(await h.state()).clients.find(v=>v.id===client.id).email
 const recipients=[{id:clientSlot,name:'Client signer',email:mailbox,role:'signer',group:1},{id:cfoSlot,name:'Client CFO',email:['synthetic-platter-9805','example.test'].join('@'),role:'approver',group:2},{id:viewerSlot,name:'Viewer',email:['synthetic-platter-9806','example.test'].join('@'),role:'viewer',group:1}]
 const configured=await h.cmd('proposal.prepare',{...offer,clientId:client.id,recipientPlan:recipients})
 const blocks=clientFileBlocks();blocks.find(b=>b.id==='insurance-file').recipientRole='slot';blocks.find(b=>b.id==='insurance-file').recipientId=cfoSlot;blocks.find(b=>b.id==='insurance-file').required=true
 await h.cmd('proposal.document',{id:configured.id,version:1,document:{version:1,blocks}})
 const template=await h.cmd('template.save',{id:configured.id,version:2,name:'Assigned original collection'})
 const started=await h.cmd('template.start',{id:template.id,version:1,clientId:client.id})
 await h.cmd('recipient.save',{id:started.id,version:1,recipients})
 let current=(await h.state()).proposals.find(p=>p.id===started.id)
 assert.equal(current.document.blocks.find(b=>b.id==='insurance-file').recipientId,cfoSlot)
 await h.cmd('proposal.approve',{id:started.id,version:current.version,revision:current.revision})
 current=(await h.state()).proposals.find(p=>p.id===started.id)
 const shares=await h.cmd('proposal.send',{id:started.id,version:current.version}),links=shares.links??shares.recipients
 const pathFor=id=>new URL(links.find(r=>r.id===id).shareUrl).pathname
 const path=pathFor(clientSlot),cfoPath=pathFor(cfoSlot),viewerPath=pathFor(viewerSlot),cookie=await verifiedClient(h,path),cfoCookie=await verifiedClient(h,cfoPath),viewerCookie=await verifiedClient(h,viewerPath),revision=current.revision
 const count=async()=> (await h.db.prepare('SELECT count(*) AS n FROM p_attachment_files').first()).n
 const before=await count()
 assert.equal((await uploadClientOriginal(h,viewerPath,viewerCookie,{revision,bytes})).status,403)
 assert.equal((await uploadClientOriginal(h,cfoPath,cfoCookie,{revision,bytes,fieldId:'insurance-file'})).status,409)
 assert.equal((await uploadClientOriginal(h,path,cookie,{revision,bytes,fieldId:'insurance-file'})).status,400)
 assert.equal(await count(),before)
 const uploaded=await uploadClientOriginal(h,path,cookie,{revision,bytes});assert.equal(uploaded.status,200,await uploaded.clone().text());const first=await uploaded.json()
 const decision={optionId:'two',name:'Synthetic signer',consent:true,'field:billing':'50 Synthetic Street','field:purchase-file':first.id}
 assert.equal((await h.send(path+'/action?name=accept',{...decision,'field:insurance-file':first.id},cookie)).status,400)
 assert.equal((await h.send(cfoPath+'/client-files/'+first.id,undefined,cfoCookie)).status,404)
 assert.equal((await h.send(path+'/action?name=accept',decision,cookie)).status,200)
 assert.equal((await uploadClientOriginal(h,path,cookie,{revision,bytes})).status,409)
 assert.equal((await h.send(cfoPath+'/action?name=recipient.approve',{optionId:'two',name:'Synthetic CFO',consent:true},cfoCookie)).status,400)
 assert.equal((await h.send(cfoPath+'/action?name=recipient.approve',{optionId:'two',name:'Synthetic CFO',consent:true,'field:insurance-file':first.id},cfoCookie)).status,409)
 const secondUpload=await uploadClientOriginal(h,cfoPath,cfoCookie,{revision,bytes,fieldId:'insurance-file'});assert.equal(secondUpload.status,200,await secondUpload.clone().text());const second=await secondUpload.json()
 assert.equal((await h.send(cfoPath+'/action?name=recipient.approve',{optionId:'two',name:'Synthetic CFO',consent:true,'field:insurance-file':second.id},cfoCookie)).status,200)
 const accepted=(await h.state()).proposals.find(p=>p.id===started.id).acceptance
 assert.deepEqual(accepted.clientFiles,[first,second]);assert.equal(accepted.fieldValues.billing,'50 Synthetic Street')
 assert.deepEqual((await h.send(cfoPath+'/certificate.json',undefined,cfoCookie)).value.clientFiles,[first,second])
 assert.equal((await h.send(path+'/action?name=accept',{...decision,'field:purchase-file':second.id},cookie)).status,200)
 assert.deepEqual((await h.state()).proposals.find(p=>p.id===started.id).acceptance.clientFiles,[first,second])
 return {id:started.id,path,cookie,files:[first,second]}
}

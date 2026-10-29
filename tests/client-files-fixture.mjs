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

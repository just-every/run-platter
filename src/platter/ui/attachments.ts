import { escape, form, hidden, panel, proposalPath, ownerOnly } from './shared'
const label=(f:any)=>`${escape(f.filename)} · ${escape(f.size)} bytes${f.kind?` · ${f.kind==='w9'?'W-9':'Insurance'}`:''}`
export function attachmentList(files:any[],base:string){return files.length?`<ul class="records">${files.map(f=>`<li><a href="${base}${encodeURIComponent(f.id)}">${label(f)}</a></li>`).join('')}</ul>`:'<p>No attachments.</p>'}
const upload=(contents:string,button:string)=>`<form method="post" enctype="multipart/form-data" action="/app/attachment">${contents}<label>Document file<input name="file" type="file" required></label><button>${button}</button></form>`
export function vendorSettings(state:any){
 if(state.actor?.role!=='owner')return ownerOnly()
 return panel('Vendor document settings','<p>New proposals include these current defaults. Existing revisions retain their files. In a draft, use Attach current vendor documents to refresh its defaults; review and approve again before sending.</p>'+['w9','insurance'].map(kind=>{const file=state.vendorDocuments.find((f:any)=>f.kind===kind);return `<h3>${kind==='w9'?'W-9':'Insurance certificate'}</h3>`+(file?attachmentList([file],'/api/platter/attachments/'):'<p>No default document.</p>')+upload(hidden('kind',kind),`Save ${kind==='w9'?'W-9':'insurance'} default`)}).join(''))
}
export function proposalAttachments(state:any,p:any){
 const files=p.attachments??[],editable=['draft','approved'].includes(p.status)&&!p.negotiating&&['owner','member'].includes(state.actor?.role)
 return panel(p.acceptance?'Signed agreement package attachments':'Proposal attachments',attachmentList(files,`/api/platter/attachments/`+encodeURIComponent(p.id)+'/')+(editable?'<p>Uploading or refreshing files creates a new revision and clears approval.</p>'+upload(hidden('id',p.id)+hidden('version',p.version),'Attach document')+form('attachments.refresh',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+'<button>Attach current vendor documents</button>'):''))
}

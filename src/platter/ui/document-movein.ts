import { escape, form, hidden, field, panel } from './shared'
import { importStatus } from './import-journal'

const command=(name:string,id:string,body:string)=>form('document-import.'+name,'/app/import',hidden('id',id)+body)
function reportSummary(report:any) {
 return '<dl>'+[['Arrived agreements',report.arrived],['Held for review',report.held],['Unmapped items',report.unmapped],['Duplicate PDFs skipped',report.duplicateDocuments],...(report.provider?[['Contacts arrived',report.contactsArrived],['Contacts held',report.contactsHeld],['Companies arrived',report.companiesArrived]]:[])].map(([label,value])=>'<dt>'+label+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>'
  +'<ul>'+report.notes.map((note:string)=>'<li>'+escape(note)+'</li>').join('')+[...report.unmappedItems,...(report.unmappedColumns??[])].map((name:string)=>'<li>Unmapped: '+escape(name)+'</li>').join('')+'</ul>'
}
export function documentMoveinPage(state:any,feedback?:any) {
 if(state.actor?.role!=='owner')return ''
 const result=feedback?.result?.documentMovein?feedback.result:null
 let html=panel('Move in exported documents','<p>Add PDFs, bulk ZIP downloads and report CSVs to one move-in across sessions. Upload the same file again to resume from its saved byte offset. Originals remain read-only; no invitation, payment or provider action is created.</p>'
  +form('document-import.create','/app/import','<label>Export source<select name="sourceKind" aria-label="Export source"><option value="documents">Document and report files</option><option value="betterproposals">Better Proposals exported files</option></select></label>'+field('Move-in name','label','','required maxlength="150"')+'<button>Start document move-in</button>'))
 const moves=state.documentMoveins??[]
 for(const move of moves) {
  const frozen=Boolean(move.fingerprint),better=move.source_kind==='betterproposals'
  const current=result?.id===move.id?result:null
  const review=current?.review??{}
  const reviewHidden=()=>better?hidden('contactsFile',review.contactsFile??'')+hidden('mapping',JSON.stringify(review.mapping??{}))+hidden('bindings',JSON.stringify(review.bindings??{}))+hidden('contactChoices',JSON.stringify(review.contactChoices??{})):''
  let body='<p>'+escape(move.job_id?importStatus(move.state):'Collecting exported files')+'</p>'
  if(!frozen)body+='<form data-document-upload data-movein="'+escape(move.id)+'"><label>Exported files<input type="file" name="files" multiple required accept=".zip,.pdf,.csv"></label><p>Up to 5 MiB per file and 20 MiB per move-in. Report CSV columns: Title, Client, Date (YYYY-MM-DD), with any other source columns retained.</p><button>Upload or resume files</button><p role="status" data-upload-status></p></form>'
  body+=(move.uploads??[]).length?'<ul class="records">'+move.uploads.map((u:any)=>'<li><span>'+escape(u.filename)+'</span><span>'+escape(u.received)+' of '+escape(u.size)+' bytes · '+(u.complete?'Ready':'Upload interrupted; select this file to resume')+'</span></li>').join('')+'</ul>':''
  if(!frozen)body+=command('preview',move.id,(better?'<p>Review the contact columns explicitly. Map normalized fields such as contact_id, first_name, last_name, company_name, company_id, title, phone, billing_address and service_address to the exact CSV headers. Names never merge identities.</p><label>Contacts CSV<select name="contactsFile" aria-label="Contacts CSV">'+(move.uploads??[]).filter((u:any)=>/\.csv$/i.test(u.filename)).map((u:any)=>'<option value="'+escape(u.sha256)+'"'+(review.contactsFile===u.sha256?' selected':'')+'>'+escape(u.filename)+'</option>').join('')+'</select></label><label>Reviewed contact mapping<textarea name="mapping" aria-label="Reviewed contact mapping" required rows="6">'+escape(JSON.stringify(review.mapping??{delimiter:',',columns:{},companyIds:{}},null,2))+'</textarea></label>'+hidden('choices',JSON.stringify(current?.choices??{}))+hidden('bindings',JSON.stringify(review.bindings??{}))+hidden('contactChoices',JSON.stringify(review.contactChoices??{})):'')+'<button>Preview document move-in</button>')
  else if(['queued','applying','failed'].includes(move.state))body+=command('continue',move.id,'<button>Continue document move-in</button>')
  if(move.job_id)body+=command('journal',move.id,'<button>Open document journal</button>')
  if(['completed','undoing'].includes(move.state))body+=command('undo',move.id,'<button>'+(move.state==='undoing'?'Continue document undo':'Undo document move-in')+'</button>')
  if(result?.id===move.id&&result.report) {
   body+=reportSummary(result.report)
   if(result.kind==='Document move-in'){
    const choices=JSON.stringify(result.choices??{})
    if(result.report.rows.length)body+=command('preview',move.id,reviewHidden()+result.report.rows.map((r:any)=>'<label>Report row '+escape(r.line)+': '+escape(r.title)+' · '+escape(r.client)+' · '+escape(r.date)+'<select name="match:'+escape(r.id)+'"><option value="">'+(r.candidates.length===1?'Automatic exact match':'Choose a PDF')+'</option>'+r.candidates.map((id:string)=>{const p=result.documents.find((p:any)=>p.id===id);return '<option value="'+escape(id)+'"'+(result.choices?.[r.id]===id?' selected':'')+'>'+escape(p.filename)+' · '+escape(p.client||'Client not in PDF')+' · '+escape(p.date||'Date not in PDF')+'</option>'}).join('')+'<option value="unmapped"'+(result.choices?.[r.id]==='unmapped'?' selected':'')+'>Leave this row unmapped</option></select></label>').join('')+'<button>Review report matches</button>')
    if(better)body+=command('preview',move.id,hidden('contactsFile',review.contactsFile)+hidden('mapping',JSON.stringify(review.mapping))+hidden('choices',choices)+'<h3>Review contact identities and document bindings</h3>'+result.report.contacts.map((c:any)=>'<label>'+escape([c.first_name,c.last_name,c.company_name,c.title,c.phone].filter(Boolean).join(' · '))+(c.ambiguous?' · Ambiguous identity':'')+'<select name="contact:'+escape(c.id)+'"><option value="include"'+(!c.held?' selected':'')+'>Retain this contact</option><option value="held"'+(c.held?' selected':'')+'>Hold for review</option></select></label>').join('')+result.documents.map((p:any)=>'<label>'+escape(p.filename)+'<select name="bind:'+escape(p.id)+'"><option value="held">Hold without a contact binding</option>'+result.report.contacts.filter((c:any)=>!c.held).map((c:any)=>'<option value="'+escape(c.id)+'"'+(review.bindings?.[p.id]===c.id?' selected':'')+'>'+escape([c.first_name,c.last_name,c.company_name,c.id].filter(Boolean).join(' · '))+'</option>').join('')+'</select></label>').join('')+'<button>Review contact bindings</button>')
    body+='<ul class="records">'+result.documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.filename)+' · '+(p.signatureEvidence.length?(better&&!review.bindings?.[p.id]||review.bindings?.[p.id]==='held'?'Signed-source document held for contact review':'Retained agreement'):'Open document held for review')+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p></article></li>').join('')+'</ul>'
    if(result.canApply)body+=command('apply',move.id,hidden('fingerprint',result.fingerprint)+hidden('choices',choices)+reviewHidden()+'<button>Apply reviewed document move-in</button>')
    else body+='<p>Resolve ambiguous matches and existing-document conflicts, then preview again. No originals have been replaced.</p>'
   }
   if(result.originals)body+='<h3>Original files and history</h3><ul class="records">'+result.originals.map((o:any)=>'<li><a href="/api/platter/imported-original?id='+encodeURIComponent(move.id)+'&amp;name='+encodeURIComponent(o.name)+'">Download '+escape(o.name)+'</a><span>'+escape(o.size)+' bytes</span></li>').join('')+'</ul><p>'+escape(result.provenance.length)+(better?' import changes recorded.':' document changes recorded.')+'</p>'
  }
  html+=panel(move.label,body,'document-movein-'+move.id)
 }
 const documents=state.importedDocuments??[]
 if(documents.length)html+=panel('Retained imported originals','<ul class="records">'+documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.disposition==='retained-agreement'?'Read-only retained agreement':p.disposition==='held-contact-review'?'Read-only document; contact review pending':'Read-only open document; reissue pending')+'</p><a href="/api/platter/imported-original?document='+encodeURIComponent(p.id)+'">Download original PDF</a><details><summary>Source evidence and SHA-256</summary><p class="json">'+escape(p.sha256)+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p></details></article></li>').join('')+'</ul>')
 return html+'<script src="/document-movein.js" defer></script>'
}

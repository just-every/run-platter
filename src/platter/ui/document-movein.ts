import { escape, form, hidden, field, panel } from './shared'
import { proposifyColumns } from '../movein/proposify-export'
import { importStatus } from './import-journal'

const command=(name:string,id:string,body:string)=>form('document-import.'+name,'/app/import',hidden('id',id)+body)
function reportSummary(report:any) {
 return '<dl>'+[['Arrived agreements',report.arrived],['Held for review',report.held],['Unmapped items',report.unmapped],['Duplicate PDFs skipped',report.duplicateDocuments]].map(([label,value])=>'<dt>'+label+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>'
  +'<ul>'+report.notes.map((note:string)=>'<li>'+escape(note)+'</li>').join('')+report.unmappedItems.map((name:string)=>'<li>Unmapped: '+escape(name)+'</li>').join('')+'</ul>'
}
export function documentMoveinPage(state:any,feedback?:any) {
 if(state.actor?.role!=='owner')return ''
 const result=feedback?.result?.documentMovein?feedback.result:null
 let html=panel('Move in exported documents','<p>Add PDFs, bulk ZIP downloads and report CSVs to one move-in across sessions. Upload the same file again to resume from its saved byte offset. Originals remain read-only; no invitation, payment or provider action is created.</p>'
  +form('document-import.create','/app/import',field('Move-in name','label','','required maxlength="150"')+'<label>Export source<select name="provider"><option value="generic">Other exported documents</option><option value="proposify">Proposify exported files</option></select></label><button>Start document move-in</button>'))
 const moves=state.documentMoveins??[]
 for(const move of moves) {
  const frozen=Boolean(move.fingerprint)
  let body='<p>'+escape(move.job_id?importStatus(move.state):'Collecting exported files')+'</p>'
  if(!frozen)body+='<form data-document-upload data-movein="'+escape(move.id)+'"><label>Exported files<input type="file" name="files" multiple required accept=".zip,.pdf,.csv"></label><p>Up to 5 MiB per file and 20 MiB per move-in. Report CSV columns: Title, Client, Date (YYYY-MM-DD), with any other source columns retained.</p><button>Upload or resume files</button><p role="status" data-upload-status></p></form>'
  body+=(move.uploads??[]).length?'<ul class="records">'+move.uploads.map((u:any)=>'<li><span>'+escape(u.filename)+'</span><span>'+escape(u.received)+' of '+escape(u.size)+' bytes · '+(u.complete?'Ready':'Upload interrupted; select this file to resume')+'</span></li>').join('')+'</ul>':''
  if(!frozen)body+=command('preview',move.id,'<button>Preview document move-in</button>')
  else if(['queued','applying','failed'].includes(move.state))body+=command('continue',move.id,'<button>Continue document move-in</button>')
  if(move.job_id)body+=command('journal',move.id,'<button>Open document journal</button>')
  if(['completed','undoing'].includes(move.state))body+=command('undo',move.id,'<button>'+(move.state==='undoing'?'Continue document undo':'Undo document move-in')+'</button>')
  if(move.provider==='proposify'&&move.state==='completed'){
   const templates=(state.importedDocuments??[]).filter((p:any)=>p.moveinId===move.id&&p.disposition==='held-template')
   const drafts=(state.proposals??[]).filter((p:any)=>p.status==='draft')
   if(templates.length&&drafts.length)body+='<details><summary>Apply Proposify template pages</summary><p>Use the separately identified template PDF as fixed pages. The chosen draft supplies all prices; report values remain source evidence. An independent personal template will be labelled rebuild in the editor. No Word reconstruction is available.</p>'+command('template-preview',move.id,'<label>Priced destination draft<select name="proposalChoice" required>'+drafts.map((p:any)=>'<option value="'+escape(p.id+':'+p.version)+'">'+escape(p.title)+'</option>').join('')+'</select></label>'+field('Independent template name','templateName','','required maxlength="150"')+'<label><input type="checkbox" name="consent" value="yes" required>I authorize these fixed pages and the selected draft prices.</label><button>Review fixed-page application</button>')+'</details>'
  }
  for(const application of move.applications??[])body+='<article><p>'+escape(application.reversed_at?'Fixed-page application undone':'Independent fixed-page template saved; rebuild in the editor')+'</p><a href="/app/proposal?id='+escape(application.proposal_id)+'">Open destination draft</a>'+(!application.reversed_at?command('template-undo',move.id,hidden('applicationId',application.id)+'<p>Undo is available only before later edits or template starts. Those dependencies are preserved.</p><button>Undo fixed-page application</button>'):'')+'</article>'
  if(result?.id===move.id&&result.kind==='Proposify fixed pages')body+=panel('Review fixed pages and supplied prices','<p>'+escape(result.sourceTitle)+' · '+escape(result.pages)+' fixed pages · rebuild in the editor</p><p class="json">'+escape(result.sourceSha256)+'</p><ul>'+result.prices.map((p:any)=>'<li>'+escape(p.name)+' · $'+escape((p.cents/100).toFixed(2))+' USD</li>').join('')+'</ul>'+command('template-apply',move.id,hidden('proposalId',result.proposalId)+hidden('version',result.version)+hidden('templateName',result.templateName)+hidden('consent','yes')+hidden('fingerprint',result.fingerprint)+'<button>Apply fixed pages and save independent template</button>'))
  if(result?.id===move.id&&result.report) {
   body+=reportSummary(result.report)
   if(result.kind==='Document move-in'){
    const choices=JSON.stringify(result.choices??{})
    const configuration=result.configuration,reviewFields=configuration?hidden('columns',JSON.stringify(configuration.columns))+hidden('templateDocument',configuration.templateDocument??''):''
    const mapping=configuration?'<fieldset><legend>Proposify source evidence columns</legend>'+Object.entries(proposifyColumns).map(([key,label])=>'<label>'+escape(label)+' column<select name="column:'+key+'" required><option value="">Choose source column</option>'+result.report.reportColumns.map((column:string)=>'<option value="'+escape(column)+'"'+(configuration.columns[key]===column?' selected':'')+'>'+escape(column)+'</option>').join('')+'</select></label>').join('')+'</fieldset><label>Separate template PDF<select name="templateDocument"><option value="">No template in this move-in</option>'+result.documents.filter((p:any)=>!p.signatureEvidence.length).map((p:any)=>'<option value="'+escape(p.id)+'"'+(configuration.templateDocument===p.id?' selected':'')+'>'+escape(p.filename)+'</option>').join('')+'</select></label>':''
    if(result.report.rows.length||configuration)body+=command('preview',move.id,mapping+result.report.rows.map((r:any)=>'<label>Report row '+escape(r.line)+': '+escape(r.title)+' · '+escape(r.client)+' · '+escape(r.date)+'<select name="match:'+escape(r.id)+'"><option value="">'+(r.candidates.length===1?'Automatic exact match':'Choose a PDF')+'</option>'+r.candidates.map((id:string)=>{const p=result.documents.find((p:any)=>p.id===id);return '<option value="'+escape(id)+'"'+(result.choices?.[r.id]===id?' selected':'')+'>'+escape(p.filename)+' · '+escape(p.client||'Client not in PDF')+' · '+escape(p.date||'Date not in PDF')+'</option>'}).join('')+'<option value="unmapped"'+(result.choices?.[r.id]==='unmapped'?' selected':'')+'>Leave this row unmapped</option></select></label>').join('')+'<button>Review report matches</button>')
    if(configuration)body+='<p>Mapped values and dates are source evidence only. They do not establish signature validity, a charge, a native client or an executable price.</p>'
    body+='<ul class="records">'+result.documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.filename)+' · '+(p.signatureEvidence.length?'Retained agreement':'Open document held for review')+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p></article></li>').join('')+'</ul>'
    if(result.canApply)body+=command('apply',move.id,hidden('fingerprint',result.fingerprint)+hidden('choices',choices)+reviewFields+'<button>Apply reviewed document move-in</button>')
    else body+='<p>Resolve ambiguous matches and existing-document conflicts, then preview again. No originals have been replaced.</p>'
   }
   if(result.report.rows?.length)body+='<details><summary>Matched source facts</summary>'+result.report.rows.map((r:any)=>'<article><h3>'+escape(r.title)+'</h3><p>'+escape(r.selected?'Matched original '+r.selected:'Unmapped report row')+'</p><dl>'+Object.entries(r.evidence??r.fields).map(([key,value])=>'<dt>'+escape(key)+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl></article>').join('')+'</details>'
   if(result.originals)body+='<h3>Original files and history</h3><ul class="records">'+result.originals.map((o:any)=>'<li><a href="/api/platter/imported-original?id='+encodeURIComponent(move.id)+'&amp;name='+encodeURIComponent(o.name)+'">Download '+escape(o.name)+'</a><span>'+escape(o.size)+' bytes</span></li>').join('')+'</ul><p>'+escape(result.provenance.length)+' document changes recorded.</p>'
  }
  html+=panel(move.label,body,'document-movein-'+move.id)
 }
 const documents=state.importedDocuments??[]
 if(documents.length)html+=panel('Retained imported originals','<ul class="records">'+documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.disposition==='held-template'?'Read-only template pages; rebuild in the editor':p.disposition==='retained-agreement'?'Read-only retained agreement':'Read-only open document; reissue pending')+'</p><a href="/api/platter/imported-original?document='+encodeURIComponent(p.id)+'">Download original PDF</a><details><summary>Source evidence and SHA-256</summary><p class="json">'+escape(p.sha256)+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p>'+(p.sourceEvidence?'<dl>'+Object.entries(p.sourceEvidence).map(([key,value])=>'<dt>'+escape(key)+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>':'')+'</details></article></li>').join('')+'</ul>')
 return html+'<script src="/document-movein.js" defer></script>'
}

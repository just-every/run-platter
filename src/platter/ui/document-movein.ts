import { escape, form, hidden, field, area, panel } from './shared'
import { importStatus } from './import-journal'

const command=(name:string,id:string,body:string)=>form('document-import.'+name,'/app/import',hidden('id',id)+body)
function sourceReport(data:any) {
 if(!data)return ''
 return '<h3>'+escape(data.provider==='qwilr'?'Qwilr PDF export':'Ignition export')+'</h3><dl>'+Object.entries(data.counts).map(([kind,count])=>'<dt>'+escape(kind)+'</dt><dd>'+escape(count)+'</dd>').join('')+'</dl><p>Billing schedules are non-executable source evidence. Client and service records are retained metadata; prices need separate promotion. Open proposals remain read-only and PDF content remains fixed.</p><details><summary>Source facts, dates, currencies and provenance</summary><pre class="json" tabindex="0">'+escape(JSON.stringify(data.facts,null,2))+'</pre></details>'
}
function reportSummary(report:any) {
 return '<dl>'+[['Arrived agreements',report.arrived],['Held for review',report.held],['Unmapped items',report.unmapped],['Duplicate PDFs skipped',report.duplicateDocuments]].map(([label,value])=>'<dt>'+label+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>'+sourceReport(report.exports)
  +'<ul>'+report.notes.map((note:string)=>'<li>'+escape(note)+'</li>').join('')+report.unmappedItems.map((name:string)=>'<li>Unmapped: '+escape(name)+'</li>').join('')+'</ul>'
}
export function documentMoveinPage(state:any,feedback?:any) {
 if(state.actor?.role!=='owner')return ''
 const result=feedback?.result?.documentMovein?feedback.result:null
 let html=panel('Move in exported documents','<p>Add PDFs, bulk ZIP downloads and report CSVs to one move-in across sessions. Upload the same file again to resume from its saved byte offset. Originals remain read-only; no invitation, payment or provider action is created.</p>'
  +form('document-import.create','/app/import',field('Move-in name','label','','required maxlength="150"')+'<label>Export source<select name="sourceProvider" aria-label="Export source"><option value="generic">Other document exports</option><option value="qwilr">Qwilr PDF exports</option><option value="ignition">Ignition exports</option></select></label><button>Start document move-in</button>'))
 const moves=state.documentMoveins??[]
 for(const move of moves) {
  const frozen=Boolean(move.fingerprint)
  let body='<p>'+escape(move.source_provider==='generic'?'Document exports':move.source_provider)+' · '+escape(move.job_id?importStatus(move.state):'Collecting exported files')+'</p>'
  if(move.source_provider!=='generic')body+='<p>Upload originals plus clients.csv, services.csv, proposals.csv and billing-schedules.csv for Ignition, or proposals.csv for Qwilr. Review exact column mappings and missing bindings before applying. No live connection is needed.</p>'
  if(!frozen)body+='<form data-document-upload data-movein="'+escape(move.id)+'"><label>Exported files<input type="file" name="files" multiple required accept=".zip,.pdf,.csv"></label><p>Up to 5 MiB per file and 20 MiB per move-in. Report CSV columns: Title, Client, Date (YYYY-MM-DD), with any other source columns retained.</p><button>Upload or resume files</button><p role="status" data-upload-status></p></form>'
  body+=(move.uploads??[]).length?'<ul class="records">'+move.uploads.map((u:any)=>'<li><span>'+escape(u.filename)+'</span><span>'+escape(u.received)+' of '+escape(u.size)+' bytes · '+(u.complete?'Ready':'Upload interrupted; select this file to resume')+'</span></li>').join('')+'</ul>':''
  if(!frozen)body+=command('preview',move.id,'<button>Preview document move-in</button>')
  else if(['queued','applying','failed'].includes(move.state))body+=command('continue',move.id,'<button>Continue document move-in</button>')
  if(move.job_id)body+=command('journal',move.id,'<button>Open document journal</button>')
  if(['completed','undoing'].includes(move.state))body+=command('undo',move.id,'<button>'+(move.state==='undoing'?'Continue document undo':'Undo document move-in')+'</button>')
  if(result?.id===move.id&&result.report) {
   body+=reportSummary(result.report)
   if(result.kind==='Document move-in'){
    const choices=JSON.stringify(result.choices??{}),mapping=JSON.stringify(result.report.exports?.mappings??{})
    if(result.report.rows.length||result.report.exports)body+=command('preview',move.id,(result.report.exports?area('Export column mapping (JSON)','mapping',JSON.stringify(result.report.exports.mappings,null,2),'spellcheck="false"')+result.report.exports.bindings.map((b:any)=>'<label>'+escape(b.label)+'<select name="match:'+escape(b.key)+'"><option value="">Review source binding</option>'+b.candidates.map((c:any)=>'<option value="'+escape(c.id)+'"'+(b.selected===c.id?' selected':'')+'>'+escape(c.label)+'</option>').join('')+'<option value="unmapped"'+(b.reviewed&&!b.selected?' selected':'')+'>Retain without a binding</option></select></label>').join(''):'')+result.report.rows.map((r:any)=>'<label>Report row '+escape(r.line)+': '+escape(r.title)+' · '+escape(r.client)+' · '+escape(r.date)+'<select name="match:'+escape(r.id)+'"><option value="">'+(r.candidates.length===1?'Automatic exact match':'Choose a PDF')+'</option>'+r.candidates.map((id:string)=>{const p=result.documents.find((p:any)=>p.id===id);return '<option value="'+escape(id)+'"'+(result.choices?.[r.id]===id?' selected':'')+'>'+escape(p.filename)+' · '+escape(p.client||'Client not in PDF')+' · '+escape(p.date||'Date not in PDF')+'</option>'}).join('')+'<option value="unmapped"'+(result.choices?.[r.id]==='unmapped'?' selected':'')+'>Leave this row unmapped</option></select></label>').join('')+'<button>Review report matches</button>')
    body+='<ul class="records">'+result.documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.filename)+' · '+(p.signatureEvidence.length?'Retained agreement':'Open document held for review')+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p></article></li>').join('')+'</ul>'
    if(result.canApply)body+=command('apply',move.id,hidden('fingerprint',result.fingerprint)+hidden('choices',choices)+hidden('mapping',mapping)+'<button>Apply reviewed document move-in</button>')
    else body+='<p>Resolve ambiguous matches and existing-document conflicts, then preview again. No originals have been replaced.</p>'
   }
   if(result.originals)body+='<h3>Original files and history</h3><ul class="records">'+result.originals.map((o:any)=>'<li><a href="/api/platter/imported-original?id='+encodeURIComponent(move.id)+'&amp;name='+encodeURIComponent(o.name)+'">Download '+escape(o.name)+'</a><span>'+escape(o.size)+' bytes</span></li>').join('')+'</ul><p>'+escape(result.provenance.length)+' document changes recorded.</p>'
  }
  html+=panel(move.label,body,'document-movein-'+move.id)
 }
 const facts=state.importedSourceFacts??[]
 if(facts.length)html+=panel('Retained source facts','<p>Read-only export history. Billing schedules cannot execute.</p><ul class="records">'+facts.map((f:any)=>'<li><details><summary>'+escape(f.provider+' '+f.kind+' '+f.sourceId)+'</summary><pre class="json" tabindex="0">'+escape(JSON.stringify(f,null,2))+'</pre></details></li>').join('')+'</ul>')
 const documents=state.importedDocuments??[]
 if(documents.length)html+=panel('Retained imported originals','<ul class="records">'+documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.disposition==='retained-agreement'?'Read-only retained agreement':'Read-only open document; reissue pending')+'</p><a href="/api/platter/imported-original?document='+encodeURIComponent(p.id)+'">Download original PDF</a><details><summary>Source evidence and SHA-256</summary><p class="json">'+escape(p.sha256)+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p></details></article></li>').join('')+'</ul>')
 return html+'<script src="/document-movein.js" defer></script>'
}

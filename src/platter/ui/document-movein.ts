import { escape, form, hidden, field, panel } from './shared'
import { importStatus } from './import-journal'

const command=(name:string,id:string,body:string)=>form('document-import.'+name,'/app/import',hidden('id',id)+body)
function reportSummary(report:any,content=false) {
 return '<dl>'+[[content?'Arrived outputs':'Arrived agreements',report.arrived],['Held for review',report.held],['Unmapped items',report.unmapped],[content?'Repeated files skipped':'Duplicate PDFs skipped',report.duplicateDocuments]].map(([label,value])=>'<dt>'+label+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>'
  +'<ul>'+report.notes.map((note:string)=>'<li>'+escape(note)+'</li>').join('')+report.unmappedItems.map((name:string)=>'<li>Unmapped: '+escape(name)+'</li>').join('')+'</ul>'
}
export function documentMoveinPage(state:any,feedback?:any) {
 if(state.actor?.role!=='owner')return ''
 const result=feedback?.result?.documentMovein?feedback.result:null
 let html=panel('Move in exported documents','<p>Add PDFs, bulk ZIP downloads and report CSVs to one move-in across sessions. Upload the same file again to resume from its saved byte offset. Originals remain read-only; no invitation, payment or provider action is created.</p>'
  +form('document-import.create','/app/import',field('Move-in name','label','','required maxlength="150"')+'<label for="document-source-kind">Source content</label><select id="document-source-kind" name="contentKind"><option value="documents">Retained exported documents</option><option value="pandadoc-template">PandaDoc Word or fixed PDF templates</option><option value="pandadoc-library">PandaDoc Word library sections</option></select>'+'<button>Start document move-in</button>'))
 const moves=state.documentMoveins??[]
 for(const move of moves) {
  const frozen=Boolean(move.fingerprint),content=move.kind?.startsWith('pandadoc-')
  let body=(content?'<p>PandaDoc '+(move.kind==='pandadoc-library'?'library sections':'templates')+' · Review conversion before applying. No recipients or prices are inferred.</p>':'')+'<p>'+escape(move.job_id||content&&frozen?importStatus(move.state):'Collecting exported files')+'</p>'
  if(!frozen)body+='<form data-document-upload data-movein="'+escape(move.id)+'"><label>Exported files<input type="file" name="files" multiple required accept="'+(content?'.docx,.pdf':'.zip,.pdf,.csv')+'"></label><p>Up to 5 MiB per file and 20 MiB per move-in. Report CSV columns: Title, Client, Date (YYYY-MM-DD), with any other source columns retained.</p><button>Upload or resume files</button><p role="status" data-upload-status></p></form>'
  body+=(move.uploads??[]).length?'<ul class="records">'+move.uploads.map((u:any)=>'<li><span>'+escape(u.filename)+'</span><span>'+escape(u.received)+' of '+escape(u.size)+' bytes · '+(u.complete?'Ready':'Upload interrupted; select this file to resume')+'</span></li>').join('')+'</ul>':''
  if(!frozen)body+=command('preview',move.id,'<button>Preview document move-in</button>')
  else if(['queued','applying','failed'].includes(move.state))body+=command('continue',move.id,'<button>Continue document move-in</button>')
  if(move.job_id||content&&frozen)body+=command('journal',move.id,'<button>Open document journal</button>')
  if(['completed','undoing'].includes(move.state))body+=command('undo',move.id,'<button>'+(move.state==='undoing'?'Continue document undo':'Undo document move-in')+'</button>')
  if(result?.id===move.id&&result.report) {
   body+=reportSummary(result.report,content)
   if(result.kind==='PandaDoc content'){
    body+='<ul class="records">'+result.report.outputs.map((o:any)=>'<li><article style="min-width:0"><h3>'+escape(o.title)+'</h3><p>'+escape(o.fixed?'Fixed pages · Word download needed for editing':o.kind==='template'?'Editable template':'Library section')+'</p><details><summary>Output reference</summary><p class="wrap">'+escape(o.id)+'</p></details>'+(o.needsPrice?'<p>Source price not supplied; choose a new price when starting a draft.</p>':'')+(o.blocks??[]).map((b:any)=>'<p>'+escape(b.title||b.text||b.alt||b.type)+'</p>').join('')+(o.options??[]).map((option:any)=>'<p>Total: $'+escape((option.cents/100).toFixed(2))+'</p><table style="width:100%;table-layout:fixed"><thead><tr><th>Quote row</th><th>Quantity</th><th>Unit price</th><th>Catalog match</th></tr></thead><tbody>'+(option.tables??[]).flatMap((t:any)=>t.lines).map((l:any)=>'<tr><td>'+escape(l.name)+'</td><td>'+escape(l.quantity)+'</td><td>$'+escape(l.unitPrice)+'</td><td>'+escape(l.catalogId?'Linked':'Unmatched')+'</td></tr>').join('')+'</tbody></table>').join('')+'</article></li>').join('')+'</ul>'
    if(!frozen&&result.canApply)body+=command('apply',move.id,hidden('fingerprint',result.fingerprint)+'<button>Apply reviewed PandaDoc conversion</button>')
    if(frozen&&result.sources)body+='<h3>Reviewed originals</h3><ul>'+result.sources.map((s:any)=>'<li><a href="/api/platter/imported-original?id='+encodeURIComponent(move.id)+'&amp;name='+encodeURIComponent(s.sha256)+'">Download '+escape(s.filename)+'</a><p class="wrap">SHA-256: '+escape(s.sha256)+'</p></li>').join('')+'</ul>'
   }
   if(result.kind==='Document move-in'){
    const choices=JSON.stringify(result.choices??{})
    if(result.report.rows.length)body+=command('preview',move.id,result.report.rows.map((r:any)=>'<label>Report row '+escape(r.line)+': '+escape(r.title)+' · '+escape(r.client)+' · '+escape(r.date)+'<select name="match:'+escape(r.id)+'"><option value="">'+(r.candidates.length===1?'Automatic exact match':'Choose a PDF')+'</option>'+r.candidates.map((id:string)=>{const p=result.documents.find((p:any)=>p.id===id);return '<option value="'+escape(id)+'"'+(result.choices?.[r.id]===id?' selected':'')+'>'+escape(p.filename)+' · '+escape(p.client||'Client not in PDF')+' · '+escape(p.date||'Date not in PDF')+'</option>'}).join('')+'<option value="unmapped"'+(result.choices?.[r.id]==='unmapped'?' selected':'')+'>Leave this row unmapped</option></select></label>').join('')+'<button>Review report matches</button>')
    body+='<ul class="records">'+result.documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.filename)+' · '+(p.signatureEvidence.length?'Retained agreement':'Open document held for review')+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p></article></li>').join('')+'</ul>'
    if(result.canApply)body+=command('apply',move.id,hidden('fingerprint',result.fingerprint)+hidden('choices',choices)+'<button>Apply reviewed document move-in</button>')
    else body+='<p>Resolve ambiguous matches and existing-document conflicts, then preview again. No originals have been replaced.</p>'
   }
   if(result.originals)body+='<h3>Original files and history</h3><ul class="records">'+result.originals.map((o:any)=>'<li><a href="/api/platter/imported-original?id='+encodeURIComponent(move.id)+'&amp;name='+encodeURIComponent(o.name)+'">Download '+escape(o.name)+'</a><span>'+escape(o.size)+' bytes</span></li>').join('')+'</ul><p>'+escape(result.provenance.length)+' document changes recorded.</p>'
  }
  html+=panel(move.label,body,'document-movein-'+move.id)
 }
 const documents=state.importedDocuments??[]
 if(documents.length)html+=panel('Retained imported originals','<ul class="records">'+documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.disposition==='retained-agreement'?'Read-only retained agreement':'Read-only open document; reissue pending')+'</p><a href="/api/platter/imported-original?document='+encodeURIComponent(p.id)+'">Download original PDF</a><details><summary>Source evidence and SHA-256</summary><p class="json">'+escape(p.sha256)+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p></details></article></li>').join('')+'</ul>')
 return html+'<script src="/document-movein.js" defer></script>'
}

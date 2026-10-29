import { escape, form, hidden, field, panel } from './shared'
import { importStatus } from './import-journal'

const command=(name:string,id:string,body:string)=>form('document-import.'+name,'/app/import',hidden('id',id)+body)
function reportSummary(report:any) {
 return '<dl>'+[['Arrived agreements',report.arrived],['Held for review',report.held],['Unmapped items',report.unmapped],['Duplicate PDFs skipped',report.duplicateDocuments],['Arrived drafts',report.arrivedDrafts??0],['Other native records',report.arrivedResources??0]].map(([label,value])=>'<dt>'+label+'</dt><dd>'+escape(value)+'</dd>').join('')+'</dl>'
  +'<ul>'+report.notes.map((note:string)=>'<li>'+escape(note)+'</li>').join('')+report.unmappedItems.map((name:string)=>'<li>Unmapped: '+escape(name)+'</li>').join('')+'</ul>'
}
export function documentMoveinPage(state:any,feedback?:any) {
 if(state.actor?.role!=='owner')return ''
 const result=feedback?.result?.documentMovein?feedback.result:null
 let html=panel('Move in exported documents','<p>Add PDFs, Word downloads, bulk ZIP downloads and CSVs to one move-in across sessions. Upload the same file again to resume from its saved byte offset. Originals remain read-only; no invitation, payment or provider action is created.</p>'
  +form('document-import.create','/app/import',field('Move-in name','label','','required maxlength="150"')+'<button>Start document move-in</button>'))
 const moves=state.documentMoveins??[]
 for(const move of moves) {
  const frozen=Boolean(move.fingerprint)
  let body='<p>'+escape(move.job_id?importStatus(move.state):'Collecting exported files')+'</p>'
  if(!frozen)body+='<form data-document-upload data-movein="'+escape(move.id)+'"><label>Exported files<input type="file" name="files" multiple required accept=".zip,.pdf,.csv,.docx"></label><p>Up to 5 MiB per file and 20 MiB per move-in. Report CSV columns: Title, Client, Date (YYYY-MM-DD), with any other source columns retained.</p><button>Upload or resume files</button><p role="status" data-upload-status></p></form>'
  body+=(move.uploads??[]).length?'<ul class="records">'+move.uploads.map((u:any)=>'<li><span>'+escape(u.filename)+'</span><span>'+escape(u.received)+' of '+escape(u.size)+' bytes · '+(u.complete?'Ready':'Upload interrupted; select this file to resume')+'</span></li>').join('')+'</ul>':''
  if(!frozen)body+=command('preview',move.id,'<button>Preview document move-in</button>')
  else if(['queued','applying','failed'].includes(move.state))body+=command('continue',move.id,'<button>Continue document move-in</button>')
  if(move.job_id)body+=command('journal',move.id,'<button>Open document journal</button>')
  if(['completed','undoing'].includes(move.state))body+=command('undo',move.id,'<button>'+(move.state==='undoing'?'Continue document undo':'Undo document move-in')+'</button>')
  if(result?.id===move.id&&result.report) {
   body+=reportSummary(result.report)+nativeResources(result.report.resources??[])
   if(result.diagnostics?.length)body+='<ul>'+result.diagnostics.map((d:any)=>'<li>'+escape(d.message)+'</li>').join('')+'</ul>'
   if(result.kind==='Document move-in'){
    const choices=JSON.stringify(result.choices??{}),mapping=JSON.stringify(result.mapping??{})
    if(result.report.rows.length)body+=command('preview',move.id,hidden('mapping',mapping)+result.report.rows.map((r:any)=>'<label>Report row '+escape(r.line)+': '+escape(r.title)+' · '+escape(r.client)+' · '+escape(r.date)+'<select name="match:'+escape(r.id)+'"><option value="">'+(r.candidates.length===1?'Automatic exact match':'Choose a PDF')+'</option>'+r.candidates.map((id:string)=>{const p=result.documents.find((p:any)=>p.id===id);return '<option value="'+escape(id)+'"'+(result.choices?.[r.id]===id?' selected':'')+'>'+escape(p.sources.join('; '))+' · SHA-256 '+escape(p.sha256.slice(0,12))+' · '+escape(p.client||'Client not in PDF')+' · '+escape(p.date||'Date not in PDF')+'</option>'}).join('')+'<option value="unmapped"'+(result.choices?.[r.id]==='unmapped'?' selected':'')+'>Leave this row unmapped</option></select></label>').join('')+'<button>Review report matches</button>')
    body+=destinationReview(state,move.id,result,choices)
    body+='<ul class="records">'+result.documents.map((p:any)=>'<li><article><h3>'+escape(p.title)+'</h3><p>'+escape(p.filename)+' · '+(p.signatureEvidence.length?'Retained agreement':'Open document held for review')+'</p><p>'+p.signatureEvidence.map((e:any)=>escape(e.kind)+' on page '+escape(e.page)).join(', ')+'</p></article></li>').join('')+'</ul>'
    if(result.canApply)body+=command('apply',move.id,hidden('fingerprint',result.fingerprint)+hidden('choices',choices)+hidden('mapping',mapping)+'<button>Apply reviewed document move-in</button>')
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

function nativeResources(resources:any[]){
 return resources.length?'<h3>Native destinations</h3><ul class="records">'+resources.map(r=>'<li><span>'+escape(r.title??r.filename)+' · '+escape(r.kind)+(r.count?' · '+r.count+' records':'')+'</span>'+(r.report?'<span>'+escape([...r.report.unknown,...r.report.unmatched,...r.report.missing].join('; '))+'</span>':'')+'</li>').join('')+'</ul>':''
}
function destinationReview(state:any,id:string,result:any,choices:string){
 const option=(value:string,label:string,current:string)=>'<option value="'+value+'"'+(current===value?' selected':'')+'>'+label+'</option>'
 const fields=result.files.filter((f:any)=>/\.(pdf|docx|csv)$/i.test(f.filename)).map((file:any)=>{
  const hash=file.sha256,rule=result.mapping?.[hash]??{},pdf=result.documents.find((d:any)=>d.sha256===hash),word=/\.docx$/i.test(file.filename),csv=/\.csv$/i.test(file.filename)
  let kinds=option('','Keep original and report only',rule.kind??'')
  if(!csv){if(!pdf?.signatureEvidence?.length)kinds+=option('draft','New draft for reissue',rule.kind);kinds+=option('template',word?'Editable personal template':'Fixed-page personal template',rule.kind);if(word)kinds+=option('library','Library sections from Heading 1',rule.kind)}
  else kinds+=option('catalog','Catalog records',rule.kind)+option('contacts','Contacts',rule.kind)
  let body='<fieldset><legend>'+escape(file.filename)+'</legend><p>'+escape(file.source)+' · SHA-256 '+escape(hash.slice(0,12))+'</p><label>Destination for '+escape(file.filename)+'<select name="destination:'+hash+'">'+kinds+'</select></label>'
  if(!csv)body+='<label>Draft client for '+escape(file.filename)+'<select name="client:'+hash+'"><option value="">Choose for a new draft</option>'+(state.clients??[]).map((c:any)=>option(c.id,escape(c.name),rule.clientId)).join('')+'</select></label>'+field('Fallback offer price for '+file.filename,'price:'+hash,rule.price??'','inputmode="decimal"')+'<p>Set a positive USD offer price for a new draft or template without a quote table. Imported fees are reviewed before a new offer can be approved or sent.</p>'+(word?'<label><input type="checkbox" name="share:'+hash+'" value="yes"'+(rule.shareConsent?' checked':'')+'>Authorize shared library access to these imported sections</label>':'')
  else body+='<label>CSV layout for '+escape(file.filename)+'<select name="format:'+hash+'">'+['platter','pandadoc','proposify','betterproposals','qwilr','ignition','mapping'].map(f=>option(f,f,rule.format??'platter')).join('')+'</select></label><label>Reviewed column mapping for '+escape(file.filename)+'<textarea name="columns:'+hash+'">'+escape(rule.mapping?JSON.stringify(rule.mapping):'')+'</textarea></label><label><input type="checkbox" name="without-images:'+hash+'" value="yes"'+(rule.omitUnfetchedImages?' checked':'')+'>Apply this exact CSV without unfetched images</label>'
  return body+'</fieldset>'
 }).join('')
 return '<details><summary>Choose native file destinations</summary><p>Retain originals by default. Review a client and price for reissue, choose a Word template or library conversion, or map a contacts or catalog CSV. Library sharing with its current readers needs explicit authorization.</p>'+command('preview',id,hidden('choices',choices)+fields+'<button>Review file destinations</button>')+'</details>'
}

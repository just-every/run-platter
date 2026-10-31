import { escape, field, form, hidden, panel } from './shared'

export function draftSourcesPanel(state:any) {
 if(state.actor?.role!=='owner')return ''
 const upload=(source?:any)=>'<form method="post" action="/app/draft-source" enctype="multipart/form-data">'+(source?hidden('id',source.id)+hidden('version',source.version):'')+field('Source title','title',source?.title??'','required maxlength="200"')+'<label>Plain text notes or transcript<input type="file" name="file" accept=".txt,text/plain" required></label><button>'+(source?'Upload new version':'Upload private source')+'</button></form>'
 const sources=(state.draftSources??[]).map((source:any)=>{
  const grants=(state.draftSourceConsent??[]).filter((c:any)=>c.source_id===source.id&&c.source_version===source.version)
  const keys=(state.agentKeys??[]).filter((key:any)=>!key.revokedAt&&key.expiresAt>Date.now())
  const binding=keys.length?form('draft-source.consent','/app/settings',hidden('sourceId',source.id)+hidden('sourceVersion',source.version)+'<label>Agent key<select name="keyId" aria-label="Agent key" required>'+keys.map((key:any)=>'<option value="'+escape(key.id)+'">'+escape(key.label)+(grants.some((c:any)=>c.key_id===key.id)?' · consent active':' · no consent')+'</option>').join('')+'</select></label><label><input type="checkbox" name="consent" value="yes" required>I allow this key to bind externally prepared sections to this exact source version. The key cannot retrieve the original.</label><button>Allow source binding</button>'):'<p>Create an owner-bound key under Agent access to allow source binding.</p>'
  return '<details><summary>'+escape(source.title)+' · version '+source.version+' · '+source.lineCount+' lines</summary><p class="preserve">SHA-256: '+escape(source.sha256)+'</p><a href="/app/draft-source?id='+encodeURIComponent(source.id)+'&amp;version='+source.version+'">Inspect numbered original</a>'+upload(source)+binding+grants.map((grant:any)=>form('draft-source.consent','/app/settings',hidden('sourceId',source.id)+hidden('sourceVersion',source.version)+hidden('keyId',grant.key_id)+hidden('consent','no')+'<p>Active binding: '+escape(keys.find((key:any)=>key.id===grant.key_id)?.label??'Unavailable key')+'</p><button>Revoke source binding</button>')).join('')+'</details>'
 }).join('')
 return panel('Draft sources','<p>Upload private plain text for externally prepared drafts. Originals are immutable and only the owner can inspect them. A new version requires fresh key consent. Platter does not generate text or make outbound model calls. Every draft still needs human review, approval and sending.</p>'+upload()+sources)
}
export function originalSourcePage(source:any) {
 return '<a href="/app/settings">Back to Settings</a><h2>'+escape(source.title)+' · version '+source.version+'</h2><p class="wrap">SHA-256: '+escape(source.sha256)+'</p><p>Line numbers include empty lines. Citations use the selected immutable version.</p><ol class="draft-source-lines">'+source.lines.map((line:any)=>'<li><pre class="preserve">'+escape(line.text||' ')+'</pre></li>').join('')+'</ol>'
}
export function draftProvenancePanel(state:any,id:string) {
 if(state.actor?.role!=='owner')return ''
 const source=state.draftProvenance?.find((row:any)=>row.proposal_id===id)
 if(!source)return ''
 return panel('Prepared source references','<p>Prepared externally for revision '+source.revision+'. Later edits require fresh review; these references describe the original preparation.</p><a href="/app/draft-source?id='+encodeURIComponent(source.source_id)+'&amp;version='+source.source_version+'">Inspect private source version '+source.source_version+'</a><ul>'+source.sections.map((ref:any)=>'<li>'+escape(ref.sectionId)+': lines '+ref.startLine+'–'+ref.endLine+'</li>').join('')+'</ul>')
}

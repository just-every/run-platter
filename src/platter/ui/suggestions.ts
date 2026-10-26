import { documentTextTargets } from '../documents/blocks'
import { area, date, escape, form, hidden, panel, proposalPath } from './shared'
const tracked=(rows:any[],labels=new Map<string,string>())=>rows.map(s=>`<article><h3>${escape(labels.get(s.section)??(s.section.startsWith('block:')?'Document text':s.section))} suggestion</h3><p>${date(s.created_at)} · Revision ${escape(s.revision)}</p><p class="preserve"><del>${escape(s.original)}</del><br><ins>${escape(s.replacement)}</ins></p><p>${escape(s.decision??'Awaiting review')}${s.resulting_revision?` · Revision ${escape(s.resulting_revision)}`:''}</p></article>`).join('')
export function suggestionsPanel(state:any,p:any){
 if(!p.canEdit)return ''
 const live=p.sentRevision??p.revision,path=proposalPath(p.id),source=(state.revisions??[]).find((r:any)=>r.proposal_id===p.id&&r.revision===live)?.snapshot??p,targets=documentTextTargets(source),labels=new Map(targets.map(t=>[t.section,t.label]))
 const controls=p.status==='sent'||p.negotiating?['scope','terms',...targets.map(t=>t.section)].map(section=>{
  const enabled=p.suggestionSections.some((s:any)=>s.revision===live&&s.section===section)
  return form('suggestions.allow',path,hidden('id',p.id)+hidden('version',p.version)+hidden('section',section)+hidden('enabled',enabled?'no':'yes')+`<button>${enabled?'Close':'Allow'} ${escape(labels.get(section)??section)} suggestions</button>`)
 }).join(''):''
 const rows=(p.suggestions??[]).map((s:any)=>tracked([s],labels)+(!s.decision&&s.revision===live&&(p.status==='sent'||p.negotiating)?form('suggestion.resolve',path,hidden('id',p.id)+hidden('version',p.version)+hidden('suggestionId',s.id)+'<button name="decision" value="accepted">Accept suggestion</button><button name="decision" value="rejected">Reject suggestion</button>'):'' )).join('')
 return controls||rows?panel('Client text suggestions',controls+rows):''
}
export function clientSuggestions(view:any,publicForm:(name:string,body:string)=>string){
 const labels=new Map(documentTextTargets(view).map(t=>[t.section,t.label])),sections=(view.suggestionSections??[]).filter((s:any)=>!s.section.startsWith('block:')||labels.has(s.section)),rows=view.suggestions??[]
 if(!sections.length&&!rows.length)return ''
 const forms=view.status==='sent'&&view.verified?sections.map((s:any)=>publicForm('suggestion.create',hidden('section',s.section)+hidden('revision',view.revision)+`<h3>Suggest an edit to ${escape(labels.get(s.section)??s.section)}</h3>`+area('Existing text','original','', 'required')+area('Suggested replacement','replacement','', 'required')+'<button>Submit text suggestion</button>')).join(''):view.status==='sent'?'<p>Verify your '+(view.verificationMethod==='SMS code'?'identity':'email')+' to suggest text edits.</p>':''
 return panel('Text suggestions', '<p>Suggestions never change your offer or prices. The firm reviews each edit and sends a newly approved revision.</p>'+tracked(rows,labels)+forms)
}

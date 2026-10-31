import { templateVariableNames } from '../variables'
import { area, escape, form, hidden, money, panel, type Feedback } from './shared'

const path='/app/bulk-drafts'
export function bulkDraftPage(state:any,params:URLSearchParams,feedback?:Feedback){
 if(state.actor.role!=='owner')return ''
 const templates=state.templates??[],selected=templates.find((t:any)=>t.id===(params.get('templateId')??feedback?.input?.templateId))??templates[0]
 const review=feedback?.result?.rows?feedback.result:state.bulkDrafts?.rows?state.bulkDrafts:null
 let html='<p><a href="/app">All proposals</a></p><p>Create independent unsent drafts for existing clients. Review a sample and every exception before each bounded creation step. Approval and sending remain separate human actions.</p>'
 if(selected){
  const content=selected.snapshot,variables=templateVariableNames(content)
  const columns=['client',...variables.map(k=>'var:'+k),...content.options.map((o:any)=>'price:'+o.id)]
  html+=panel('Review a client CSV','<form method="get" action="'+path+'"><label>Template<select name="templateId" aria-label="Template">'+templates.map((t:any)=>'<option value="'+escape(t.id)+'"'+(t.id===selected.id?' selected':'')+'>'+escape(t.name)+' · version '+escape(t.version)+'</option>').join('')+'</select></label><button class="secondary">Choose template</button></form>'
   +'<p>Use an exact existing client ID or an unambiguous client name in the first column. Enter a value for every variable and an explicit USD price for every flat package.</p><p class="wrap"><code>'+escape(columns.join(','))+'</code></p>'
   +form('bulk.preview',path,hidden('requestId',crypto.randomUUID())+hidden('templateId',selected.id)+hidden('templateVersion',selected.version)+area('Client CSV','csv',feedback?.input?.csv??'','required maxlength="60000"')+'<button>Preview bulk drafts</button>'))
 }else html+=panel('Save a template first','<p>Save an ordinary single-client USD proposal as a personal template before reviewing a CSV.</p>')
 if(review){
  const pending=review.eligible-review.completed
  html+=panel('Reviewed bulk drafts','<p role="status">'+review.rows.length+' rows · '+review.eligible+' eligible · '+review.held+' held · '+review.completed+' drafts created</p><p class="wrap">CSV SHA-256: <code>'+escape(review.csvHash)+'</code></p><p>Template version '+escape(review.templateVersion)+'. Collection off. Reminders and expiry are copied settings; no outbound authority is activated.</p>'
   +(review.sample?sample(review.sample):'')
   +'<h3>Exceptions</h3>'+(review.held?'<ul aria-label="Held rows">'+review.rows.filter((r:any)=>r.exception).map((r:any)=>'<li>Row '+r.ordinal+' · '+escape(r.client)+' · '+escape(r.exception)+'</li>').join('')+'</ul>':'<p>No held rows.</p>')
   +(pending&&review.active?form('bulk.apply',path,hidden('id',review.id)+hidden('digest',review.digest)+hidden('csv',review.csv)+hidden('templateVersion',review.templateVersion)+'<label class="choice"><input name="consent" value="yes" type="checkbox" required><span>I reviewed the sample, prices and exceptions. Create the next eligible drafts.</span></label><button>'+(review.completed?'Continue reviewed drafts':'Create reviewed drafts')+'</button>'):!review.active?'<p>This retained batch is inactive. Restored history grants no creation authority.</p>':'<p>Every eligible draft is created. Held rows remain unchanged.</p>')
   +'<h3>Row progress</h3><ul aria-label="Bulk draft progress">'+review.rows.map((r:any)=>'<li>Row '+r.ordinal+' · '+escape(r.client)+' · '+(r.proposalId?'<a href="/app/proposal?id='+escape(r.proposalId)+'">Open draft '+r.ordinal+'</a>':r.exception?'Held':'Waiting')+'</li>').join('')+'</ul>')
 }
 const batches=state.bulkBatchList?.batches??[]
 if(batches.length)html+=panel('Resume a reviewed batch','<ul>'+batches.map((b:any)=>'<li><a href="'+path+'?id='+escape(b.id)+'">Open batch '+escape(b.id.slice(0,8))+'</a> · template version '+escape(b.template_version)+'</li>').join('')+'</ul>')
 return html
}
function sample(row:any){
 const content=row.content
 return '<article aria-label="Sample bulk draft"><h3>Sample: row '+row.ordinal+'</h3><p>Client: '+escape(row.client)+'</p><h4>'+escape(content.snapshot.title)+'</h4><p class="preserve">'+escape(content.snapshot.scope)+'</p><ul>'+content.snapshot.options.map((o:any)=>'<li>'+escape(o.label)+' · '+money(o.cents,'USD')+'</li>').join('')+'</ul><p>Reminder days: '+escape(content.delivery.settings.reminderDays.join(', '))+'. Expiry: '+escape(content.delivery.expiry.period_days??'never')+' days.</p></article>'
}

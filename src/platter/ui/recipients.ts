import { recipientPlan } from '../recipients'
import { date, escape, field, form, hidden, panel, proposalPath } from './shared'

export function recipientsPanel(state:any,p:any){
 const plan=recipientPlan(p),editable=state.actor.role==='owner'&&['draft','approved'].includes(p.status)&&!p.negotiating
 if(!plan.length&&!editable)return ''
 const fields=(r:any={})=>hidden('id',p.id)+hidden('version',p.version)+(r.id?hidden('recipientId',r.id):'')+
  field('Recipient name','recipientName',r.name??'','required maxlength="200"')+
  field('Recipient email','recipientEmail',r.email??'','type="email" maxlength="254"')+
  '<label>Recipient role<select name="recipientRole" aria-label="Recipient role">'+[['signer','Signer'],['approver','Client approver'],['viewer','Viewer'],['cc','CC'],['countersigner','Owner countersigner']].map(([value,label])=>'<option value="'+value+'"'+(r.role===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  field('Signing group','recipientGroup',r.group??1,'type="number" min="1" max="10000" required')
 const rows=plan.map(r=>{
  const signature=p.recipientSignatures?.find((s:any)=>s.slot_id===r.id)
  const link=p.recipientLinks?.find((s:any)=>s.slot_id===r.id)
  const preview=editable?'<a href="/app/preview?id='+encodeURIComponent(p.id)+'&amp;revision='+p.revision+'&amp;recipientId='+encodeURIComponent(r.id)+'">Preview as '+escape(r.name)+'</a>':''
  const edit=editable?'<details><summary>Edit '+escape(r.name)+'</summary>'+form('recipient.save',proposalPath(p.id),fields(r)+'<button>Save recipient</button>')+'</details>':''
  const remove=state.actor.role==='owner'&&(['draft','approved'].includes(p.status)||p.status==='sent'&&['viewer','cc'].includes(r.role))?form('recipient.remove',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+hidden('recipientId',r.id)+'<button class="secondary">Remove '+escape(r.name)+'</button>'):''
  return '<li><p><strong>'+escape(r.name)+'</strong> · '+escape(r.role)+' · Group '+r.group+'</p><p>'+escape(r.email??'Mailbox not assigned')+'</p>'+(signature?'<p>'+escape(signature.voided_at?'Signature void':'Decision retained')+' · '+date(signature.signed_at)+'</p>':'')+preview+(link?'<p><a href="/p/'+escape(link.token)+'">Open '+escape(r.name)+' invitation</a></p>'+(link.embed_origin?'<p>Embedded only on '+escape(link.embed_origin)+'</p><label>Embed code<textarea readonly rows="3" aria-label="Embed code">'+escape('<iframe src="'+state.origin+'/p/'+link.token+'?embed=1" title="Verified proposal" width="100%" height="900"></iframe>')+'</textarea></label>':''):'')+edit+remove+'</li>'
 }).join('')
 const add=editable?'<details><summary>Add recipient</summary><p>Start with the client signer. Recipients in the same group act in parallel; higher groups wait. Only the current owner can countersign. An empty required mailbox prevents sending.</p>'+form('recipient.save',proposalPath(p.id),fields()+'<button>Add recipient slot</button>')+'</details>':''
 const share=state.actor.role==='owner'&&p.status==='sent'&&plan.length?'<details><summary>Share a verified viewing link</summary><p>This creates a personal viewing link without sending an invitation. The recipient verifies their mailbox before seeing content. An embedded link allows only the site origin explicitly recorded here.</p>'+form('recipient.share',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+field('Shared viewer name','recipientName','','required maxlength="200"')+field('Shared viewer email','recipientEmail','','required type="email" maxlength="254"')+field('Embed site origin (optional)','embedOrigin','','type="url"')+'<label class="choice"><input type="checkbox" name="shareConsent" value="yes" required>Authorize this viewer and the framing origin shown above.</label><button>Create viewing link</button>')+'</details>':''
 const history=p.recipientSignatureHistory??p.recipientSignatures
 const signatures=history?.length?'<ul aria-label="Signature history">'+history.map((s:any)=>'<li>Revision '+escape(s.revision)+' · '+escape(s.name)+' · '+escape(s.role)+' · '+date(s.signed_at)+(s.voided_at?' · Void: '+escape(s.void_reason):'')+'</li>').join('')+'</ul>':''
 return panel('Recipients and signing','<p>Each person verifies their own mailbox. Adding or changing required recipients clears approval. The agreement completes after every required signature and client approval.</p>'+(rows?'<ol class="records">'+rows+'</ol>':'<p>The default invitation has one client signer.</p>')+add+share+signatures)
}
export function recipientClientPanel(view:any,publicForm:(name:string,body:string)=>string){
 const progress=view.recipientProgress
 if(!progress)return ''
 const r=progress.recipient
 let body='<p>Viewing as '+escape(r.name)+' · '+escape(r.role)+' · Group '+r.group+'</p>'
 if(!['signer','countersigner','approver'].includes(r.role))body+='<p>This invitation is for viewing only. It grants no signing or payment authority.</p>'
 else if(progress.signed)body+='<p>Your decision is retained. Waiting for the remaining recipients.</p>'
 else if(!progress.ready)body+='<p>Waiting for the preceding signing group. You can review this proposal now.</p>'
 else if(r.role==='approver'&&view.verified&&!view.expiry?.expired)body+=publicForm('recipient.approve',hidden('optionId',view.selectedOptionId)+field('Your full name','name','','required maxlength="200"')+'<label class="choice"><input type="checkbox" name="consent" value="yes" required> I approve this exact proposal revision and selected package.</label><button>Approve client revision</button>')
 const history=progress.signatures.length?'<ol>'+progress.signatures.map((s:any)=>'<li>'+escape(s.name)+' · '+escape(s.role)+' · '+date(s.signedAt)+'</li>').join('')+'</ol>':''
 return panel('Your recipient role',body+history)
}

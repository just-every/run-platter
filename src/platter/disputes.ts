import type { Bindings } from '../auth.server'
import { providerCredential, providerJson } from './connections'
import { commit, exact, need, text, type Actor } from './model'
import { PdfText } from './documents/pdf-text'
import { pdfFonts } from './documents/pdf-fonts'
const finance=['owner','admin','billing'],responseStatuses=['needs_response','warning_needs_response']
const bytes64=(bytes:Uint8Array)=>{let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value)}
const decode64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))
export async function disputeState(env:Bindings,a:Actor){
 if(!finance.includes(a.role))return []
 const submissions=(await env.DB.prepare('SELECT * FROM p_dispute_submissions ORDER BY submitted_at,id').all<any>()).results
 return (await env.DB.prepare('SELECT * FROM p_disputes ORDER BY deadline,id').all<any>()).results.map(d=>({...d,submissions:submissions.filter(s=>s.dispute_id===d.id)}))
}
async function paymentFor(env:Bindings,id:string){const p=await env.DB.prepare("SELECT * FROM p_payment_records WHERE id=? AND method='stripe'").bind(id).first<any>();need(p,'Choose a linked Stripe deposit',404);return p}
async function remoteDispute(env:Bindings,payment:any,id:string){
 const credentials=await providerCredential(env,'workspace:stripe');need(credentials.secret.accountId===payment.reference,'Reconnect the Stripe account holding this deposit',409)
 const value=await providerJson('https://api.stripe.com/v1/disputes/'+encodeURIComponent(id),credentials.secret.token)
 need(value.id===id&&value.charge===payment.provider_charge&&value.currency?.toUpperCase()===payment.currency&&Number.isSafeInteger(value.amount)&&value.amount>0&&value.amount<=payment.cents,'Stripe dispute does not match this deposit',409)
 const deadline=Number(value.evidence_details?.due_by)*1000
 need(Number.isSafeInteger(deadline)&&deadline>0,'Stripe did not provide an evidence deadline',409)
 need(['needs_response','warning_needs_response','under_review','warning_under_review','won','lost','warning_closed'].includes(value.status),'Stripe returned an unsupported dispute state',409)
 return {credentials,value,deadline}
}
async function evidenceBytes(env:Bindings,payment:any,note:string){
 const accepted=await env.DB.prepare('SELECT * FROM p_acceptances WHERE proposal_id=? AND revision=?').bind(payment.proposal_id,payment.revision).first<any>();need(accepted,'The exact accepted agreement is unavailable',409)
 const pdf=await PdfText.create(accepted.revision,await pdfFonts(env),'Acceptance record · revision '+accepted.revision)
 pdf.document.setTitle('Dispute acceptance evidence');pdf.text('Platter acceptance record',20);pdf.text('This record reports the stored typed acceptance. It is not a signature certificate. Certificate, view analytics and checkout authorization artifacts are unavailable in this release.')
 pdf.heading('Response note');pdf.text(note)
 pdf.heading('Acceptance');pdf.text('Signer: '+accepted.name);pdf.text('Verified mailbox: '+accepted.email);pdf.text('Verification: invitation mailbox code');pdf.text('Accepted at: '+new Date(accepted.accepted_at).toISOString());pdf.text('Consent: '+accepted.consent);pdf.text('Accepted revision: '+accepted.revision)
 pdf.heading('Verified deposit');pdf.text('Stripe charge: '+payment.provider_charge);pdf.text('Amount: '+payment.currency+' '+(payment.cents/100).toFixed(2))
 pdf.heading('Exact accepted agreement snapshot');pdf.text(accepted.snapshot)
 const bytes=new Uint8Array(await pdf.document.save());need(bytes.byteLength<=5000000,'The evidence PDF exceeds Stripe’s 5 MB bound',413)
 const digest=await crypto.subtle.digest('SHA-256',bytes),hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')
 return {bytes,hash,accepted}
}
export async function disputePdf(env:Bindings,a:Actor,disputeId:string,submissionId?:string|null){
 need(finance.includes(a.role),'Only owner, admins and billing read dispute evidence',403)
 const dispute=await env.DB.prepare('SELECT * FROM p_disputes WHERE id=?').bind(disputeId).first<any>();need(dispute,'Dispute not found',404)
 let bytes:Uint8Array
 if(submissionId){const submission=await env.DB.prepare('SELECT * FROM p_dispute_submissions WHERE id=? AND dispute_id=?').bind(submissionId,disputeId).first<any>();need(submission,'Submission not found',404);const parts=(await env.DB.prepare('SELECT base64 FROM p_dispute_documents WHERE submission_id=? ORDER BY part').bind(submissionId).all<any>()).results.map(p=>decode64(p.base64));bytes=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}}
 else bytes=(await evidenceBytes(env,await paymentFor(env,dispute.payment_id),'Preview of available evidence. A response note is added when submitting.')).bytes
 return new Response(bytes.buffer as ArrayBuffer,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="dispute-acceptance-evidence.pdf"','cache-control':'no-store','x-content-type-options':'nosniff'}})
}
export async function disputeCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(finance.includes(a.role),'Only owner, admins and billing manage dispute responses',403)
 const db=env.DB
 if(name==='dispute.import'){
  const payment=await paymentFor(env,text(p.paymentId,'a payment')),id=text(p.disputeId,'a Stripe dispute id',200),old=await db.prepare('SELECT * FROM p_disputes WHERE id=?').bind(id).first<any>();if(old){need(old.payment_id===payment.id,'Dispute already belongs to another payment',409);exact(old,p)}
  const remote=await remoteDispute(env,payment,id)
  await commit(db,a,[old?db.prepare('UPDATE p_disputes SET cents=?,status=?,deadline=?,version=version+1,imported_by=?,imported_at=? WHERE id=?').bind(remote.value.amount,remote.value.status,remote.deadline,a.id,Date.now(),id):db.prepare('INSERT INTO p_disputes(id,payment_id,cents,status,deadline,imported_by,imported_at) VALUES(?,?,?,?,?,?,?)').bind(id,payment.id,remote.value.amount,remote.value.status,remote.deadline,a.id,Date.now())],false,old?{sql:'EXISTS(SELECT 1 FROM p_disputes WHERE id=? AND version=?)',values:[id,old.version]}:undefined)
  return{id,proposalId:payment.proposal_id,status:remote.value.status}
 }
 need(name==='dispute.submit','Unknown dispute action',404)
 need(p.consent===true||p.consent==='yes','Explicitly authorize sending the available acceptance evidence to Stripe')
 const id=text(p.disputeId,'a dispute'),note=text(p.note,'a response note',2000),requestId=text(p.requestId,'a submission request id',100);need(/^[A-Za-z0-9_-]+$/.test(requestId),'Use an opaque submission request id')
 const previous=await db.prepare('SELECT * FROM p_dispute_submissions WHERE id=?').bind(requestId).first<any>();if(previous){need(previous.dispute_id===id&&previous.note===note,'This request id names another submission',409);return{id:requestId,status:previous.status}}
 const dispute=await db.prepare('SELECT * FROM p_disputes WHERE id=?').bind(id).first<any>();need(dispute,'Dispute not found',404);exact(dispute,p)
 const payment=await paymentFor(env,dispute.payment_id),remote=await remoteDispute(env,payment,id);need(remote.value.amount===dispute.cents,'The disputed amount changed. Refresh and review it first.',409);need(responseStatuses.includes(dispute.status)&&responseStatuses.includes(remote.value.status)&&remote.deadline>Date.now(),'The evidence deadline passed or Stripe no longer accepts a response',409)
 const evidence=await evidenceBytes(env,payment,note),chunks=[];for(let offset=0;offset<evidence.bytes.length;offset+=300000)chunks.push(bytes64(evidence.bytes.subarray(offset,offset+300000)))
 await commit(db,a,[db.prepare("INSERT INTO p_dispute_submissions(id,dispute_id,note,document_hash,status,submitted_by,submitted_at) VALUES(?,?,?,?,'reserved',?,?)").bind(requestId,id,note,evidence.hash,a.id,Date.now()),...chunks.map((chunk,part)=>db.prepare('INSERT INTO p_dispute_documents(submission_id,part,base64) VALUES(?,?,?)').bind(requestId,part,chunk)),db.prepare("UPDATE p_disputes SET status='submitting',deadline=?,version=version+1 WHERE id=?").bind(remote.deadline,id)],false,{sql:"EXISTS(SELECT 1 FROM p_disputes WHERE id=? AND version=? AND status IN ('needs_response','warning_needs_response')) AND EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:stripe' AND version=? AND status='connected') AND ?>CAST(strftime('%s','now') AS INTEGER)*1000",values:[id,dispute.version,remote.credentials.connection.version,remote.deadline]})
 let status='needs_review'
 try{
  const token=remote.credentials.secret.token,upload=new FormData();upload.set('purpose','dispute_evidence');upload.set('file',new File([evidence.bytes],'acceptance-evidence.pdf',{type:'application/pdf'}))
  const receipt=await fetch('https://files.stripe.com/v1/files',{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+token,'idempotency-key':'platter-dispute-file-'+requestId},body:upload})
  if(receipt.ok){const file:any=await receipt.json();need(remote.deadline>Date.now(),'Evidence deadline passed during upload',409);if(typeof file.id==='string'&&file.id.length<=200){const response=await fetch('https://api.stripe.com/v1/disputes/'+encodeURIComponent(id),{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+token,'content-type':'application/x-www-form-urlencoded','idempotency-key':'platter-dispute-submit-'+requestId},body:new URLSearchParams({'evidence[customer_name]':evidence.accepted.name,'evidence[customer_email_address]':evidence.accepted.email,'evidence[service_documentation]':file.id,'evidence[uncategorized_text]':note,submit:'true'})});if(response.ok){const result:any=await response.json();if(result.id===id&&['under_review','warning_under_review','won'].includes(result.status))status='submitted'}}}
 }catch{/* Preserve exact evidence and the reservation for explicit provider reconciliation. */}
 await db.batch([db.prepare('UPDATE p_dispute_submissions SET status=? WHERE id=?').bind(status,requestId),db.prepare('UPDATE p_disputes SET status=?,version=version+1 WHERE id=?').bind(status,id)])
 return{id:requestId,proposalId:payment.proposal_id,status,message:status==='submitted'?'Stripe confirmed the evidence submission.':'Submission held for provider reconciliation. Review Stripe before creating another request.'}
}

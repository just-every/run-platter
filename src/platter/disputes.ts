import type { Bindings } from '../auth.server'
import { providerCredential, providerJson } from './connections'
import { commit, exact, need, text, type Actor } from './model'
import { paperRow } from './paper-record'
import { copyAttachments } from './attachments'
import { PdfText } from './documents/pdf-text'
import { pdfFonts } from './documents/pdf-fonts'
const finance=['owner','admin','billing'],responseStatuses=['needs_response','warning_needs_response']
const bytes64=(bytes:Uint8Array)=>{let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value)}
const decode64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0))
const fingerprint=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.buffer as ArrayBuffer)),v=>v.toString(16).padStart(2,'0')).join('')
const chunks=(bytes:Uint8Array)=>{const result=[];for(let offset=0;offset<bytes.length;offset+=48000)result.push(bytes64(bytes.subarray(offset,offset+48000)));return result}
async function retainedBytes(db:D1Database,table:'p_dispute_documents'|'p_dispute_packet_parts',column:'submission_id'|'packet_id',id:string){
 const parts=(await db.prepare('SELECT base64 FROM '+table+' WHERE '+column+'=? ORDER BY part').bind(id).all<any>()).results.map(p=>decode64(p.base64))
 need(parts.length,'Retained evidence is unavailable',409)
 const bytes=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}return bytes
}
export async function disputeState(env:Bindings,a:Actor){
 if(!finance.includes(a.role))return []
 const submissions=(await env.DB.prepare('SELECT * FROM p_dispute_submissions ORDER BY submitted_at,id').all<any>()).results
 const packets=(await env.DB.prepare('SELECT p.*,a.authorized_by,a.authorized_at FROM p_dispute_packets p LEFT JOIN p_dispute_authorizations a ON a.packet_id=p.id ORDER BY p.prepared_at,p.id').all<any>()).results
 return (await env.DB.prepare('SELECT * FROM p_disputes ORDER BY deadline,id').all<any>()).results.map(d=>({...d,submissions:submissions.filter(s=>s.dispute_id===d.id),packets:packets.filter(p=>p.dispute_id===d.id)}))
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
async function evidenceBytes(env:Bindings,payment:any,dispute:any,note:string){
 const accepted=await env.DB.prepare('SELECT * FROM p_acceptances WHERE proposal_id=? AND revision=?').bind(payment.proposal_id,payment.revision).first<any>();need(accepted,'The exact accepted agreement is unavailable',409)
 const paper=await paperRow(env.DB,payment.proposal_id)
 const pdf=await PdfText.create(accepted.revision,await pdfFonts(env),'Acceptance record · revision '+accepted.revision)
 pdf.document.setTitle('Dispute acceptance evidence');pdf.text('Platter acceptance record',20)
 pdf.text('This packet reports retained acceptance facts. It is not a signature certificate.')
 pdf.heading('Not included')
 pdf.text('SIGN-005 signature certificate; TRACK-001 view analytics; PAY-001 and PAY-002 payment authorization artifacts are unavailable.')
 pdf.text('Attachment contents are not included. Retained files omitted from this packet:')
 const files=copyAttachments(JSON.parse(accepted.snapshot).attachments)
 if(paper)files.push({id:paper.file_id,filename:paper.filename,mediaType:paper.media_type,size:paper.size,sha256:paper.sha256})
 for(const file of files)pdf.text(file.filename+' · '+file.size+' bytes · SHA-256 '+file.sha256)
 if(!files.length)pdf.text('No retained attachment files for this acceptance.')
 pdf.heading('Dispute');pdf.text('Stripe dispute: '+dispute.id);pdf.text('Disputed amount: '+payment.currency+' '+(dispute.cents/100).toFixed(2));pdf.text('Provider deadline: '+new Date(dispute.deadline).toISOString())
 pdf.heading('Response note');pdf.text(note)
 pdf.heading('Acceptance');pdf.text('Signer as recorded: '+accepted.name)
 if(paper){
  pdf.text('Acceptance method: owner-attested upload. Platter did not verify the signature.')
  pdf.text('Recorded client email: '+accepted.email);pdf.text('Signed date as attested: '+paper.signed_on);pdf.text('Attested by: '+paper.attested_by);pdf.text('Attested at: '+new Date(paper.attested_at).toISOString())
 }else{
  pdf.text('Acceptance method: invitation mailbox code verified (SIGN-001 and SIGN-002).');pdf.text('Verified mailbox: '+accepted.email)
 }
 pdf.text('Accepted at: '+new Date(accepted.accepted_at).toISOString());pdf.text('Consent: '+accepted.consent);pdf.text('Accepted revision: '+accepted.revision)
 pdf.heading('Verified deposit');pdf.text('Stripe charge: '+payment.provider_charge);pdf.text('Amount: '+payment.currency+' '+(payment.cents/100).toFixed(2))
 pdf.heading('Exact accepted agreement snapshot');pdf.text(accepted.snapshot)
 const bytes=new Uint8Array(await pdf.document.save())
 need(bytes.byteLength<=4500000&&pdf.document.getPageCount()<=19,'The evidence packet exceeds the supported 4.5 MB or 19-page limit',413)
 return {bytes,hash:await fingerprint(bytes)}
}
export async function disputePdf(env:Bindings,a:Actor,disputeId:string,submissionId?:string|null,packetId?:string|null){
 need(finance.includes(a.role),'Only owner, admins and billing read dispute evidence',403)
 need(submissionId||packetId,'Prepare a packet with your response note before previewing it',409)
 const record=submissionId?await env.DB.prepare('SELECT * FROM p_dispute_submissions WHERE id=? AND dispute_id=?').bind(submissionId,disputeId).first<any>():await env.DB.prepare('SELECT * FROM p_dispute_packets WHERE id=? AND dispute_id=?').bind(packetId!,disputeId).first<any>()
 need(record,'Retained packet not found',404)
 const bytes=await retainedBytes(env.DB,submissionId?'p_dispute_documents':'p_dispute_packet_parts',submissionId?'submission_id':'packet_id',record.id)
 need(await fingerprint(bytes)===record.document_hash,'Retained packet hash does not match',409)
 return new Response(bytes.buffer as ArrayBuffer,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="dispute-acceptance-evidence.pdf"','cache-control':'no-store','x-content-type-options':'nosniff','x-platter-packet-sha256':record.document_hash}})
}
function currentPacket(dispute:any,packet:any){
 need(packet.dispute_version===dispute.version&&packet.cents===dispute.cents&&packet.deadline===dispute.deadline,'The dispute changed. Prepare and authorize a new packet.',409)
 need(responseStatuses.includes(dispute.status)&&dispute.deadline>Date.now(),'The evidence deadline passed or Stripe no longer accepts a response',409)
}
export async function disputeCommand(env:Bindings,a:Actor,name:string,p:Record<string,unknown>){
 need(finance.includes(a.role),'Only owner, admins and billing manage dispute responses',403)
 const db=env.DB
 if(name==='dispute.import'){
  const payment=await paymentFor(env,text(p.paymentId,'a payment')),id=text(p.disputeId,'a Stripe dispute id',200),old=await db.prepare('SELECT * FROM p_disputes WHERE id=?').bind(id).first<any>();if(old){need(old.payment_id===payment.id,'Dispute already belongs to another payment',409);exact(old,p)}
  const remote=await remoteDispute(env,payment,id)
  const writes=[old?db.prepare('UPDATE p_disputes SET cents=?,status=?,deadline=?,version=version+1,imported_by=?,imported_at=? WHERE id=?').bind(remote.value.amount,remote.value.status,remote.deadline,a.id,Date.now(),id):db.prepare('INSERT INTO p_disputes(id,payment_id,cents,status,deadline,imported_by,imported_at) VALUES(?,?,?,?,?,?,?)').bind(id,payment.id,remote.value.amount,remote.value.status,remote.deadline,a.id,Date.now())]
  if(['under_review','warning_under_review'].includes(remote.value.status))writes.push(db.prepare("UPDATE p_dispute_submissions SET status='submitted' WHERE dispute_id=? AND status='needs_review'").bind(id))
  await commit(db,a,writes,false,old?{sql:'EXISTS(SELECT 1 FROM p_disputes WHERE id=? AND version=?)',values:[id,old.version]}:undefined)
  return{id,proposalId:payment.proposal_id,status:remote.value.status}
 }
 need(['dispute.prepare','dispute.authorize','dispute.submit'].includes(name),'Unknown dispute action',404)
 const id=text(p.disputeId,'a dispute'),dispute=await db.prepare('SELECT * FROM p_disputes WHERE id=?').bind(id).first<any>();need(dispute,'Dispute not found',404)
 if(name==='dispute.prepare'){
  exact(dispute,p);need(responseStatuses.includes(dispute.status)&&dispute.deadline>Date.now(),'The evidence deadline passed or Stripe no longer accepts a response',409)
  const note=text(p.note,'a response note',2000),payment=await paymentFor(env,dispute.payment_id),evidence=await evidenceBytes(env,payment,dispute,note),packetId=crypto.randomUUID()
  await commit(db,a,[db.prepare('INSERT INTO p_dispute_packets(id,dispute_id,dispute_version,cents,currency,deadline,note,document_hash,prepared_by,prepared_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(packetId,id,dispute.version,dispute.cents,payment.currency,dispute.deadline,note,evidence.hash,a.id,Date.now()),...chunks(evidence.bytes).map((chunk,part)=>db.prepare('INSERT INTO p_dispute_packet_parts(packet_id,part,base64) VALUES(?,?,?)').bind(packetId,part,chunk))],false,{sql:'EXISTS(SELECT 1 FROM p_disputes WHERE id=? AND version=?) AND NOT EXISTS(SELECT 1 FROM p_dispute_submissions WHERE dispute_id=?)',values:[id,dispute.version,id]})
  return{id:packetId,proposalId:payment.proposal_id,documentHash:evidence.hash}
 }
 const packetId=text(p.packetId,'the prepared packet'),hash=text(p.documentHash,'the packet SHA-256',64),packet=await db.prepare('SELECT * FROM p_dispute_packets WHERE id=? AND dispute_id=?').bind(packetId,id).first<any>();need(packet&&packet.document_hash===hash,'Authorize the exact prepared packet hash',409)
 if(p.note!==undefined)need(p.note===packet.note,'The response note differs from the prepared packet',409)
 if(name==='dispute.authorize'){
  need(p.consent===true||p.consent==='yes','Explicitly authorize this exact packet for Stripe')
  currentPacket(dispute,packet)
  const subject=JSON.stringify({packetId,disputeId:id,cents:packet.cents,currency:packet.currency,deadline:packet.deadline,sha256:hash})
  await commit(db,a,[db.prepare('INSERT INTO p_dispute_authorizations(packet_id,document_hash,dispute_id,cents,currency,deadline,authorized_by,authorized_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(packet_id) DO NOTHING').bind(packetId,hash,id,packet.cents,packet.currency,packet.deadline,a.id,Date.now()),db.prepare("INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,'dispute.authorize',?,?)").bind(crypto.randomUUID(),a.id,a.role,subject,Date.now())],false,{sql:'EXISTS(SELECT 1 FROM p_disputes WHERE id=? AND version=? AND cents=? AND deadline=?) AND ?>CAST(strftime(\'%s\',\'now\') AS INTEGER)*1000 AND NOT EXISTS(SELECT 1 FROM p_dispute_submissions WHERE dispute_id=?)',values:[id,packet.dispute_version,packet.cents,packet.deadline,packet.deadline,id]})
  return{id:packetId,status:'authorized'}
 }
 const requestId=text(p.requestId,'a submission request id',100);need(/^[A-Za-z0-9_-]+$/.test(requestId),'Use an opaque submission request id')
 const previous=await db.prepare('SELECT * FROM p_dispute_submissions WHERE id=? OR packet_id=?').bind(requestId,packetId).first<any>()
 if(previous){need(previous.dispute_id===id&&previous.packet_id===packetId&&previous.document_hash===hash,'This request id names another submission',409);return{id:previous.id,status:previous.status}}
 currentPacket(dispute,packet)
 const authorization=await db.prepare('SELECT * FROM p_dispute_authorizations WHERE packet_id=? AND document_hash=? AND dispute_id=? AND cents=? AND currency=? AND deadline=?').bind(packetId,hash,id,packet.cents,packet.currency,packet.deadline).first()
 need(authorization,'Explicit packet authorization is required',409)
 const bytes=await retainedBytes(db,'p_dispute_packet_parts','packet_id',packetId);need(await fingerprint(bytes)===hash,'Retained packet hash does not match',409)
 const payment=await paymentFor(env,dispute.payment_id)
 // Reserve before even reading Stripe. A timeout or refresh can never reopen this attempt.
 await commit(db,a,[db.prepare("INSERT INTO p_dispute_submissions(id,dispute_id,note,document_hash,status,submitted_by,submitted_at,packet_id) VALUES(?,?,?,?,'reserved',?,?,?)").bind(requestId,id,packet.note,hash,a.id,Date.now(),packetId),...chunks(bytes).map((chunk,part)=>db.prepare('INSERT INTO p_dispute_documents(submission_id,part,base64) VALUES(?,?,?)').bind(requestId,part,chunk)),db.prepare("UPDATE p_disputes SET status='submitting',version=version+1 WHERE id=?").bind(id)],false,{sql:"EXISTS(SELECT 1 FROM p_disputes WHERE id=? AND version=? AND cents=? AND deadline=? AND status IN ('needs_response','warning_needs_response')) AND NOT EXISTS(SELECT 1 FROM p_dispute_submissions WHERE dispute_id=?) AND ?>CAST(strftime('%s','now') AS INTEGER)*1000",values:[id,packet.dispute_version,packet.cents,packet.deadline,id,packet.deadline]})
 let status='needs_review',providerStatus='needs_review'
 try{
  const remote=await remoteDispute(env,payment,id)
  need(remote.value.amount===packet.cents&&remote.deadline===packet.deadline,'The disputed amount or deadline changed. Reconcile with Stripe.',409)
  need(responseStatuses.includes(remote.value.status)&&remote.deadline>Date.now(),'Stripe no longer accepts this response',409)
  const token=remote.credentials.secret.token,upload=new FormData();upload.set('purpose','dispute_evidence');upload.set('file',new File([bytes],'acceptance-evidence.pdf',{type:'application/pdf'}))
  const receipt=await fetch('https://files.stripe.com/v1/files',{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+token,'idempotency-key':'platter-dispute-file-'+requestId},body:upload})
  if(receipt.ok){const file:any=await receipt.json();need(packet.deadline>Date.now(),'Evidence deadline passed during upload',409);if(typeof file.id==='string'&&file.id.length<=200){
   const response=await fetch('https://api.stripe.com/v1/disputes/'+encodeURIComponent(id),{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+token,'content-type':'application/x-www-form-urlencoded','idempotency-key':'platter-dispute-submit-'+requestId},body:new URLSearchParams({'evidence[service_documentation]':file.id,submit:'true'})})
   if(response.ok){const result:any=await response.json();if(result.id===id){if(['under_review','warning_under_review'].includes(result.status)){status='submitted';providerStatus=result.status}else if(['won','lost'].includes(result.status))providerStatus=result.status}}
  }}
 }catch{/* Exact bytes and the claim remain held for explicit provider reconciliation. */}
 await db.batch([db.prepare('UPDATE p_dispute_submissions SET status=? WHERE id=?').bind(status,requestId),db.prepare('UPDATE p_disputes SET status=?,version=version+1 WHERE id=?').bind(providerStatus,id)])
 return{id:requestId,proposalId:payment.proposal_id,status,message:status==='submitted'?'Stripe confirmed the evidence submission.':'Submission held for provider reconciliation. Refresh the dispute from Stripe; this attempt will not be sent again.'}
}

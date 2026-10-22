import type { Bindings } from '../auth.server'
// @ts-expect-error The pinned Base mail entry point exports runtime JS without declarations.
import { normalizeInbound, verifyWebhook } from '@runeditrun/rer/internal/modules/mail/index.mjs'
import { hash, need } from './model'
import { recordAnswer } from './questions'
import { replyDomain, resendReplyAvailable } from './question-reply-mail'

const MAX_BYTES=1024*1024

/** Bound bytes while reading, including chunked bodies without Content-Length. */
async function boundedBytes(message:Request|Response):Promise<Uint8Array> {
 const declared=message.headers.get('content-length')
 if(declared!==null&&/^\d+$/.test(declared))need(Number(declared)<=MAX_BYTES,'Message is too large',413)
 need(message.body,'A message body is required')
 const reader=message.body.getReader(),chunks:Uint8Array[]=[]
 let size=0
 try {
  while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;need(size<=MAX_BYTES,'Message is too large',413);chunks.push(next.value)}
 }catch(error){try{await reader.cancel()}catch{};throw error}
 finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return bytes
}

function json(bytes:Uint8Array):any {
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}
 catch{need(false,'Invalid message',400)}
}

export async function authenticatedReply(request:Request,env:Bindings){
 need(request.method==='POST','Use POST',405)
  need(resendReplyAvailable(env),'Email replies are unavailable',503)
  const raw=await boundedBytes(request)
  need(await verifyWebhook({provider:'resend',rawBody:raw,headers:request.headers,key:env.MAIL_WEBHOOK_KEY,now:Date.now()}),'Invalid webhook signature',401)
  const event=json(raw)
  need(event?.type==='email.received','Unsupported mail event',400)
  const signedEmailId=event?.data?.email_id
  need(typeof signedEmailId==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(signedEmailId),'Invalid received message identity',400)
  let email:any
  try {
   const response=await fetch('https://api.resend.com/emails/receiving/'+encodeURIComponent(signedEmailId),{
    method:'GET',headers:{Authorization:'Bearer '+env.MAIL_API_KEY,Accept:'application/json'},
    redirect:'manual',signal:AbortSignal.timeout(10000),
   })
   need(response.ok,'Received message could not be fetched',502)
   email=json(await boundedBytes(response))
  }catch{need(false,'Received message could not be fetched',502)}
  let message:any
  try {
   // No attachment fetcher is supplied: any attachments are refused by the pinned parser.
   message=await normalizeInbound({provider:'resend',signedEmailId,email},{maxRawBytes:MAX_BYTES,maxBodyBytes:MAX_BYTES,maxAttachments:1,maxAttachmentBytes:1,maxTotalAttachmentBytes:1})
  }catch{need(false,'A valid plain-text message without attachments is required',422)}
  need(typeof message.text==='string'&&message.text.trim().length>0&&message.text.length<=10000,'A plain-text answer up to 10000 characters is required',422)
  const domain=replyDomain(env)!
  const addresses=[...new Set<string>(message.to.map((address:string)=>address.toLowerCase()))]
  const targets=addresses.filter(address=>address.endsWith('@'+domain)&&/^[a-f0-9]{64}@/.test(address))
  need(targets.length===1,'Exactly one reply capability is required',409)
  const token=targets[0].slice(0,64)
  // Keep the original plain-text reply, including quotations, only when it contains no capability.
  need(!message.text.toLowerCase().includes(token)&&!/[a-f0-9]{64}@/i.test(message.text),'Remove the private reply address from the message body',422)
  return {message,token,email}
}

/** The dispatcher mounts this POST before the browser Origin gate. No session authority is inferred here. */
export async function questionReplyResponse(request:Request,env:Bindings):Promise<Response> {
 try {
  const {message,token,email}=await authenticatedReply(request,env)
  const keyhash=await hash(token),now=Date.now()
  const key=await env.DB.prepare('SELECT k.*,q.proposal_id FROM p_question_reply_keys k JOIN p_questions q ON q.id=k.question_id WHERE k.keyhash=?').bind(keyhash).first<{id:string;question_id:string;proposal_id:string;owner_id:string;owner_version:number;expires_at:number;used_at:number|null}>()
  need(key&&key.used_at===null&&key.expires_at>now,'This reply capability is expired, rotated, or already used',409)
  const owner=await env.DB.prepare("SELECT id,email,version FROM oa_operators WHERE id=? AND version=? AND role='owner' AND status='active'").bind(key.owner_id,key.owner_version).first<{id:string;email:string;version:number}>()
  need(owner&&owner.email.toLowerCase()===message.from.toLowerCase(),'Reply sender must be the current active owner',403)
  const guard={
   sql:"EXISTS(SELECT 1 FROM p_question_reply_keys k JOIN oa_operators o ON o.id=k.owner_id WHERE k.id=? AND k.keyhash=? AND k.question_id=? AND k.owner_id=? AND k.owner_version=? AND k.used_at IS NULL AND k.expires_at>? AND k.expires_at>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) AND o.version=k.owner_version AND o.email=? AND o.role='owner' AND o.status='active')",
   values:[key.id,keyhash,key.question_id,owner.id,owner.version,now,owner.email],
  }
  await recordAnswer(env,{id:owner.id,email:owner.email,role:'owner'},{id:key.proposal_id,questionId:key.question_id,text:message.text,source:'email',sourceId:'resend:'+email.id},{guard,writes:[env.DB.prepare('UPDATE p_question_reply_keys SET used_at=? WHERE id=? AND used_at IS NULL').bind(now,key.id)]})
  return Response.json({message:'Answer saved and client notification queued.'},{status:201,headers:{'Cache-Control':'no-store'}})
 }catch(error){
  const status=Number((error as {status?:number})?.status)
  // Provider payloads and parser diagnostics never enter responses or logs.
  const code=Number.isInteger(status)&&status>=400&&status<=599?status:500
  return Response.json({error:code===500?'Reply could not be processed':'Reply refused'},{status:code,headers:{'Cache-Control':'no-store',...(code===405?{Allow:'POST'}:{})}})
 }
}

import type { Bindings } from '../auth.server'
import { hash } from './model'
import { queueMail } from './mail'
import { sealReplyAddress } from './mail-reply-address'

type Owner={id:string;email:string;version:number}
type Question={id:string;proposal_id:string;revision:number;section:string;text:string;title:string}
const TTL=7*24*60*60*1000

/** DNS hostname only: no URL, port, local name, IP literal, Unicode, or empty label. */
export function replyDomain(env:Bindings):string|null {
 const domain=env.QUESTION_REPLY_DOMAIN
 if(typeof domain!=='string'||domain.length>253||domain!==domain.trim())return null
 const value=domain.toLowerCase(),labels=value.split('.')
 if(labels.length<2||!labels.every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))||!/^[a-z]{2,63}$/.test(labels.at(-1)!))return null
 if(['localhost','local','internal','invalid','test','example','onion'].includes(labels.at(-1)!))return null
 return value
}

export function resendReplyAvailable(env:Bindings):boolean {
 return env.AUTH_LOCAL!=='true'&&env.RER_DEMO!=='1'&&env.MAIL_PROVIDER==='resend'&&!!env.MAIL_API_KEY?.trim()&&!!env.MAIL_WEBHOOK_KEY?.trim()&&replyDomain(env)!==null
}

/** Commit these statements with the question creation/re-notice and its authorization guard. */
export async function prepareReplyNotice(env:Bindings,owner:Owner,question:Question):Promise<D1PreparedStatement[]> {
 const db=env.DB,writes:D1PreparedStatement[]=[],at=Date.now()
 let replyTo:string|null=null
 // This guard binds issuance AND delivery to the current owner and immutable thread.
 writes.push(db.prepare("INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND email=? AND version=? AND role='owner' AND status='active') AND EXISTS(SELECT 1 FROM p_questions WHERE id=? AND proposal_id=? AND revision=?))").bind(owner.id,owner.email,owner.version,question.id,question.proposal_id,question.revision))
 writes.push(db.prepare('DELETE FROM p_question_reply_keys WHERE question_id=? AND owner_id=? AND used_at IS NULL').bind(question.id,owner.id))
 if(resendReplyAvailable(env)){
  // 64 hexadecimal characters are the complete local part (the RFC limit is 64).
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('')
  replyTo=token+'@'+replyDomain(env)!
  writes.push(
   db.prepare('INSERT INTO p_question_reply_keys(id,keyhash,question_id,owner_id,owner_version,expires_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),await hash(token),question.id,owner.id,owner.version,at+TTL),
  )
 }
 const instructions=replyTo
  ? 'Reply with a plain-text answer from this owner mailbox within 7 days. This private reply address can be used once. The full reply, including quoted text, is saved as your answer; remove quoted text and the private reply address before sending. You can also answer in Platter.'
  : 'Email replies are unavailable. Answer in Platter using the link below.'
 const body=`A verified client asked about ${question.section} on revision ${question.revision}.\n\n${question.text}\n\n${instructions}\n\nAnswer in Platter:\n${env.AUTH_ORIGIN}/app/proposal?id=${encodeURIComponent(question.proposal_id)}#question-${encodeURIComponent(question.id)}`
 writes.push(queueMail(env,question.proposal_id,owner.email,'Client question: '+question.title,body,null,replyTo?await sealReplyAddress(env,replyTo):null))
 return writes
}

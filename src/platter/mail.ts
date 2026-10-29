import { completionAttachments, queueReadyCompletionMail } from './completion-mail'
import { clientText, type ClientLocale } from './locales'
import { prepareClientReply } from './client-mail-replies'
import { sendingActor, memberMailbox, sendMailbox, recordSender } from './mailboxes'
import type { Bindings } from '../auth.server'
import { operatorMail } from '../mail.server.mjs'
import { openReplyAddress, type SealedReplyAddress } from './mail-reply-address'
import { demoEffect } from '@runeditrun/rer/internal/modules/demo/index.mjs'
// Local development captures mail for the outbox; a demo sends it through the demo guard instead.
export const capturesMail=(env:Bindings)=>env.AUTH_LOCAL==='true'&&env.RER_DEMO!=='1'
export const proposalMail=(title:string,shareUrl:string,locale:ClientLocale='en'):[string,string]=>[clientText('Your proposal: ',locale)+title,clientText('Review your proposal and verify your email before accepting:',locale)+'\n'+shareUrl]
export function queueMail(env:Bindings,proposalId:string,to:string,subject:string,body:string,senderId:string|null=null,replyTo:SealedReplyAddress|null=null,mailId=crypto.randomUUID(),requiresApproval=false,replyConsent=false){return env.DB.prepare('INSERT INTO p_mail(id,proposal_id,recipient,subject,body,status,created_at,sender_id,provider,reply_to,requires_approval,reply_consent,proposal_revision) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,(SELECT revision FROM p_proposals WHERE id=?))').bind(mailId,proposalId,to,subject,body,capturesMail(env)?'local':'pending',Date.now(),senderId,env.MAIL_PROVIDER??null,replyTo,requiresApproval?1:0,replyConsent?1:0,proposalId)}
// Claim before contacting the provider; an uncertain attempt is never resent blindly.
export async function dispatchMail(env:Bindings,proposalId:string,mailId?:string){if(capturesMail(env)){
 // Captured messages retain the same artifact references without external provider contact.
 if(env.ASSETS){const rows=(await env.DB.prepare("SELECT m.* FROM p_mail m JOIN p_completion_mail c ON c.mail_id=m.id WHERE m.proposal_id=? AND m.status='local'").bind(proposalId).all<any>()).results;for(const row of rows)await completionAttachments(env,row)}
 return
 }
 const sender=operatorMail(env)
 const rows=(await env.DB.prepare("SELECT * FROM p_mail WHERE proposal_id=? AND status='pending' AND (? IS NULL OR id=?)").bind(proposalId,mailId??null,mailId??null).all<any>()).results
 for(const row of rows){
  if(!sender&&(!row.sender_id||!await env.DB.prepare("SELECT id FROM p_connections WHERE operator_id=? AND provider IN ('gmail','microsoft') AND status='connected' AND broken_at IS NULL").bind(row.sender_id).first()))continue
  const claimed=await env.DB.prepare("UPDATE p_mail SET status='sending' WHERE id=? AND status='pending'").bind(row.id).run();if(!claimed.meta.changes)continue
  let route='installation',address=env.MAIL_FROM??'',fallback=false
  try{
   let actor=await sendingActor(env,row)
   const attachments=await completionAttachments(env,row)
   const mailbox=actor?await memberMailbox(env,actor):null
   actor=await sendingActor(env,row)
   const sealedReply=actor?await prepareClientReply(env,actor,row):row.reply_to
   const replyTo=sealedReply?await openReplyAddress(env,sealedReply):undefined
   let result:{status:string;providerMessageId:string|null}|undefined
   if(mailbox&&!mailbox.broken&&actor){
    route=mailbox.connection.provider;address=mailbox.connection.mailbox_email
    const outcome=await demoEffect(()=>sendMailbox(env,actor,row,mailbox,replyTo,attachments),()=>({fallback:false as const,status:'accepted' as const,providerMessageId:null}))
    if(!outcome.fallback)result=outcome
    else fallback=true
   }else fallback=Boolean(mailbox)
   if(!result){
    route='installation';address=env.MAIL_FROM??''
    await sendingActor(env,row)
    if(!sender){await env.DB.prepare("UPDATE p_mail SET status='pending' WHERE id=?").bind(row.id).run();continue}
    result=await demoEffect(()=>sender.send({from:env.MAIL_FROM!,to:[row.recipient],deliveryId:row.id,subject:row.subject,text:row.body,html:row.body.replace(/[&<>]/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)),headers:{},...(attachments?{attachments}:{}),...(replyTo?{replyTo}:{})}),()=>({provider:'demo',status:'accepted' as const,providerMessageId:null}))
   }
   const status=result?.status==='accepted'?'accepted':'uncertain'
   await env.DB.batch([env.DB.prepare("UPDATE p_mail SET status=?,provider=?,provider_message_id=? WHERE id=?").bind(status,route==='installation'?env.MAIL_PROVIDER??null:route,result?.providerMessageId??null,row.id),env.DB.prepare("UPDATE p_bounce_notices SET closed_at=? WHERE closed_at IS NULL AND id IN (SELECT notice_id FROM p_bounce_notice_transport WHERE correction_mail_id=?) AND ?='accepted'").bind(Date.now(),row.id,status)])
   await recordSender(env,row,route,address,status,fallback)
  }catch(error){
   const outcome=(error as any)?.status===403?'withheld':'uncertain'
   await env.DB.prepare('UPDATE p_mail SET status=?,provider=?,held_reason=? WHERE id=?').bind('uncertain',route==='installation'?env.MAIL_PROVIDER??null:route,outcome==='withheld'?'sender_not_authorized':null,row.id).run()
   await recordSender(env,row,route,address,outcome,fallback)
   if(outcome==='withheld'&&!await env.DB.prepare('SELECT 1 FROM p_completion_mail WHERE mail_id=?').bind(row.id).first())throw error
  }
 }
}

/** Resume only untouched local outbox work; restored history has no outbox or grant. */
export async function runCompletionMail(env:Bindings){
 const waiting=(await env.DB.prepare('SELECT g.proposal_id FROM p_completion_authority g WHERE NOT EXISTS(SELECT 1 FROM p_completion_mail m WHERE m.proposal_id=g.proposal_id) LIMIT 10').all<{proposal_id:string}>()).results
 for(const row of waiting)await queueReadyCompletionMail(env,row.proposal_id)
 const rows=(await env.DB.prepare("SELECT DISTINCT m.proposal_id FROM p_mail m JOIN p_completion_mail c ON c.mail_id=m.id JOIN p_completion_authority g ON g.proposal_id=c.proposal_id WHERE m.status='pending' LIMIT 10").all<{proposal_id:string}>()).results
 for(const row of rows)try{await dispatchMail(env,row.proposal_id)}catch{ /* Revoked authority remains held, without provider contact. */ }
}

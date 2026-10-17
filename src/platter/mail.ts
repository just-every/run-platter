import type { Bindings } from '../auth.server'
import { operatorMail } from '../mail.server.mjs'
import { demoEffect } from '@runeditrun/rer/internal/modules/demo/index.mjs'
// Local development captures mail for the outbox; a demo sends it through the demo guard instead.
export const capturesMail=(env:Bindings)=>env.AUTH_LOCAL==='true'&&env.RER_DEMO!=='1'
export const proposalMail=(title:string,shareUrl:string):[string,string]=>['Your proposal: '+title,`Review your proposal and verify your email before accepting:\n${shareUrl}`]
export function queueMail(env:Bindings,proposalId:string,to:string,subject:string,body:string){return env.DB.prepare('INSERT INTO p_mail(id,proposal_id,recipient,subject,body,status,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),proposalId,to,subject,body,capturesMail(env)?'local':'pending',Date.now())}
// Claim before contacting the provider; an uncertain attempt is never resent blindly.
export async function dispatchMail(env:Bindings,proposalId:string){if(capturesMail(env))return
 const sender=operatorMail(env);if(!sender)return
 const rows=(await env.DB.prepare("SELECT * FROM p_mail WHERE proposal_id=? AND status='pending'").bind(proposalId).all<any>()).results
 for(const row of rows){const claimed=await env.DB.prepare("UPDATE p_mail SET status='sending' WHERE id=? AND status='pending'").bind(row.id).run();if(!claimed.meta.changes)continue
  try{const result=await demoEffect(()=>sender.send({from:env.MAIL_FROM!,to:[row.recipient],deliveryId:row.id,subject:row.subject,text:row.body,html:row.body.replace(/[&<>]/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)),headers:{}}),()=>({provider:'demo',status:'accepted'}));await env.DB.prepare("UPDATE p_mail SET status=? WHERE id=?").bind(result?.status==='accepted'?'accepted':'uncertain',row.id).run()}catch{await env.DB.prepare("UPDATE p_mail SET status='uncertain' WHERE id=?").bind(row.id).run()}
 }
}

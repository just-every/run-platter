import type { Bindings } from '../auth.server'
import { operatorMail } from '../mail.server.mjs'
export function queueMail(env:Bindings,proposalId:string,to:string,subject:string,body:string){return env.DB.prepare('INSERT INTO p_mail(id,proposal_id,recipient,subject,body,status,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),proposalId,to,subject,body,env.AUTH_LOCAL==='true'?'local':'pending',Date.now())}
// Claim before contacting the provider; an uncertain attempt is never resent blindly.
export async function dispatchMail(env:Bindings,proposalId:string){if(env.AUTH_LOCAL==='true')return
 const sender=operatorMail(env);if(!sender)return
 const rows=(await env.DB.prepare("SELECT * FROM p_mail WHERE proposal_id=? AND status='pending'").bind(proposalId).all<any>()).results
 for(const row of rows){const claimed=await env.DB.prepare("UPDATE p_mail SET status='sending' WHERE id=? AND status='pending'").bind(row.id).run();if(!claimed.meta.changes)continue
  try{const result=await sender.send({from:env.MAIL_FROM!,to:[row.recipient],deliveryId:row.id,subject:row.subject,text:row.body,html:row.body.replace(/[&<>]/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)),headers:{}});await env.DB.prepare("UPDATE p_mail SET status=? WHERE id=?").bind(result?.status==='accepted'?'accepted':'uncertain',row.id).run()}catch{await env.DB.prepare("UPDATE p_mail SET status='uncertain' WHERE id=?").bind(row.id).run()}
 }
}

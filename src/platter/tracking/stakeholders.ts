import type { Bindings } from '../../auth.server'
import { email, hash, need, text } from '../model'
import { currentTime } from '../expiry-time'
import { queueMail, dispatchMail } from '../mail'
import { trackingSettings } from './index'
import { document } from '../ui/shell'
import { escape, field, hidden, panel } from '../ui/shared'

/** Mailbox possession identifies a stakeholder; it never inherits the original recipient's signing authority. */
export async function stakeholderResponse(env:Bindings,c:any,p:Record<string,unknown>){
 const db=env.DB,at=await currentTime(db)
 need((await trackingSettings(db,c.row.id)).enabled,'Stakeholder identification is off',403)
 need(c.row.status==='sent'&&!c.expiry.expired,'This offer is no longer open',409)
 if(p.code===undefined){
  need(p.consent==='yes'||p.consent===true,'Consent to mailbox verification')
  const address=email(p.email),name=text(p.name,'your name',200)
  need(address!==c.row.clientEmail,'Use the invitation email verification for the named recipient')
  const recent=await db.prepare('SELECT COUNT(*) AS n,MAX(created_at) AS last FROM p_tracking_challenges WHERE proposal_id=? AND email=?').bind(c.row.id,address).first<any>()
  need(recent.n<10&&(!recent.last||recent.last<=at-60000),'Wait before requesting another verification code',429)
  const id=crypto.randomUUID(),bytes=new Uint32Array(1);do crypto.getRandomValues(bytes);while(bytes[0]>=4294000000);const code=String(bytes[0]%1000000).padStart(6,'0')
  await db.batch([db.prepare('DELETE FROM p_tracking_challenges WHERE proposal_id=? AND email=? AND expires_at<=?').bind(c.row.id,address,at),db.prepare('INSERT INTO p_tracking_challenges(id,proposal_id,revision,name,email,code_hash,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').bind(id,c.row.id,c.row.revision,name,address,await hash(env.SESSION_SECRET+':'+id+':'+code),at,at+600000),queueMail(env,c.row.id,address,'Verify your stakeholder mailbox',`Your verification code is ${code}. It expires in 10 minutes. Identifying yourself shares your name and email with the proposal owner; it does not approve or sign the proposal.`)])
  await dispatchMail(env,c.row.id)
  return document('Verify your stakeholder mailbox',panel('Check your email',`<p>A code was sent to ${escape(address)}. Verifying shares your name and email with the proposal owner.</p><form method="post" action="/p/${encodeURIComponent(c.token)}/stakeholder">${hidden('challengeId',id)}${field('Stakeholder verification code','code','','required inputmode="numeric" autocomplete="one-time-code"')}<button>Verify stakeholder mailbox</button></form>`),{client:true})
 }
 const challenge=await db.prepare('SELECT * FROM p_tracking_challenges WHERE id=? AND proposal_id=? AND revision=?').bind(text(p.challengeId,'a verification challenge'),c.row.id,c.row.revision).first<any>()
 need(challenge&&challenge.expires_at>at&&challenge.attempts<5,'Code expired or reached its attempt limit',401)
 const code=text(p.code,'the six-digit code',6);need(/^\d{6}$/.test(code),'Enter the six-digit code')
 const claimed=await db.prepare('UPDATE p_tracking_challenges SET attempts=attempts+1 WHERE id=? AND attempts=? AND expires_at>?').bind(challenge.id,challenge.attempts,at).run()
 need(claimed.meta.changes&&await hash(env.SESSION_SECRET+':'+challenge.id+':'+code)===challenge.code_hash,'Incorrect verification code',401)
 await db.batch([db.prepare("INSERT INTO p_tracking_stakeholders(id,proposal_id,revision,name,email,verified_at) VALUES(?,?,?,?,?,?) ON CONFLICT(proposal_id,revision,email) DO UPDATE SET name=excluded.name,verified_at=excluded.verified_at").bind(crypto.randomUUID(),c.row.id,c.row.revision,challenge.name,challenge.email,at),db.prepare('DELETE FROM p_tracking_challenges WHERE id=?').bind(challenge.id)])
 return document('Mailbox verified',panel('Stakeholder identified','<p>Your name and verified email are available to the proposal owner. This did not sign or approve the proposal and does not grant the invited recipient’s authority.</p>'),{client:true})
}

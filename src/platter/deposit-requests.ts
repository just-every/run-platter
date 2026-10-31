import type { Bindings } from '../auth.server'
import { commit, exact, hash, need, type Actor } from './model'
import { currentTime } from './expiry-time'
import { capturesMail, dispatchMail, queueMail } from './mail'

const bindingSql = `SELECT p.id,p.version,p.revision,p.status,p.recipient_plan,
 a.snapshot,a.accepted_at,a.email,a.deposit_cents,a.currency,
 c.id AS client_id,c.email AS client_email,s.token,COALESCE(s.recipient,c.email) AS recipient
 FROM p_proposals p JOIN p_acceptances a ON a.proposal_id=p.id AND a.revision=p.revision
 JOIN p_paper_acceptances paper ON paper.proposal_id=a.proposal_id
 JOIN p_clients c ON c.id=p.client_id JOIN p_shares s ON s.proposal_id=p.id AND s.revision=p.revision
 WHERE p.id=? AND p.status='accepted' AND p.recipient_plan='[]'
 AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=p.id)`

async function binding(db:D1Database,id:string) {
 const row=await db.prepare(bindingSql).bind(id).first<any>()
 need(row&&row.email===row.recipient,'The accepted agreement and current invitation must match, with collection off',409)
 const frozen=JSON.parse(row.snapshot)
 // The accepted fee projection is authoritative; inspect all retained options for unsupported terms too.
 need(!frozen.recipient_plan?.length&&!frozen.paymentSchedule&&!frozen.payment_terms?.retainer&&!frozen.payment_terms?.milestones?.length
  &&!frozen.selection?.tax&&!frozen.selection?.fees?.recurring?.length
  &&!frozen.options?.some((o:any)=>o.tax||o.optionalItems?.some((i:any)=>i.recurrence)||o.tables?.some((t:any)=>t.lines.some((l:any)=>l.recurrence))),
  'Deposit requests currently require a tax-free, one-off agreement without a payment schedule',409)
 need(row.deposit_cents>0,'This agreement has no deposit to request',409)
 return {...row,invitationHash:await hash(row.token),acceptanceHash:await hash(row.snapshot),title:frozen.title}
}

export const depositRequests=async(db:D1Database,id:string)=>(await db.prepare('SELECT * FROM p_deposit_requests WHERE proposal_id=? ORDER BY authorized_at,id').bind(id).all<any>()).results

/** The review contains no invitation token and cannot itself authorize delivery. */
export async function depositRequestReview(db:D1Database,id:string) {
 try {const b=await binding(db,id);return {revision:b.revision,acceptedAt:b.accepted_at,recipient:b.recipient,depositCents:b.deposit_cents,currency:b.currency,invitationHash:b.invitationHash}}
 catch(error){if((error as any)?.status===409)return null;throw error}
}

export async function requestDeposit(env:Bindings,actor:Actor,input:Record<string,unknown>) {
 need(actor.role==='owner','Only the current owner authorizes a deposit request',403)
 need(input.consent===true||input.consent==='yes','Explicitly authorize this informational deposit request')
 const db=env.DB,id=String(input.id??''),b=await binding(db,id);exact(b,input)
 need(Number(input.revision)===b.revision&&Number(input.acceptedAt)===b.accepted_at&&input.recipient===b.recipient
  &&Number(input.depositCents)===b.deposit_cents&&input.invitationHash===b.invitationHash,
  'The deposit request review changed. Reload before authorizing it.',409)
 const existing=(await depositRequests(db,id))[0]
 if(existing){await dispatchMail(env,id,existing.mail_id);return {id,requestId:existing.id,status:(await depositRequests(db,id))[0].status}}
 const owner=await db.prepare("SELECT version FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first<any>()
 need(owner,'The request owner is no longer active',403)
 const at=await currentTime(db),requestId=crypto.randomUUID(),mailId=crypto.randomUUID(),status=capturesMail(env)?'local':'pending'
 const amount=b.currency+' '+(b.deposit_cents/100).toFixed(2)
 const body=`Deposit requested: ${amount}\nAgreement: ${b.title}\nAccepted revision: ${b.revision}\nRequest: ${requestId}\nAccepted by owner-attested upload. Platter did not verify the signature.\nThis is an informational request. No charge or payment link has been created. Contact the firm to arrange payment.\nVerify your invited mailbox to review the retained obligation:\n${env.AUTH_ORIGIN}/p/${b.token}`
 await commit(db,actor,[
  db.prepare('INSERT INTO p_deposit_requests(id,proposal_id,revision,accepted_at,recipient,deposit_cents,currency,authorized_by,authorized_at,mail_id,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(requestId,id,b.revision,b.accepted_at,b.recipient,b.deposit_cents,b.currency,actor.id,at,mailId,status,at),
  db.prepare('INSERT INTO p_deposit_request_authority VALUES(?,?,?,?,?,?,?)').bind(requestId,actor.id,owner.version,b.client_id,b.client_email,b.invitationHash,b.acceptanceHash),
  queueMail(env,id,b.recipient,'Deposit request: '+b.title,body,actor.id,null,mailId),
 ],true,{sql:`EXISTS(SELECT 1 FROM (${bindingSql}) b WHERE b.version=? AND b.snapshot=? AND b.token=? AND b.recipient=? AND b.client_email=?) AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND version=? AND role='owner' AND status='active')`,values:[id,b.version,b.snapshot,b.token,b.recipient,b.client_email,actor.id,owner.version]})
 await dispatchMail(env,id,mailId)
 return {id,requestId,status:(await depositRequests(db,id))[0].status}
}

/** Rechecked by every existing mail route, including after mailbox refresh. */
export async function depositRequestAuthority(env:Bindings,mail:any) {
 const request=await env.DB.prepare('SELECT * FROM p_deposit_requests WHERE mail_id=?').bind(mail.id).first<any>()
 if(!request)return
 const grant=await env.DB.prepare(`SELECT g.* FROM p_deposit_request_authority g JOIN oa_operators o ON o.id=g.owner_id
 AND o.version=g.owner_version AND o.role='owner' AND o.status='active' WHERE g.request_id=?`).bind(request.id).first<any>()
 need(grant,'Deposit request authority changed; restored history never sends',403)
 let b:any
 try{b=await binding(env.DB,request.proposal_id)}catch{need(false,'Deposit request invitation or acceptance changed',403)}
 need(b.revision===request.revision&&b.accepted_at===request.accepted_at&&b.recipient===request.recipient
  &&b.deposit_cents===request.deposit_cents&&b.currency===request.currency&&b.client_id===grant.client_id&&b.client_email===grant.client_email
  &&b.invitationHash===grant.invitation_hash&&b.acceptanceHash===grant.acceptance_hash
  &&mail.proposal_id===request.proposal_id&&mail.proposal_revision===request.revision&&mail.recipient===request.recipient&&mail.sender_id===grant.owner_id,
  'Deposit request invitation or acceptance changed',403)
}

export async function recordDepositDelivery(env:Bindings,mail:any,status:string,provider?:string|null,providerMessageId?:string|null) {
 await env.DB.prepare('UPDATE p_deposit_requests SET status=?,provider=?,provider_message_id=?,updated_at=? WHERE mail_id=?').bind(status,provider??null,providerMessageId??null,Date.now(),mail.id).run()
}

export async function clientDepositRequests(db:D1Database,c:any) {
 if(!c.verified||c.share.session_method!=='mailbox code')return []
 return (await depositRequests(db,c.row.id)).filter(r=>r.revision===c.row.revision&&r.recipient===c.row.clientEmail).map(r=>({id:r.id,revision:r.revision,recipient:r.recipient,depositCents:r.deposit_cents,currency:r.currency,requestedAt:r.authorized_at,status:r.status}))
}

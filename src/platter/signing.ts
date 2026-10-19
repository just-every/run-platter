import { suggest, suggestionState } from './suggestions'
// Adapted from Inkwell's scoped email-code signer flow: 10 minutes, five
// attempts, a minute between requests, ten generations, single-use verification.
import type { Bindings } from '../auth.server'
import { need,text,hash,secret,snapshot,fail } from './model'
import { queueMail,dispatchMail } from './mail'
const cookieName='platter_client'
export function sixDigitCode(){const limit=4294000000,v=new Uint32Array(1);do crypto.getRandomValues(v);while(v[0]>=limit);return String(v[0]%1000000).padStart(6,'0')}
export async function clientContext(env:Bindings,token:string,request:Request){need(/^[a-f0-9]{64}$/.test(token),'Proposal invitation not found',404);const share=await env.DB.prepare('SELECT * FROM p_shares WHERE token=?').bind(token).first<any>();need(share,'Proposal invitation not found',404);const row=await env.DB.prepare('SELECT p.*,c.name AS clientName,c.email AS clientEmail FROM p_proposals p JOIN p_clients c ON c.id=p.client_id WHERE p.id=?').bind(share.proposal_id).first<any>();need(row&&share.revision===row.revision&&['sent','accepted'].includes(row.status),'This proposal has been replaced',409)
 if(share.recipient)row.clientEmail=share.recipient
 const cookie=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1),verified=Boolean(cookie&&share.session_hash&&share.session_expires>Date.now()&&await hash(cookie)===share.session_hash)
 return{share,row,verified,token}
}
export async function clientView(env:Bindings,c:Awaited<ReturnType<typeof clientContext>>){const previous=c.row.previous_sent_revision?await env.DB.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=?').bind(c.row.id,c.row.previous_sent_revision).first<any>():null;const a=await env.DB.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(c.row.id).first<any>();return{...await suggestionState(env.DB,c.row.id,c.row.revision),...snapshot(c.row),previous:previous?JSON.parse(previous.snapshot):undefined,status:c.row.status,verified:c.verified,clientEmail:c.verified?c.row.clientEmail:c.row.clientEmail.replace(/^(.).*(@.*)$/, '$1***$2'),...(a&&c.verified?{acceptance:acceptanceView(a)}:{})}}
export const codeMail=(code:string,title:string):[string,string]=>['Your Platter verification code',`Your verification code is ${code}. It expires in 10 minutes.\nProposal: ${title}`]
// The frozen terms a client accepts: the chosen option, its deposit and the approved offer.
export function acceptanceTerms(row:any,optionId:unknown){const option=JSON.parse(row.options).find((o:any)=>o.id===optionId);need(option,'Choose one offered option');return{option,deposit:Math.round(option.cents*row.deposit_bps/10000),frozen:{...snapshot(row),clientName:row.clientName,clientEmail:row.clientEmail,approvedBy:row.approved_by,approvedAt:row.approved_at},consent:'I accept the selected option, scope and deposit.'}}
export const acceptanceView=(a:any)=>({name:a.name,email:a.email,optionId:a.option_id,totalCents:a.total_cents,depositCents:a.deposit_cents,acceptedAt:a.accepted_at,revision:a.revision,currency:a.currency??'AUD'})
async function atomic(env:Bindings,c:any,writes:D1PreparedStatement[],condition:string,values:any[],completed=false){try{await env.DB.batch([env.DB.prepare(`INSERT INTO p_guard(ok) VALUES((EXISTS(SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id WHERE s.token=? AND s.revision=p.revision AND p.status IN (${completed?"'sent','accepted'":"'sent'"}) AND ${condition})))`).bind(c.token,...values),...writes,env.DB.prepare('DELETE FROM p_guard')])}catch(e){if(String(e).includes('CHECK constraint')||String(e).includes('UNIQUE constraint'))fail('The proposal or verification changed. Reload before continuing.',409);throw e}}
export async function clientCommand(env:Bindings,c:Awaited<ReturnType<typeof clientContext>>,name:string,p:Record<string,unknown>){const{row,share}=c,db=env.DB,at=Date.now()
 if(name==='suggestion.create')return suggest(env,c,p)
 if(name==='code.request'){
  need(!share.code_sent_at||share.code_sent_at<=at-60000,'Wait one minute before requesting another code',429);need(share.code_generation<10,'Code request limit reached. Contact the sender.',429)
  const code=sixDigitCode(),generation=share.code_generation+1,codeHash=await hash(`${env.SESSION_SECRET}:${share.token}:${generation}:${code}`)
  await atomic(env,c,[db.prepare('UPDATE p_shares SET code_hash=?,code_expires=?,code_attempts=0,code_generation=?,code_sent_at=? WHERE token=?').bind(codeHash,at+600000,generation,at,c.token),queueMail(env,row.id,row.clientEmail,...codeMail(code,row.title))],'s.code_generation=?',[share.code_generation],true);await dispatchMail(env,row.id);return{message:'Verification code queued for your email.'}
 }
 if(name==='code.verify'){
  const code=text(p.code,'the six-digit code',6);need(/^\d{6}$/.test(code),'Enter the six-digit code');need(share.code_hash&&share.code_expires>at&&share.code_attempts<5,'Code expired, was used, or reached its attempt limit. Request another code.',401)
  const correct=await hash(`${env.SESSION_SECRET}:${share.token}:${share.code_generation}:${code}`)===share.code_hash,session=secret()
  await atomic(env,c,correct?[db.prepare('UPDATE p_shares SET code_hash=NULL,session_hash=?,session_expires=? WHERE token=?').bind(await hash(session),at+86400000,c.token),db.prepare("UPDATE p_mail SET body='Verification code consumed' WHERE proposal_id=? AND subject='Your Platter verification code'").bind(row.id)]:[db.prepare('UPDATE p_shares SET code_attempts=code_attempts+1 WHERE token=?').bind(c.token)],'s.code_hash=? AND s.code_attempts=? AND s.code_attempts<5 AND s.code_expires>?',[share.code_hash,share.code_attempts,at],true);need(correct,'Incorrect verification code',401)
  return{message:'Email verified. Choose your option and accept.',cookie:`${cookieName}=${session}; Path=/p/${c.token}; HttpOnly; SameSite=Strict; Max-Age=86400${env.AUTH_ORIGIN.startsWith('https:')?'; Secure':''}`}
 }
 if(name==='accept'){
  need(c.verified,'Verify your email before accepting',401);const a=await db.prepare('SELECT * FROM p_acceptances WHERE proposal_id=?').bind(row.id).first<any>();if(a)return{acceptance:acceptanceView(a)}
  need(p.consent===true||['on','yes'].includes(String(p.consent)),'Confirm that you accept this proposal');const signer=text(p.name,'your full name',200),{option,deposit,frozen,consent}=acceptanceTerms(row,p.optionId)
  await atomic(env,c,[db.prepare('INSERT INTO p_acceptances(proposal_id,revision,snapshot,name,email,option_id,total_cents,deposit_cents,accepted_at,consent,currency) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(row.id,row.revision,JSON.stringify(frozen),signer,row.clientEmail,option.id,option.cents,deposit,at,consent,frozen.currency),db.prepare("UPDATE p_proposals SET status='accepted',version=version+1 WHERE id=?").bind(row.id),db.prepare('DELETE FROM p_negotiations WHERE proposal_id=?').bind(row.id)],'s.session_hash=? AND s.session_expires>? AND p.approved_by IS NOT NULL',[share.session_hash,at]);return{message:'Proposal accepted. Your agreed version is frozen.'}
 }
 fail('Unknown client action',404)
}

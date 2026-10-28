import { clientLocale, clientText } from './locales'
import { selectedDocument } from './documents/blocks'
import { permitted, scope, senders } from './permissions'
import { currentTime } from './expiry-time'
import type { Bindings } from '../auth.server'
import { commit, fail, hash, need, text, type Actor } from './model'
import { dispatchMail, queueMail } from './mail'
import { prepareReplyNotice } from './question-reply-mail'

export type QuestionSection = 'scope' | 'pricing' | 'terms'
/** One sent revision accepts this many questions in any rolling day, bounding stored threads and owner notices. */
const QUESTION_LIMIT=20,QUESTION_WINDOW=24*60*60*1000
const limitMessage='This proposal has reached its limit of '+QUESTION_LIMIT+' questions in 24 hours. Try again later.'
export interface QuestionAnswer {
 id:string; question_id:string; text:string; owner_id:string; owner_email:string;
 source:'app'|'email'; created_at:number
}
export interface QuestionThread {
 id:string; proposal_id:string; revision:number; client_id:string; client_email:string;
 section:QuestionSection; block_id?:string|null; block_title?:string|null; text:string; created_at:number; title:string; clientName:string;
 answers:QuestionAnswer[]; status:'open'|'answered'
}
export interface QuestionGuard { sql:string; values:any[] }
type ClientContext = {
 verified:boolean; token:string;
 row:{id:string; revision:number; client_id:string; clientEmail:string; status:string; title:string;document?:unknown};
 share:{session_hash:string|null}
}

/** Internal state reader. HTTP callers must apply their own person/client scope. */
export async function questionState(db:D1Database,id?:string,revision?:number):Promise<{questions:QuestionThread[]}> {
 const filters:string[]=[],values:(string|number)[]=[]
 if(id!==undefined){filters.push('q.proposal_id=?');values.push(id)}
 if(revision!==undefined){filters.push('q.revision=?');values.push(revision)}
 const questions=(await db.prepare(`SELECT q.*,p.title,c.name AS clientName FROM p_questions q JOIN p_proposals p ON p.id=q.proposal_id JOIN p_clients c ON c.id=q.client_id${filters.length?' WHERE '+filters.join(' AND '):''} ORDER BY q.created_at,q.id`).bind(...values).all<Omit<QuestionThread,'answers'|'status'>>()).results
 const answers=(await db.prepare(`SELECT a.id,a.question_id,a.text,a.owner_id,a.owner_email,a.source,a.created_at FROM p_question_answers a JOIN p_questions q ON q.id=a.question_id${filters.length?' WHERE '+filters.join(' AND '):''} ORDER BY a.created_at,a.id`).bind(...values).all<QuestionAnswer>()).results
 const grouped=new Map<string,QuestionAnswer[]>()
 for(const answer of answers){const rows=grouped.get(answer.question_id)??[];rows.push(answer);grouped.set(answer.question_id,rows)}
 return {questions:questions.map(question=>{const rows=grouped.get(question.id)??[];return {...question,answers:rows,status:rows.length?'answered':'open'}})}
}

/** Unverified invitations reveal no question text. Accepted packages retain all revisions for this client. */
export async function clientQuestionState(db:D1Database,c:ClientContext) {
 if(!c.verified)return {questions:[]}
 const state=await questionState(db,c.row.id,c.row.status==='accepted'?undefined:c.row.revision)
 return {questions:state.questions.filter(q=>q.client_id===c.row.client_id&&(c.row.status==='accepted'||q.client_email.toLowerCase()===c.row.clientEmail.toLowerCase()))}
}

async function activeOwner(db:D1Database,a:Actor) {
 need(senders.includes(a.role),'Your role cannot manage client questions',403)
 const owner=await db.prepare("SELECT id,email,version FROM oa_operators WHERE id=? AND email=? AND status='active'").bind(a.id,a.email).first<{id:string;email:string;version:number}>()
 need(owner,'An active owner account is required',403)
 return owner
}

/** The temporary owner-only queue; TEAM-001/FOLLOW-002 can inherit this public function. */
export async function openQuestions(db:D1Database,a:Actor) {
 await activeOwner(db,a)
 const withdrawn=(await db.prepare('SELECT proposal_id,revision FROM p_withdrawals').all<any>()).results
 const visibility=scope(a,'send'),visible=new Set((await db.prepare('SELECT p.id FROM p_proposals p WHERE '+visibility.sql).bind(...visibility.values).all<any>()).results.map(p=>p.id))
 return (await questionState(db)).questions.filter(q=>visible.has(q.proposal_id)&&q.status==='open'&&!withdrawn.some(w=>w.proposal_id===q.proposal_id&&w.revision===q.revision))
}

/** A current sent revision remains discussable while its acceptance is expired. */
export async function createQuestion(env:Bindings,c:ClientContext,input:Record<string,unknown>) {
 need(c.verified&&c.share.session_hash,'Verify your email before asking a question',401)
 need(c.row.status==='sent','Ask questions on the current sent proposal',409)
 need(Number(input.revision)===c.row.revision,'This offer changed. Reload before asking.',409)
 const requested=String(input.section),block=requested.startsWith('block:')?selectedDocument(c.row.document,(c as any).optionId,(c as any).selection?.items??[]).blocks.find(b=>b.id===requested.slice(6)&&b.type!=='page_break'):undefined
 need(['scope','pricing','terms'].includes(requested)||block,'Choose a current visible proposal section')
 const section=block?'scope':requested
 const body=text(input.text,'your question',10000),id=crypto.randomUUID(),db=env.DB,at=await currentTime(db)
 const budget={sql:`(SELECT COUNT(*) FROM p_questions WHERE proposal_id=? AND revision=? AND created_at>?)<${QUESTION_LIMIT}`,values:[c.row.id,c.row.revision,at-QUESTION_WINDOW]}
 const withinBudget=async()=>Boolean((await db.prepare(`SELECT ${budget.sql} AS ok`).bind(...budget.values).first<{ok:number}>())?.ok)
 need(await withinBudget(),limitMessage,429)
 const owners=(await db.prepare("SELECT id,email,version FROM oa_operators WHERE role='owner' AND status='active' ORDER BY id").all<{id:string;email:string;version:number}>()).results
 need(owners.length,'An active owner is required to receive questions',409)
 // Commit binds the exact invitation, verified session, client, sent revision, and notified owner mailboxes.
 const guard=`EXISTS(SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id JOIN p_clients c ON c.id=p.client_id WHERE s.token=? AND s.proposal_id=? AND s.revision=p.revision AND p.revision=? AND p.client_id=? AND lower(COALESCE(s.recipient,c.email))=lower(?) AND s.session_hash=? AND s.session_expires>MAX(?,COALESCE((SELECT observed_at FROM p_expiry_clock WHERE singleton=1),0)) AND p.status='sent')`
 const ownerChecks=owners.map(()=>"EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND email=? AND version=? AND role='owner' AND status='active')").join(' AND ')
 try { await db.batch([
  db.prepare(`INSERT INTO p_guard(ok) VALUES((${guard}) AND (${ownerChecks}) AND ${budget.sql})`).bind(c.token,c.row.id,c.row.revision,c.row.client_id,c.row.clientEmail,c.share.session_hash,at,...owners.flatMap(o=>[o.id,o.email,o.version]),...budget.values),
  db.prepare('INSERT INTO p_questions(id,proposal_id,revision,client_id,client_email,section,text,created_at,block_id,block_title,language) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,c.row.id,c.row.revision,c.row.client_id,c.row.clientEmail,section,body,at,block?.id??null,block?.title||block?.type||null,clientLocale(c.row)),
  ...(await Promise.all(owners.map(owner=>prepareReplyNotice(env,owner,{id,proposal_id:c.row.id,revision:c.row.revision,section:block?.title||block?.type||section,text:body,title:c.row.title})))).flat(),
  audit(db,c.row.client_id,'client','question.create',id,at),
  db.prepare('DELETE FROM p_guard')
 ]) }catch(error){if(String(error).includes('CHECK constraint')){need(await withinBudget(),limitMessage,429);fail('The invitation, owner, or proposal changed. Reload before asking.',409)}throw error}
 await dispatchMail(env,c.row.id)
 return {id:c.row.id,questionId:id,message:'Question sent to the owner.'}
}

export interface AnswerInput {
 id:unknown; questionId:unknown; text:unknown; source?:'app'|'email'; sourceId?:unknown
}

/** Called only after a real native session or authenticated inbound-mail edge resolves the owner.
 * Inbound sourceId must be the authenticated provider/message identity, never a token or credential.
 * One identity can record one answer; a replay cannot send a second notification.
 */
export async function recordAnswer(env:Bindings,a:Actor,input:AnswerInput,hook?:{guard:QuestionGuard;writes:D1PreparedStatement[]}) {
 const db=env.DB,owner=await activeOwner(db,a),id=text(input.id,'a proposal'),questionId=text(input.questionId,'a question'),normalizedBody=text(input.text,'your answer',10000)
 await permitted(db,a,id,'send')
 const source=input.source??'app';need(source==='app'||source==='email','Unknown answer source')
 const body=source==='email'?input.text as string:normalizedBody
 need(source!=='email'||input.sourceId!==undefined,'Authenticated inbound message identity is required')
 need(source!=='email'||hook,'Authenticated inbound authorization is required',403)
 const sourceId=input.sourceId===undefined?await hash(`${a.id}\n${id}\n${questionId}\n${body}`):text(input.sourceId,'a message identity',500)
 const sourceKey=await hash(`${source}\n${sourceId}`),answerId=crypto.randomUUID(),at=await currentTime(db)
 need(!(await db.prepare('SELECT w.id FROM p_withdrawals w JOIN p_proposals p ON p.id=w.proposal_id AND p.revision=w.revision WHERE p.id=?').bind(id).first()),'Withdrawn proposals are read-only',409)
 const question=await db.prepare('SELECT q.*,p.title FROM p_questions q JOIN p_proposals p ON p.id=q.proposal_id WHERE q.id=? AND q.proposal_id=?').bind(questionId,id).first<any>()
 need(question,'Question not found on this proposal',404)
 need(!(await db.prepare('SELECT id FROM p_withdrawals WHERE proposal_id=? AND revision=?').bind(id,question.revision).first()),'Withdrawn revisions are read-only',409)
 const guard={sql:"NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?) AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND email=? AND version=? AND status='active') AND EXISTS(SELECT 1 FROM p_questions WHERE id=? AND proposal_id=? AND revision=? AND client_id=? AND client_email=?)",values:[id,question.revision,owner.id,owner.email,owner.version,questionId,id,question.revision,question.client_id,question.client_email]}
 if(hook){guard.sql+=' AND ('+hook.guard.sql+')';guard.values.push(...hook.guard.values)}
 const prior=await db.prepare('SELECT id,question_id,text,owner_id FROM p_question_answers WHERE source_key=?').bind(sourceKey).first<any>()
 if(prior){need(source!=='email','This reply has already been recorded',409);need(prior.question_id===questionId&&prior.owner_id===a.id&&prior.text===body,'This message identity has already been used',409);await commit(db,a,[],true,guard);return {id,questionId,answerId:prior.id,replayed:true}}
 const language=clientLocale({client_locale:question.language})
 try { await commit(db,a,[
  ...(hook?.writes??[]),
  db.prepare('UPDATE p_question_reply_keys SET used_at=? WHERE question_id=? AND used_at IS NULL').bind(at,questionId),
  db.prepare('INSERT INTO p_question_answers(id,question_id,text,owner_id,owner_email,source,source_key,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(answerId,questionId,body,a.id,a.email,source,sourceKey,at),
  queueMail(env,id,question.client_email,clientText('Answer to your question: ',language)+question.title,clientText('The firm answered your ',language)+(language==='en'?question.section:clientText(({scope:'Scope',pricing:'Pricing',terms:'Terms'} as Record<string,string>)[question.section]??question.section,language))+clientText(' question on revision ',language)+question.revision+clientText('.\n\nYour question:\n',language)+question.text+clientText('\n\nAnswer:\n',language)+body,a.id),
  audit(db,a.id,a.role,'question.answer',questionId,at)
 ],true,guard) }catch(error){
  // A concurrent delivery may have committed the same authenticated message first.
  if(source==='app'&&(error as any)?.status===409){const duplicate=await db.prepare('SELECT id,question_id,text,owner_id FROM p_question_answers WHERE source_key=?').bind(sourceKey).first<any>();if(duplicate&&duplicate.question_id===questionId&&duplicate.owner_id===a.id&&duplicate.text===body){await commit(db,a,[],true,guard);return {id,questionId,answerId:duplicate.id,replayed:true}}}
  throw error
 }
 await dispatchMail(env,id)
 return {id,questionId,answerId,message:'Answer saved and client notification queued.'}
}

export async function questionCommand(env:Bindings,a:Actor,name:string,input:Record<string,unknown>) {
 need(name==='question.answer'||name==='question.email','Unknown question action',404)
 if(name==='question.email'){
  need(a.role==='owner','Only the owner uses inbound reply capabilities',403)
  const db=env.DB,owner=await activeOwner(db,a),id=text(input.id,'a proposal'),questionId=text(input.questionId,'a question')
  need(!(await db.prepare('SELECT w.id FROM p_withdrawals w JOIN p_proposals p ON p.id=w.proposal_id AND p.revision=w.revision WHERE p.id=?').bind(id).first()),'Withdrawn proposals are read-only',409)
 const question=await db.prepare('SELECT q.*,p.title FROM p_questions q JOIN p_proposals p ON p.id=q.proposal_id WHERE q.id=? AND q.proposal_id=?').bind(questionId,id).first<any>()
  need(question,'Question not found on this proposal',404)
 need(!(await db.prepare('SELECT id FROM p_withdrawals WHERE proposal_id=? AND revision=?').bind(id,question.revision).first()),'Withdrawn revisions are read-only',409)
  await commit(db,a,[...await prepareReplyNotice(env,owner,question),audit(db,a.id,'owner','question.email',questionId,Date.now())],true,{sql:'NOT EXISTS(SELECT 1 FROM p_withdrawals WHERE proposal_id=? AND revision=?)',values:[id,question.revision]})
  await dispatchMail(env,id)
  return {id,questionId,message:'Question notice queued for your owner mailbox.'}
 }
 // Source and message identity are chosen by the server; app clients cannot impersonate inbound mail.
 return recordAnswer(env,a,{id:input.id,questionId:input.questionId,text:input.text,sourceId:input.requestId})
}
function audit(db:D1Database,actorId:string,role:string,action:string,subject:string,at:number) {
 return db.prepare('INSERT INTO p_audit(id,actor_id,actor_role,action,subject,occurred_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actorId,role,action,subject,at)
}

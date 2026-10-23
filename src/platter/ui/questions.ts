import { documentOf } from '../documents/blocks'
import { area, date, escape, form, hidden, panel, proposalPath, statusPill } from './shared'
import type { QuestionThread } from '../questions'

function thread(question:QuestionThread,answerForm='',closed=false) {
 return `<article id="question-${escape(question.id)}"><h3>${escape(question.block_title||question.section)} · Revision ${escape(question.revision)}</h3><p>${statusPill(closed?'closed':question.status)} · Asked ${date(question.created_at)}</p><p class="preserve">${escape(question.text)}</p>${question.answers.map(answer=>`<article><h4>Team answer</h4><p>${date(answer.created_at)}</p><p class="preserve">${escape(answer.text)}</p></article>`).join('')}${answerForm}</article>`
}

/** Proposal history is visible to people; only the current owner receives answer controls. */
export function ownerQuestions(state:any,p:any) {
 if(!['owner','admin','manager','sales','content_editor','viewer','billing'].includes(state.actor?.role))return ''
 const questions:QuestionThread[]=p.questions??[]
 if(!questions.length)return ''
 const rows=questions.map(q=>thread(q,p.canSend&&!p.withdrawals?.some((w:any)=>w.revision===q.revision)?form('question.answer',proposalPath(p.id),hidden('id',p.id)+hidden('questionId',q.id)+hidden('requestId',crypto.randomUUID())+area('Answer this question','text','','required maxlength="10000"')+'<button>Send answer to client</button>')+(state.actor.role==='owner'?form('question.email',proposalPath(p.id),hidden('id',p.id)+hidden('questionId',q.id)+'<button>Email me this question</button>'):''):'',Boolean(p.withdrawals?.some((w:any)=>w.revision===q.revision)))).join('')
 return panel('Client questions',rows)
}

export function clientQuestions(view:any,publicForm:(name:string,body:string)=>string) {
 if(!view.verified)return ['sent','expired'].includes(view.status)?panel('Questions for the owner','<p>Verify your email to ask about scope, pricing, or terms.</p>'):''
 const questions:QuestionThread[]=view.questions??[]
 const create=['sent','expired'].includes(view.status)?publicForm('question.create',hidden('revision',view.revision)+'<label>Question about<select name="section" aria-label="Question about" required><option value="scope">Scope</option><option value="pricing">Pricing</option><option value="terms">Terms</option>'+documentOf(view).blocks.filter(b=>b.type!=='page_break').map(b=>'<option value="block:'+escape(b.id)+'">'+escape(b.title||b.type)+'</option>').join('')+'</select></label>'+area('Your question','text','','required maxlength="10000"')+'<button>Send question to owner</button>'):''
 return questions.length||create?panel(view.status==='accepted'?'Agreement question history':'Questions for the owner',questions.map(q=>thread(q)).join('')+create):''
}

export function openQuestionsPanel(state:any) {
 if(!state.openQuestions?.length)return ''
 const questions:QuestionThread[]=state.openQuestions??[]
 return panel('Open client questions',questions.length?`<ul class="records">${questions.map(q=>`<li><article><h3><a href="${proposalPath(q.proposal_id)}#question-${escape(q.id)}">${escape(q.title)}</a></h3><p>${escape(q.clientName)} · ${escape(q.block_title||q.section)} · Revision ${escape(q.revision)} · ${date(q.created_at)}</p><p class="preserve">${escape(q.text)}</p></article></li>`).join('')}</ul>`:'<p>No client questions are waiting for an answer.</p>')
}

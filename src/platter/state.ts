import { followupQueue } from './followup/queue'
import { starterTemplates } from './starter-templates'
import { templateState } from './templates'
import { installationZone } from './reports/report-state'
import { questionState, openQuestions } from './questions'
import { expiryFor, currentTime } from './expiry'
import { pdfState } from './documents/client-pdf'
import { businessState } from './business-records'
import { deliveryState } from './delivery'
import { vendorDocuments } from './attachments'
import { suggestionState } from './suggestions'
import { sendRequests } from './send-requests'
import type { Bindings } from '../auth.server'
import { agentKeys } from './credentials'
import { acceptanceView } from './signing'
import { paperRows,paperView } from './paper-record'
import { reportState } from './reports/report-state'
import { importJobs } from './movein'
import type { Actor } from './model'
import { capturesMail } from './mail'
import { revisionHistory } from './history'
import { negotiatedView } from './negotiation'
export async function state(env:Bindings,a:Actor){const db=env.DB,clients=(await db.prepare('SELECT * FROM p_clients ORDER BY name').all()).results,proposals=(await db.prepare('SELECT p.*,c.name AS clientName,c.email AS clientEmail FROM p_proposals p JOIN p_clients c ON p.client_id=c.id ORDER BY p.created_at DESC').all<any>()).results
 const outcomes=(await db.prepare('SELECT * FROM p_outcomes ORDER BY occurred_at,revision').all<any>()).results
 const withdrawals=(await db.prepare('SELECT * FROM p_withdrawals ORDER BY withdrawn_at,id').all<any>()).results
 const testMail=(await db.prepare("SELECT actor_id,subject AS proposal_id,occurred_at FROM p_audit WHERE action='proposal.test-mail' ORDER BY occurred_at DESC,id DESC").all<any>()).results
 const invitationMessages=a.role==='agent'?[]:(await db.prepare('SELECT * FROM p_invitation_messages ORDER BY queued_at DESC,id DESC').all<any>()).results
 const logicalNow=await currentTime(db)
 const pdf=await pdfState(db)
 const questions=a.role==='agent'?[]:(await questionState(db)).questions
 const delivery=await deliveryState(env,a)
 const negotiations=(await db.prepare('SELECT * FROM p_negotiations').all<any>()).results
 const deliveries=(await db.prepare("SELECT proposal_id,status FROM p_mail WHERE subject LIKE 'Your proposal:%' ORDER BY created_at DESC").all<any>()).results
 const papers=await paperRows(db)
 const [accepted,invoices,shares]=await Promise.all([db.prepare('SELECT * FROM p_acceptances').all<any>(),db.prepare('SELECT id,proposal_id,number,exported_at FROM p_invoices').all<any>(),a.role==='owner'?db.prepare('SELECT proposal_id,token FROM p_shares').all<any>():Promise.resolve({results:[]})])
 const result={...await businessState(db,a),...await reportState(env,a),actor:a,clients,openQuestions:a.role==='owner'?await openQuestions(db,a):[],mailTransport:env.MAIL_PROVIDER,bounceNotices:delivery.bounceNotices,deliveryEventsAvailable:['resend','sendgrid'].includes(env.MAIL_PROVIDER??'')&&Boolean(env.MAIL_WEBHOOK_KEY),vendorDocuments:a.role==='owner'?await vendorDocuments(db):[],importedClients:a.role==='owner'?(await db.prepare('SELECT DISTINCT client_id FROM p_import_client_revisions').all<any>()).results.map(r=>r.client_id):[],sendRequests:a.role==='owner'?await sendRequests(db,a):[],revisions:await revisionHistory(db),proposals:await Promise.all(proposals.map(async original=>{const expiry=await expiryFor(db,original,logicalNow);const withdrawn=withdrawals.some(w=>w.proposal_id===original.id&&w.revision===original.revision);const p=negotiatedView({...original,...(withdrawn?{status:'withdrawn'}:{})},negotiations.find(n=>n.proposal_id===original.id));return({...p,...(a.role!=='agent'?{invitationMessages:invitationMessages.filter(m=>m.proposal_id===p.id)}:{}),testMail:testMail.filter(t=>t.proposal_id===p.id&&(a.role==='owner'||t.actor_id===a.id)),activeWithdrawal:withdrawn,outcomes:outcomes.filter(o=>o.proposal_id===p.id),withdrawals:withdrawals.filter(w=>w.proposal_id===p.id),questions:questions.filter(q=>q.proposal_id===p.id),expiry,status:withdrawn&&!p.negotiating?'withdrawn':expiry.expired&&!p.negotiating?'expired':p.status,pipelineStatus:withdrawn?(outcomes.find(o=>o.proposal_id===p.id&&o.revision===original.revision)?.kind??'withdrawn'):expiry.expired?'expired':p.status,pdfDownloadsEnabled:pdf.settings.find(r=>r.proposal_id===p.id)?.enabled!==0,pdfDownloads:pdf.downloads.filter(r=>r.proposal_id===p.id),attachments:typeof p.attachments==='string'?JSON.parse(p.attachments):p.attachments??[],...await suggestionState(db,p.id),deliveries:delivery.deliveries.filter(d=>d.proposal_id===p.id),delivery:delivery.deliveries.find(d=>d.proposal_id===p.id)?.status??deliveries.find(d=>d.proposal_id===p.id)?.status,preparedByName:p.prepared_by.startsWith('agent:')?'Agent':p.prepared_by,options:typeof p.options==='string'?JSON.parse(p.options):p.options,acceptance:accepted.results.find(x=>x.proposal_id===p.id)?{...acceptanceView(accepted.results.find(x=>x.proposal_id===p.id)),...paperView(papers.find(x=>x.proposal_id===p.id),a.role!=='agent')}:undefined,invoice:invoices.results.find(x=>x.proposal_id===p.id),shareToken:shares.results.find(x=>x.proposal_id===p.id)?.token})})),agentKeys:await agentKeys(db,a),importJobs:a.role==='owner'?await importJobs(db,a):[],outbox:a.role==='owner'&&capturesMail(env)?(await db.prepare('SELECT id,proposal_id,recipient,subject,body,status FROM p_mail ORDER BY created_at DESC LIMIT 30').all()).results:[]}
 const followupRecords=a.role==='owner'?(await db.prepare('SELECT * FROM p_followups').all<any>()).results:[]
 const notices=a.role==='owner'?(await db.prepare('SELECT proposal_id,closed_at FROM p_bounce_notices').all<any>()).results:[]
 return {...result,starterTemplates:starterTemplates(),templates:await templateState(db,a),...(a.role==='owner'?{followups:followupQueue(result.proposals,followupRecords,notices,await installationZone(db),logicalNow),followupActions:(await db.prepare('SELECT * FROM p_followup_actions ORDER BY occurred_at,id').all<any>()).results}:{})}
}

import { failureNoticeSettings } from './payment-failure-notices'
import { smsState, smsTransportConfigured } from './sms'
import { syncHistory } from './crm/hubspot-sync'
import { notificationSettingsState } from './notifications/commands'
import { archiveState } from './archiving/jobs'
import { taxSettings } from './taxes'
import { recipientSignatures, recipientPlan } from './recipients'
import { engagement as engagementDetails } from './tracking/index'
import { trackingState, trackingSettings, senderAlerts, purgeTracking } from './tracking'
import { collaborationStates } from './collaboration'
import { surchargeSettings } from './collection-fees'
import { collectionView } from './collection'
import { collectionPolicy } from './collection-policy'
import { outcomeSettings, crmOutcomeState } from './outcomes'
import { ensurePdfSearch } from './documents/pdf-search'
import { mediaFiles } from './documents/media'
import { documentOf } from './documents/blocks'
import { agentDeliveryDefaults } from './reminder-message-defaults'
import { reminderTemplates } from './reminder-messages'
import { reminderSlots, afterQuietHours } from './reminder-schedule'
import { expiryDeadline, localDate } from './expiry-time'
import { reminderState } from './reminders'
import { resendReplyAvailable } from './question-reply-mail'
import { recordedRevenue, revenueReaders } from './reports/recorded-revenue'
import { disputeState } from './disputes'
import { catalogState } from './catalog'
import { resourceFolders, proposalFolders } from './folders'
import { paymentState } from './payments'
import { connectionState } from './connections'
import { workspaceDefaults } from './workspace'
import { internalPricing } from './internal-pricing'
import { libraryState } from './library'
import { scope, senders, editors, reporters, teamState } from './permissions'
import { approvalSettings, approvalPlan } from './approvals'
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
import { importJobs, documentMoveinState } from './movein'
import type { Actor } from './model'
import { capturesMail } from './mail'
import { revisionHistory } from './history'
import { negotiatedView } from './negotiation'
export async function state(env:Bindings,a:Actor,candidateIds?:string[]){const db=env.DB;await ensurePdfSearch(db,a);const visibility=scope(a,'view'),canWork=senders.includes(a.role),canReport=reporters.includes(a.role),clients=(await db.prepare('SELECT * FROM p_clients ORDER BY name').all()).results,proposals=(await db.prepare('SELECT p.*,lang.locale AS client_locale,c.name AS clientName,c.email AS clientEmail FROM p_proposals p JOIN p_clients c ON p.client_id=c.id LEFT JOIN p_client_locales lang ON lang.proposal_id=p.id WHERE ('+visibility.sql+')'+(candidateIds?' AND p.id IN (SELECT value FROM json_each(?))':'')+' ORDER BY p.created_at DESC,p.id').bind(...visibility.values,...(candidateIds?[JSON.stringify(candidateIds)]:[])).all<any>()).results
 const sendScope=scope(a,'send'),sendIds=new Set((await db.prepare('SELECT p.id FROM p_proposals p WHERE '+sendScope.sql).bind(...sendScope.values).all<any>()).results.map(p=>p.id))
 const memberZones=(await db.prepare('SELECT operator_id,time_zone FROM p_members').all<any>()).results,defaultZone=await installationZone(db)
 const sectionLocks=(await db.prepare('SELECT * FROM p_proposal_locks UNION ALL SELECT * FROM p_proposal_block_locks ORDER BY section').all<any>()).results
 const savedDefaults=(await db.prepare('SELECT * FROM p_proposal_defaults').all<any>()).results
 const outcomes=(await db.prepare('SELECT * FROM (SELECT * FROM p_outcomes UNION ALL SELECT * FROM p_outcome_records) ORDER BY occurred_at,revision').all<any>()).results
 const withdrawals=(await db.prepare('SELECT * FROM p_withdrawals ORDER BY withdrawn_at,id').all<any>()).results
 const testMail=(await db.prepare("SELECT actor_id,subject AS proposal_id,occurred_at FROM p_audit WHERE action='proposal.test-mail' ORDER BY occurred_at DESC,id DESC").all<any>()).results
 const replacements=a.role==='agent'?[]:(await db.prepare('SELECT * FROM p_signer_replacements ORDER BY replaced_at,id').all<any>()).results
 const invitationMessages=a.role==='agent'?[]:(await db.prepare('SELECT * FROM p_invitation_messages ORDER BY queued_at DESC,id DESC').all<any>()).results
 if(a.role!=='owner')await purgeTracking(db,await currentTime(db))
 const tracking=await trackingState(db,a),trackingPolicy=await trackingSettings(db)
 const viewed=canReport||canWork?(await db.prepare('SELECT DISTINCT proposal_id,revision FROM p_views').all<any>()).results:[]
 const logicalNow=await currentTime(db)
 const pdf=await pdfState(db)
 const questions=a.role==='agent'?[]:(await questionState(db)).questions
 const delivery=await deliveryState(env,a)
 const negotiations=(await db.prepare('SELECT * FROM p_negotiations').all<any>()).results
 const deliveries=(await db.prepare("SELECT proposal_id,status FROM p_mail WHERE subject LIKE 'Your proposal:%' ORDER BY created_at DESC").all<any>()).results
 const papers=await paperRows(db)
 const [accepted,invoices,shares]=await Promise.all([db.prepare('SELECT a.*,f.method AS verification_method FROM p_acceptances a LEFT JOIN p_signature_facts f ON f.proposal_id=a.proposal_id').all<any>(),db.prepare('SELECT id,proposal_id,number,exported_at FROM p_invoices').all<any>(),canWork?db.prepare('SELECT proposal_id,token,slot_id,embed_origin FROM p_shares').all<any>():Promise.resolve({results:[]})])
 const visible=new Set(proposals.map(p=>p.id)),personalTimeZone=(await db.prepare('SELECT time_zone FROM p_members WHERE operator_id=?').bind(a.id).first<any>())?.time_zone??await installationZone(db)
 const mailReplies=(await db.prepare('SELECT id,proposal_id,revision,client_id,client_email,claimed_from,spf_result,dkim_result,text,received_at FROM p_mail_replies ORDER BY received_at,id').all<any>()).results
 const mailAttributions=(await db.prepare('SELECT m.*,o.email AS actor_email FROM p_mail_attributions m JOIN oa_operators o ON o.id=m.actor_id ORDER BY m.occurred_at DESC,m.mail_id').all<any>()).results
 const deliveryChanges=(await db.prepare('SELECT * FROM p_delivery_changes ORDER BY occurred_at,sequence').all<any>()).results
 const reminders=await reminderState(db,a)
 const revenue=await recordedRevenue(db,a)
 const replyCapNotices=a.role==='owner'?(await db.prepare('SELECT n.*,p.title FROM p_mail_reply_cap_notices n JOIN p_proposals p ON p.id=n.proposal_id ORDER BY n.created_at DESC,n.mail_id').all<any>()).results:[]
  const proposalFolderNames=await proposalFolders(db,a),pdfText=(await db.prepare('SELECT file_id,content FROM p_attachment_search').all<any>()).results,filing=(await db.prepare('SELECT * FROM p_proposal_filing').all<any>()).results
 const collaboration=await collaborationStates(db,a,visible)
 const result={paymentFailureNotices:await failureNoticeSettings(db,a),notificationSettings:await notificationSettingsState(env,a),...await documentMoveinState(db,a),origin:env.AUTH_ORIGIN,tracking,trackingAlerts:await senderAlerts(db,a),collaborationPeople:a.role==='agent'?undefined:Object.fromEntries([...collaboration].map(([id,value])=>[id,value.people])),collaborationRoutes:['owner','admin'].includes(a.role)?(await db.prepare('SELECT r.id,r.provider,r.kind,r.destination,c.route_id AS enabled FROM p_notification_routes r JOIN p_notification_route_authority auth ON auth.route_id=r.id LEFT JOIN p_collaboration_routes c ON c.route_id=r.id').all<any>()).results:[],outcomeSettings:senders.includes(a.role)?await outcomeSettings(db):undefined,crmOutcomes:await crmOutcomeState(db,a),reminderTemplates:await reminderTemplates(db,a),reminderPolicy:reminders.policy,replyCapNotices,clientMailRepliesAvailable:resendReplyAvailable(env),smsTransportAvailable:smsTransportConfigured(env),disputes:await disputeState(env,a),catalogItems:await catalogState(db,a),resourceFolders:[...await resourceFolders(db,a),...await proposalFolders(db,a)],paymentRecords:await paymentState(env,a),archiving:await archiveState(env,a),connections:await connectionState(env,a),mailboxOAuth:{gmail:Boolean(env.GOOGLE_MAIL_CLIENT_ID&&env.GOOGLE_MAIL_CLIENT_SECRET),microsoft:Boolean(env.MICROSOFT_MAIL_CLIENT_ID&&env.MICROSOFT_MAIL_CLIENT_SECRET)},...(['owner','admin'].includes(a.role)?{collectionFees:await surchargeSettings(db),taxSettings:a.role==='owner'?await taxSettings(db):undefined,workspaceDefaults:await workspaceDefaults(db)}:{}),libraryItems:await libraryState(db,a),personalTimeZone,...await teamState(db,a),...(['owner','admin'].includes(a.role)?{approvalSettings:await approvalSettings(db)}:{}),...await businessState(db,a),...await reportState(env,a),actor:{id:a.id,email:a.email,role:a.role},clients,openQuestions:canWork?await openQuestions(db,a):[],mailTransport:env.MAIL_PROVIDER,bounceNotices:delivery.bounceNotices,deliveryEventsAvailable:['resend','sendgrid'].includes(env.MAIL_PROVIDER??'')&&Boolean(env.MAIL_WEBHOOK_KEY),vendorDocuments:['owner','admin'].includes(a.role)?await vendorDocuments(db):[],importedClients:a.role==='owner'?(await db.prepare('SELECT DISTINCT client_id FROM p_import_client_revisions').all<any>()).results.map(r=>r.client_id):[],sendRequests:a.role==='owner'?await sendRequests(db,a):[],revisions:(await revisionHistory(db)).filter((r:any)=>visible.has(r.proposal_id)),proposals:await Promise.all(proposals.map(async original=>{const expiry=await expiryFor(db,original,logicalNow);const withdrawn=withdrawals.some(w=>w.proposal_id===original.id&&w.revision===original.revision);const p=negotiatedView({...original,...(withdrawn?{status:'withdrawn'}:{})},negotiations.find(n=>n.proposal_id===original.id));const approval=await approvalPlan(db,p,a);const costs=await internalPricing(db,p,a);const deliveryDefault=savedDefaults.find(d=>d.proposal_id===p.id);const reminder=reminders.settings.find(s=>s.proposal_id===p.id&&s.revision===p.revision),provisional=['draft','approved'].includes(p.status)||Boolean(p.negotiating),previewSentAt=provisional?logicalNow:expiry.sentAt,previewZone=provisional?defaultZone:expiry.timeZone,previewExpiry=provisional?expiryDeadline(expiry.mode,expiry.days,expiry.date,previewSentAt,previewZone):{expiresOn:expiry.date,deadlineAt:expiry.deadlineAt},claimed=reminders.runs.filter(r=>r.proposal_id===p.id&&r.revision===p.revision&&r.recipient===reminder?.recipient&&r.kind==='scheduled'),reminderSettings=reminder?JSON.parse(reminder.settings):null,preview={expiryDate:previewExpiry.expiresOn,timeZone:previewZone,provisional,reminders:reminder&&previewSentAt!==null?reminderSlots(reminderSettings,previewSentAt,reminder.time_zone,{date:previewExpiry.expiresOn,deadlineAt:previewExpiry.deadlineAt},reminders.policy).filter(slot=>!claimed.some(r=>r.slot===slot.id)).map(slot=>({...slot,at:afterQuietHours(Math.max(slot.at,logicalNow),reminder.time_zone,reminders.policy)})).filter(slot=>previewExpiry.deadlineAt===null||slot.at<previewExpiry.deadlineAt).slice(0,Math.max(0,reminderSettings.cap-claimed.length)).map(slot=>({slot:slot.id,date:localDate(slot.at,reminder.time_zone)})):[]};const engagement=trackingPolicy.enabled&&['sent','accepted'].includes(p.status)&&(canReport||canWork)?(viewed.some(v=>v.proposal_id===p.id&&v.revision===p.revision)?'viewed':'unopened'):'unavailable';return({...p,...(canWork&&sendIds.has(p.id)?{sms:await smsState(env,a,p.id)}:{}),...(a.role!=='agent'?{recipientLinks:recipientPlan(p).length&&sendIds.has(p.id)?shares.results.filter(s=>s.proposal_id===p.id):[],recipientSignatures:await recipientSignatures(db,p.id,original.revision)}:{}),engagement,...(a.role==='owner'?{engagementDetails:(({settings,...details})=>details)(await engagementDetails(env,a,p.id,false))}:{}),collaboration:a.role==='agent'?undefined:{threads:collaboration.get(p.id)?.threads??[]},collection:a.role==='agent'?undefined:await collectionView(db,p.id,accepted.results.find(x=>x.proposal_id===p.id),a.role==='owner'),collectionPolicy:await collectionPolicy(db,p.id),collectionPolicyEditable:['owner','admin'].includes(a.role),folderId:filing.find(f=>f.proposal_id===p.id)?.folder_id??null,folderVersion:filing.find(f=>f.proposal_id===p.id)?.version??0,folderName:proposalFolderNames.find(f=>f.id===filing.find(f=>f.proposal_id===p.id)?.folder_id)?.name??null,attachmentText:copyAttachmentSearch(p.attachments,pdfText),documentMedia:editors.includes(a.role)?await mediaFiles(db,p.id):[],document:documentOf(p),...(revenueReaders.includes(a.role)?{recordedRevenue:revenue.get(p.id)??{receivedCents:0,refundedCents:0,netReceivedCents:0,uncertainRefundCents:0,exportedDepositCents:0}}:{}),lockedSections:sectionLocks.filter(l=>l.proposal_id===p.id).map(l=>l.section),...(deliveryDefault?{deliveryDefaults:a.role==='agent'?agentDeliveryDefaults(JSON.parse(deliveryDefault.settings)):JSON.parse(deliveryDefault.settings)}:{}),...(costs?{internalPricing:costs}:{}),ownerTimeZone:memberZones.find(m=>m.operator_id===p.sales_owner_id)?.time_zone??defaultZone,approval,canEditExternal:['owner','admin'].includes(a.role),canEdit:editors.includes(a.role),canSend:canWork&&sendIds.has(p.id),canUnlock:['owner','admin','manager'].includes(a.role)&&sendIds.has(p.id),canApprove:approval.steps.some(s=>s.canApprove),awaitingApproval:approval.required&&!approval.complete&&['draft','approved'].includes(p.status),...(a.role!=='agent'?{signerReplacements:replacements.filter(m=>m.proposal_id===p.id),invitationMessages:invitationMessages.filter(m=>m.proposal_id===p.id)}:{}),testMail:testMail.filter(t=>t.proposal_id===p.id&&(a.role==='owner'||t.actor_id===a.id)),activeWithdrawal:withdrawn,outcomes:outcomes.filter(o=>o.proposal_id===p.id),withdrawals:withdrawals.filter(w=>w.proposal_id===p.id),questions:questions.filter(q=>q.proposal_id===p.id),expiry,status:withdrawn&&!p.negotiating?'withdrawn':expiry.expired&&!p.negotiating?'expired':p.status,pipelineStatus:withdrawn?(outcomes.find(o=>o.proposal_id===p.id&&o.revision===original.revision)?.kind??'withdrawn'):expiry.expired?'expired':approval.required&&!approval.complete&&['draft','approved'].includes(p.status)?'awaiting-approval':p.status==='sent'&&engagement==='viewed'?'viewed':p.status,pdfDownloadsEnabled:pdf.settings.find(r=>r.proposal_id===p.id)?.enabled!==0,pdfDownloads:pdf.downloads.filter(r=>r.proposal_id===p.id),attachments:typeof p.attachments==='string'?JSON.parse(p.attachments):p.attachments??[],...await suggestionState(db,p.id),...(a.role!=='agent'?{deliveryPreview:preview,deliveryChanges:deliveryChanges.filter(c=>c.proposal_id===p.id)}:{}),reminderSettings:a.role==='agent'?null:reminders.settings.find(s=>s.proposal_id===p.id)??null,reminderRuns:a.role==='agent'?[]:reminders.runs.filter(r=>r.proposal_id===p.id),reminderOptouts:a.role==='agent'?[]:reminders.optouts.filter(r=>r.proposal_id===p.id),mailReplies:a.role==='agent'?[]:mailReplies.filter(m=>m.proposal_id===p.id),mailAttributions:mailAttributions.filter(m=>m.proposal_id===p.id),deliveries:delivery.deliveries.filter(d=>d.proposal_id===p.id),delivery:delivery.deliveries.find(d=>d.proposal_id===p.id)?.status??deliveries.find(d=>d.proposal_id===p.id)?.status,preparedByName:p.prepared_by.startsWith('agent:')?'Agent':p.prepared_by,options:typeof p.options==='string'?JSON.parse(p.options):p.options,acceptance:accepted.results.find(x=>x.proposal_id===p.id)?{...acceptanceView(accepted.results.find(x=>x.proposal_id===p.id)),...paperView(papers.find(x=>x.proposal_id===p.id),a.role!=='agent')}:undefined,invoice:invoices.results.find(x=>x.proposal_id===p.id),shareToken:sendIds.has(p.id)?shares.results.find(x=>x.proposal_id===p.id)?.token:undefined})})),agentKeys:await agentKeys(db,a),importJobs:a.role==='owner'?await importJobs(db,a):[],outbox:a.role==='owner'&&capturesMail(env)?(await db.prepare('SELECT id,proposal_id,recipient,subject,body,status FROM p_mail ORDER BY created_at DESC LIMIT 30').all()).results:[]}
 const followupRecords=canReport||canWork?(await db.prepare('SELECT * FROM p_followups').all<any>()).results:[]
 const notices=canReport||canWork?(await db.prepare('SELECT proposal_id,closed_at FROM p_bounce_notices').all<any>()).results:[]
 return {...result,crmSyncHistory:await syncHistory(env,a),crmDraftSources:['owner','admin'].includes(a.role)?(await db.prepare('SELECT * FROM p_crm_draft_sources').all<any>()).results:[],starterTemplates:starterTemplates(),templates:await templateState(db,a),...(canReport||canWork?{followups:followupQueue(result.proposals,followupRecords,notices,personalTimeZone,logicalNow),followupActions:(await db.prepare('SELECT * FROM p_followup_actions ORDER BY occurred_at,id').all<any>()).results.filter(r=>visible.has(r.proposal_id))}:{})}
}

function copyAttachmentSearch(value:any,rows:any[]){const files=typeof value==='string'?JSON.parse(value):value??[];return files.map((file:any)=>rows.find(row=>row.file_id===file.id)?.content??'').join('\n')}

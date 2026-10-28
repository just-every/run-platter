import { clientLocale, browserLocale } from './locales'
import { recipientPlan, recipientContent } from './recipients'
import { trackingSettings } from './tracking'
import { workspaceDefaults } from './workspace'
import { documentMedia } from './documents/media'
import { installationZone } from './reports/report-state'
import { selectedContent } from './conditional'
import type { Bindings } from '../auth.server'
import { copyAttachments, downloadAttachment } from './attachments'
import { need, snapshot } from './model'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { expiryFor } from './expiry'
import { suggestionState } from './suggestions'
import { pdfEnabled } from './documents/client-pdf'
import { offerSelection, reviewItems } from './selection'
import { renderClient } from './ui/client'
import { previewFrame } from './ui/preview'

/** Transient member views: never create invitation authority or business records. */
export async function previewResponse(request:Request,env:Bindings) {
 const url=new URL(request.url)
 const media=url.pathname.match(/^\/app\/preview\/client\/media\/([\w-]+)$/)
 const file=url.pathname.match(/^\/app\/preview\/client\/attachments\/([\w-]+)$/)
 need(request.method==='GET'&&(['/app/preview','/app/preview/client'].includes(url.pathname)||file||media),'Preview actions cannot be submitted',403)
 const original=await env.DB.prepare('SELECT p.*,lang.locale AS client_locale,c.name AS clientName,c.email AS clientEmail FROM p_proposals p JOIN p_clients c ON c.id=p.client_id LEFT JOIN p_client_locales lang ON lang.proposal_id=p.id WHERE p.id=?').bind(url.searchParams.get('id')??'').first<any>()
 need(original,'Proposal not found',404)
 const pending=await pendingNegotiation(env.DB,original.id),row=negotiatedView(original,pending)
 need(pending||['draft','approved'].includes(row.status),'Preview an unsent revision',409)
 need(row.revision===Number(url.searchParams.get('revision')),'This revision changed. Return to the editor.',409)
 const recipients=recipientPlan(row),recipientId=url.searchParams.get('recipientId')??recipients[0]?.id
 const recipient=recipients.find(r=>r.id===recipientId)
 need(!recipients.length||recipient,'Choose a recipient preview',404)
 if(recipient){row.clientName=recipient.name;row.clientEmail=recipient.email??'Mailbox not assigned';row.client_locale=(await env.DB.prepare('SELECT locale FROM p_recipient_locales WHERE proposal_id=? AND slot_id=?').bind(row.id,recipient.id).first<{locale:string}>())?.locale??row.client_locale}
 if(row.client_locale==='auto')row.client_locale=browserLocale(request.headers.get('accept-language'))
 const progress=recipient?{recipient,clientSlot:recipients.find(r=>r.role==='signer')?.id,signatures:[],signed:false,ready:recipient.group===Math.min(...recipients.filter(r=>['signer','approver','countersigner'].includes(r.role)).map(r=>r.group))}:null
 const content=snapshot(row),optionId=url.searchParams.get('optionId')??content.options[0].id
 if(file){const attachment=copyAttachments(content.attachments).find(item=>item.id===file[1]);need(attachment,'Attachment not found',404);return downloadAttachment(env.DB,attachment)}
 const selection=offerSelection(content.options,content.deposit_bps,optionId,reviewItems(Object.fromEntries(url.searchParams)),content)
 if(media)return await documentMedia(env.DB,selectedContent({...content,id:row.id},optionId,selection.items),media[1])
 const width=url.searchParams.get('width')??'1440'
 need(['1440','390'].includes(width),'Choose desktop or phone width')
 const query=new URLSearchParams({id:row.id,revision:String(row.revision),width,optionId,...(recipient?{recipientId:recipient.id}:{}),...(selection.items.length?{items:JSON.stringify(selection.items.map(({id,quantity}:any)=>({id,quantity})))}:{})})
 if(url.pathname==='/app/preview')return previewFrame(row,width,optionId,query)
 const expiry=await expiryFor(env.DB,row)
 const tracking=await trackingSettings(env.DB)
 const view={recipientProgress:progress,tracking,externalContentEnabled:!tracking.enabled&&Boolean((await workspaceDefaults(env.DB)).externalContentEnabled),...recipientContent(selectedContent(content,optionId,selection.items),progress),selectedOptionId:optionId,selection,...await suggestionState(env.DB,row.id,row.revision),status:'sent',verified:true,timeZone:await installationZone(env.DB),clientEmail:row.clientEmail,preview:{query:query.toString(),recipient:row.clientName,selection},previous:pending?selectedContent(snapshot(original),optionId,selection.items):undefined,pdfDownloadsEnabled:await pdfEnabled(env.DB,row.id),expiry:{...expiry,date:expiry.mode==='days'?null:expiry.date,expired:false,sentAt:null,deadlineAt:null,reopenRequests:[]}}
 const response=renderClient(view,'')
 // Only this member-only document may be framed by its own authenticated wrapper.
 response.headers.set('Content-Security-Policy',response.headers.get('Content-Security-Policy')!.replace("frame-ancestors 'none'","frame-ancestors 'self'"))
 return response
}

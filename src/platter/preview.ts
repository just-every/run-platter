import type { Bindings } from '../auth.server'
import { copyAttachments, downloadAttachment } from './attachments'
import { need, snapshot } from './model'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { expiryFor } from './expiry'
import { suggestionState } from './suggestions'
import { pdfEnabled } from './documents/client-pdf'
import { offerSelection } from './selection'
import { renderClient } from './ui/client'
import { previewFrame } from './ui/preview'

/** Transient member views: never create invitation authority or business records. */
export async function previewResponse(request:Request,env:Bindings) {
 const url=new URL(request.url)
 const file=url.pathname.match(/^\/app\/preview\/client\/attachments\/([\w-]+)$/)
 need(request.method==='GET'&&(['/app/preview','/app/preview/client'].includes(url.pathname)||file),'Preview actions cannot be submitted',403)
 const original=await env.DB.prepare('SELECT p.*,c.name AS clientName,c.email AS clientEmail FROM p_proposals p JOIN p_clients c ON c.id=p.client_id WHERE p.id=?').bind(url.searchParams.get('id')??'').first<any>()
 need(original,'Proposal not found',404)
 const pending=await pendingNegotiation(env.DB,original.id),row=negotiatedView(original,pending)
 need(pending||['draft','approved'].includes(row.status),'Preview an unsent revision',409)
 need(row.revision===Number(url.searchParams.get('revision')),'This revision changed. Return to the editor.',409)
 const content=snapshot(row),optionId=url.searchParams.get('optionId')??content.options[0].id
 if(file){const attachment=copyAttachments(content.attachments).find(item=>item.id===file[1]);need(attachment,'Attachment not found',404);return downloadAttachment(env.DB,attachment)}
 const selection=offerSelection(content.options,content.deposit_bps,optionId)
 const width=url.searchParams.get('width')??'1440'
 need(['1440','390'].includes(width),'Choose desktop or phone width')
 const query=new URLSearchParams({id:row.id,revision:String(row.revision),width,optionId})
 if(url.pathname==='/app/preview')return previewFrame(row,width,optionId,query)
 const expiry=await expiryFor(env.DB,row)
 const view={...content,...await suggestionState(env.DB,row.id,row.revision),status:'sent',verified:true,clientEmail:row.clientEmail,preview:{query:query.toString(),recipient:row.clientName,selection},previous:pending?snapshot(original):undefined,pdfDownloadsEnabled:await pdfEnabled(env.DB,row.id),expiry:{...expiry,date:expiry.mode==='days'?null:expiry.date,expired:false,sentAt:null,deadlineAt:null,reopenRequests:[]}}
 const response=renderClient(view,'')
 // Only this member-only document may be framed by its own authenticated wrapper.
 response.headers.set('Content-Security-Policy',response.headers.get('Content-Security-Policy')!.replace("frame-ancestors 'none'","frame-ancestors 'self'"))
 return response
}

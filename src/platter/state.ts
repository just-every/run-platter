import { businessState } from './business-records'
import { deliveryState } from './delivery'
import { vendorDocuments } from './attachments'
import { suggestionState } from './suggestions'
import { sendRequests } from './send-requests'
import type { Bindings } from '../auth.server'
import { agentKeys } from './credentials'
import { acceptanceView } from './signing'
import { importJobs } from './movein'
import type { Actor } from './model'
import { capturesMail } from './mail'
import { revisionHistory } from './history'
import { negotiatedView } from './negotiation'
export async function state(env:Bindings,a:Actor){const db=env.DB,clients=(await db.prepare('SELECT * FROM p_clients ORDER BY name').all()).results,proposals=(await db.prepare('SELECT p.*,c.name AS clientName,c.email AS clientEmail FROM p_proposals p JOIN p_clients c ON p.client_id=c.id ORDER BY p.created_at DESC').all<any>()).results
 const delivery=await deliveryState(env,a)
 const negotiations=(await db.prepare('SELECT * FROM p_negotiations').all<any>()).results
 const deliveries=(await db.prepare("SELECT proposal_id,status FROM p_mail WHERE subject LIKE 'Your proposal:%' ORDER BY created_at DESC").all<any>()).results
 const [accepted,invoices,shares]=await Promise.all([db.prepare('SELECT * FROM p_acceptances').all<any>(),db.prepare('SELECT id,proposal_id,number,exported_at FROM p_invoices').all<any>(),a.role==='owner'?db.prepare('SELECT proposal_id,token FROM p_shares').all<any>():Promise.resolve({results:[]})])
 return{...await businessState(db,a),actor:a,clients,mailTransport:env.MAIL_PROVIDER,bounceNotices:delivery.bounceNotices,deliveryEventsAvailable:['resend','sendgrid'].includes(env.MAIL_PROVIDER??'')&&Boolean(env.MAIL_WEBHOOK_KEY),vendorDocuments:a.role==='owner'?await vendorDocuments(db):[],sendRequests:a.role==='owner'?await sendRequests(db,a):[],revisions:await revisionHistory(db),proposals:await Promise.all(proposals.map(async original=>{const p=negotiatedView(original,negotiations.find(n=>n.proposal_id===original.id));return({...p,attachments:typeof p.attachments==='string'?JSON.parse(p.attachments):p.attachments??[],...await suggestionState(db,p.id),deliveries:delivery.deliveries.filter(d=>d.proposal_id===p.id),delivery:delivery.deliveries.find(d=>d.proposal_id===p.id)?.status??deliveries.find(d=>d.proposal_id===p.id)?.status,preparedByName:p.prepared_by.startsWith('agent:')?'Agent':p.prepared_by,options:typeof p.options==='string'?JSON.parse(p.options):p.options,acceptance:accepted.results.find(x=>x.proposal_id===p.id)?acceptanceView(accepted.results.find(x=>x.proposal_id===p.id)):undefined,invoice:invoices.results.find(x=>x.proposal_id===p.id),shareToken:shares.results.find(x=>x.proposal_id===p.id)?.token})})),agentKeys:await agentKeys(db,a),importJobs:a.role==='owner'?await importJobs(db,a):[],outbox:a.role==='owner'&&capturesMail(env)?(await db.prepare('SELECT id,proposal_id,recipient,subject,body,status FROM p_mail ORDER BY created_at DESC LIMIT 30').all()).results:[]}
}

import type { Bindings } from '../auth.server'
import { agentKeys } from './credentials'
import { acceptanceView } from './signing'
import { importJobs } from './movein'
import type { Actor } from './model'
import { capturesMail } from './mail'
import { revisionHistory } from './history'
export async function state(env:Bindings,a:Actor){const db=env.DB,clients=(await db.prepare('SELECT * FROM p_clients ORDER BY name').all()).results,proposals=(await db.prepare('SELECT p.*,c.name AS clientName,c.email AS clientEmail FROM p_proposals p JOIN p_clients c ON p.client_id=c.id ORDER BY p.created_at DESC').all<any>()).results
 const deliveries=(await db.prepare("SELECT proposal_id,status FROM p_mail WHERE subject LIKE 'Your proposal:%' ORDER BY created_at DESC").all<any>()).results
 const [accepted,invoices,shares]=await Promise.all([db.prepare('SELECT * FROM p_acceptances').all<any>(),db.prepare('SELECT id,proposal_id,number,exported_at FROM p_invoices').all<any>(),a.role==='owner'?db.prepare('SELECT proposal_id,token FROM p_shares').all<any>():Promise.resolve({results:[]})])
 return{actor:a,clients,revisions:await revisionHistory(db),proposals:proposals.map(p=>({...p,delivery:deliveries.find(d=>d.proposal_id===p.id)?.status,preparedByName:p.prepared_by.startsWith('agent:')?'Agent':p.prepared_by,options:JSON.parse(p.options),acceptance:accepted.results.find(x=>x.proposal_id===p.id)?acceptanceView(accepted.results.find(x=>x.proposal_id===p.id)):undefined,invoice:invoices.results.find(x=>x.proposal_id===p.id),shareToken:shares.results.find(x=>x.proposal_id===p.id)?.token})),agentKeys:await agentKeys(db,a),importJobs:a.role==='owner'?await importJobs(db,a):[],outbox:a.role==='owner'&&capturesMail(env)?(await db.prepare('SELECT id,proposal_id,recipient,subject,body,status FROM p_mail ORDER BY created_at DESC LIMIT 30').all()).results:[]}
}

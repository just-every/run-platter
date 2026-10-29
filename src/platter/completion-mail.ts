import type { Bindings } from '../auth.server'
import { actorById } from './credentials'
import { agreementArtifact } from './documents/agreement'
import { need } from './model'

/** Only a new eligible acceptance can create transport and its local execution grant. */
export function completionMailStatements(env:Bindings,id:string){
 const db=env.DB,writes=[db.prepare(`INSERT INTO p_completion_authority
 SELECT a.proposal_id,a.revision,o.id,o.version,o.email,c.id,c.email,a.email
 FROM p_acceptances a JOIN p_signature_facts f ON f.proposal_id=a.proposal_id AND f.revision=a.revision
 JOIN p_proposals p ON p.id=a.proposal_id JOIN p_clients c ON c.id=p.client_id
 JOIN oa_operators o ON o.role='owner' AND o.status='active'
 WHERE a.proposal_id=? AND f.method='mailbox code' AND f.verified_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM p_recipient_signatures s WHERE s.proposal_id=a.proposal_id AND s.revision=a.revision
                AND (s.method!='mailbox code' OR s.verified_at IS NULL))
 AND COALESCE(json_extract(a.snapshot,'$.collectionPolicy.enabled'),0)=0
 ORDER BY o.id LIMIT 1 ON CONFLICT DO NOTHING`).bind(id)]
 // The accepted plan is the immutable destination list; an owner in that plan receives one copy.
 writes.push(db.prepare(`INSERT INTO p_completion_mail
 SELECT lower(hex(randomblob(16))),g.proposal_id,g.revision,'recipient:'||json_extract(r.value,'$.id'),json_extract(r.value,'$.email')
 FROM p_completion_authority g JOIN p_acceptances a ON a.proposal_id=g.proposal_id,
 json_each(a.snapshot,'$.recipient_plan') r
 WHERE g.proposal_id=? AND json_extract(r.value,'$.email') IS NOT NULL ON CONFLICT DO NOTHING`).bind(id))
 writes.push(db.prepare(`INSERT INTO p_completion_mail
 SELECT lower(hex(randomblob(16))),g.proposal_id,g.revision,'client',g.recipient
 FROM p_completion_authority g JOIN p_acceptances a ON a.proposal_id=g.proposal_id
 WHERE g.proposal_id=? AND json_array_length(COALESCE(json_extract(a.snapshot,'$.recipient_plan'),'[]'))=0
 ON CONFLICT DO NOTHING`).bind(id))
 writes.push(db.prepare(`INSERT INTO p_completion_mail
 SELECT lower(hex(randomblob(16))),g.proposal_id,g.revision,'firm',g.firm_email
 FROM p_completion_authority g WHERE g.proposal_id=?
 AND NOT EXISTS(SELECT 1 FROM p_completion_mail m WHERE m.proposal_id=g.proposal_id AND m.recipient=g.firm_email)
 ON CONFLICT DO NOTHING`).bind(id))
 writes.push(db.prepare(`INSERT INTO p_mail(id,proposal_id,recipient,subject,body,status,created_at,sender_id,provider,proposal_revision)
 SELECT m.mail_id,a.proposal_id,m.recipient,
 'Agreement complete: '||json_extract(a.snapshot,'$.title'),
 'The signed agreement PDF and certificate of completion for revision '||a.revision||' are attached.',
 ?,a.accepted_at,g.owner_id,?,a.revision
 FROM p_completion_mail m JOIN p_completion_authority g ON g.proposal_id=m.proposal_id
 JOIN p_acceptances a ON a.proposal_id=m.proposal_id AND a.revision=m.revision
 WHERE m.proposal_id=? AND m.recipient IS NOT NULL ON CONFLICT DO NOTHING`).bind(env.AUTH_LOCAL==='true'&&env.RER_DEMO!=='1'?'local':'pending',env.MAIL_PROVIDER??null,id))
 return writes
}

export async function completionAuthority(env:Bindings,row:any){
 const ref=await env.DB.prepare('SELECT * FROM p_completion_mail WHERE mail_id=?').bind(row.id).first<any>()
 if(!ref)return null
 const grant=await env.DB.prepare(`SELECT g.* FROM p_completion_authority g
 JOIN p_acceptances a ON a.proposal_id=g.proposal_id AND a.revision=g.revision
 JOIN p_proposals p ON p.id=a.proposal_id AND p.revision=a.revision AND p.status='accepted'
 JOIN p_clients c ON c.id=g.client_id AND c.id=p.client_id AND c.email=g.client_email
 JOIN oa_operators o ON o.id=g.owner_id AND o.version=g.owner_version AND o.email=g.firm_email AND o.role='owner' AND o.status='active'
 WHERE g.proposal_id=? AND g.revision=? AND a.email=g.recipient`).bind(ref.proposal_id,ref.revision).first<any>()
 need(grant&&row.proposal_id===ref.proposal_id&&row.proposal_revision===ref.revision&&row.sender_id===grant.owner_id&&row.recipient===(ref.recipient??(ref.party==='client'?grant.recipient:grant.firm_email)),'Completion mail authority changed; restored history never sends',403)
 return grant
}

export async function completionAttachments(env:Bindings,row:any){
 const grant=await completionAuthority(env,row)
 if(!grant)return undefined
 const actor=await actorById(env.DB,grant.owner_id);need(actor,'The completion sender is no longer active',403)
 // Download, Drive archiving and both messages resolve this same immutable row.
 await agreementArtifact(env,row.proposal_id,'certificate.json',{actor})
 const saved=await env.DB.prepare('SELECT * FROM p_agreement_artifacts WHERE proposal_id=? AND revision=?').bind(row.proposal_id,row.proposal_revision).first<any>()
 need(saved,'The retained completion artifacts are unavailable',409)
 await completionAuthority(env,row)
 return [{filename:'agreement.pdf',contentType:'application/pdf',content:new Uint8Array(saved.document),disposition:'attachment' as const},{filename:'certificate.pdf',contentType:'application/pdf',content:new Uint8Array(saved.certificate),disposition:'attachment' as const}]
}

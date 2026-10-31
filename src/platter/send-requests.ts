import { commit, need, proposal, type Actor } from './model'
import { recordAudit } from './audit'
import type { SendRequestFacts } from './agent-classification'

export async function requestSend(db: D1Database, actor: Actor, input: Record<string, any>) {
 const current = await proposal(db, input.id)
 need(['draft', 'approved'].includes(current.status) && current.revision === input.revision, 'Request the current draft or approved revision', 409)
 const guard = { sql: "EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND revision=? AND status IN ('draft','approved'))", values: [current.id, input.revision] }
 await commit(db, actor, [db.prepare("INSERT INTO p_send_requests(id,proposal_id,revision,requested_version,owner_id,agent_key_id,requested_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(proposal_id,revision,agent_key_id) WHERE status='pending' DO NOTHING")
  .bind(crypto.randomUUID(), current.id, current.revision, current.version, actor.id, actor.keyId!, Date.now())], false, guard)
 const request = await db.prepare("SELECT * FROM p_send_requests WHERE proposal_id=? AND revision=? AND agent_key_id=? AND status='pending'").bind(current.id, current.revision, actor.keyId!).first<SendRequestFacts>()
 need(request, 'Saved send request not found. Reload before trying again.', 409)
 return { request, message: 'Queued for owner review. Approval and sending remain owner actions.' }
}

export async function sendRequests(db: D1Database, actor: Actor) {
 need(actor.role === 'owner', 'Only the owner reads send requests', 403)
 return (await db.prepare(`SELECT r.*,p.title,p.revision AS current_revision,p.version AS current_version,p.status AS proposal_status,
 CASE WHEN r.status='pending' AND r.revision=p.revision AND p.status IN ('draft','approved') THEN 1 ELSE 0 END AS actionable
 FROM p_send_requests r JOIN p_proposals p ON p.id=r.proposal_id WHERE r.owner_id=? ORDER BY r.requested_at DESC,r.id`).bind(actor.id).all<any>()).results
}

export async function resolveSendRequest(db: D1Database, actor: Actor, input: Record<string, unknown>) {
 need(actor.role === 'owner', 'Only the owner resolves send requests', 403)
 need(typeof input.id === 'string' && ['dismissed', 'fulfilled'].includes(String(input.status)), 'Choose a request and resolution')
 const row = await db.prepare('SELECT * FROM p_send_requests WHERE id=? AND owner_id=?').bind(input.id, actor.id).first<any>()
 need(row, 'Send request not found', 404)
 if (row.status === input.status) return row
 need(row.status === 'pending', 'This request was already resolved', 409)
 const sent = input.status === 'fulfilled' ? " AND EXISTS(SELECT 1 FROM p_proposals WHERE id=p_send_requests.proposal_id AND revision=p_send_requests.revision AND status IN ('sent','accepted'))" : ''
 await commit(db, actor, [db.prepare('UPDATE p_send_requests SET status=?,resolved_at=?,resolved_by=? WHERE id=? AND owner_id=?').bind(input.status, Date.now(), actor.id, row.id, actor.id)], true,
  { sql: `EXISTS(SELECT 1 FROM p_send_requests WHERE id=? AND owner_id=? AND status='pending'${sent})`, values: [row.id, actor.id] })
 await recordAudit(db, actor, `mcp.send_request.${input.status}`, row.proposal_id)
 return { ...row, status: input.status }
}


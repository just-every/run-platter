import type { Bindings } from '../../auth.server'
import { need, snapshot, type Actor } from '../model'
import { permitted, scope } from '../permissions'
import { templateState } from '../templates'
import { starterTemplates } from '../starter-templates'

export async function proposalRead(env: Bindings, a: Actor, id: unknown) {
 const p = await permitted(env.DB, a, id)
 const preparedBy=await env.DB.prepare('SELECT agent_id AS agentId,agent_name AS agentName,sponsor_id AS sponsorId,sponsor_name AS sponsorName,label FROM p_agent_preparations WHERE proposal_id=? AND revision=?').bind(p.id,p.revision).first()
 return { ...snapshot(p), preparedBy, version: p.version, status: p.status, prepared_by: p.prepared_by, approved_by: p.approved_by, approved_at: p.approved_at }
}
export async function proposalSearch(env: Bindings, a: Actor, input: Record<string, any>) {
 const visibility = scope(a, 'view'), query = String(input.query ?? '').toLowerCase(), limit = Number(input.limit ?? 50)
 const rows = (await env.DB.prepare(`SELECT p.id,p.title,p.scope,p.client_id AS clientId,c.name AS clientName,p.status,p.revision,p.version FROM p_proposals p JOIN p_clients c ON c.id=p.client_id WHERE (${visibility.sql}) ORDER BY p.created_at DESC,p.id`).bind(...visibility.values).all<any>()).results
 const found = rows.filter(p => (!input.status || p.status === input.status) && `${p.title}\n${p.scope}\n${p.clientName}`.toLowerCase().includes(query))
 const clients = (await env.DB.prepare('SELECT id,name,email FROM p_clients ORDER BY name,id').all<any>()).results.filter(c => `${c.name}\n${c.email}`.toLowerCase().includes(query))
 return { proposals: found.slice(0, limit).map(({scope: _scope, ...p}) => p), clients: clients.slice(0, limit), proposalCount: found.length, clientCount: clients.length }
}
export async function templatesSearch(env: Bindings, a: Actor, input: Record<string, any>) {
 const query = String(input.query ?? '').toLowerCase()
 return { templates: [...starterTemplates(), ...await templateState(env.DB, a)].filter(t => t.name.toLowerCase().includes(query)).map(t => ({id:t.id,name:t.name,version:t.version})) }
}
export async function engagementRead(env: Bindings, a: Actor, id: unknown) {
 const p = await permitted(env.DB, a, id)
 const delivery = await env.DB.prepare('SELECT status FROM p_mail WHERE proposal_id=? ORDER BY created_at DESC LIMIT 1').bind(p.id).first<any>()
 // Tracking recipient identities and public signing credentials are never MCP data.
 return { id:p.id, revision:p.revision, status:p.status, delivery:delivery?.status ?? null,
  acceptance: await env.DB.prepare('SELECT accepted_at FROM p_acceptances WHERE proposal_id=?').bind(p.id).first(),
  viewTracking:{available:false,reason:'View detail is available only to the signed-in owner.'}, sectionReading:{available:false,reason:'Section-level reading analytics are not implemented.'} }
}
export async function workspaceSnapshot(env: Bindings, a: Actor) {
 const visibility = scope(a, 'view')
 const proposals = (await env.DB.prepare(`SELECT p.id,p.client_id,p.title,p.scope,p.version,p.revision,p.status,p.options,p.prepared_by,p.approved_by FROM p_proposals p WHERE (${visibility.sql}) ORDER BY p.id`).bind(...visibility.values).all()).results
 const requests = (await env.DB.prepare(`SELECT r.* FROM p_send_requests r JOIN p_proposals p ON p.id=r.proposal_id WHERE (${visibility.sql}) AND r.owner_id=? ORDER BY r.id`).bind(...visibility.values,a.id).all()).results
 return {proposals, requests}
}

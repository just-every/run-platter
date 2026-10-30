import { operatorAuth, authConfig, type Bindings } from '../../auth.server'
import { operatorAuthPeople, type Person, type ToolContext } from '../../base/modules/agent-door/index.ts'
import { actorById } from '../credentials'
import { need, type Actor } from '../model'

export function nativePeople(env: Bindings) {
 const native = operatorAuthPeople({ db: env.DB, allowList: authConfig(env).allowList, session: request => operatorAuth(env).getSession(request) })
 const policyRoles=new Map<string,'owner'|'editor'|null>()
 const person = async (id: string): Promise<Person | null> => {
  const p = await native.person(id), actor = await actorById(env.DB, id)
  if (!p || !actor) return null
  const pending = await env.DB.prepare("SELECT 1 FROM p_member_invitations WHERE email=? AND status='pending'").bind(p.email).first()
  const member=await native.businessMember?.(p)
  policyRoles.set(p.id,member?.role??(!env.RER_BUSINESS_TRUST&&p.role==='owner'?'owner':null))
  return { ...p, role: actor.role, active: p.active && !pending && ['owner','admin','member'].includes((await env.DB.prepare('SELECT role FROM oa_operators WHERE id=?').bind(id).first<{role:string}>())?.role ?? '') }
 }
 return { ...native, person,
  async sponsor(claims: {sub: string}) { const p = await native.sponsor(claims); return p ? person(p.id) : null },
  async session(request: Request) { const p = await native.session(request); return p ? person(p.id) : null },
  // A native promotion never makes a Business editor. Paired approval references
  // are resolved by native.businessMember from signed settings, not this role.
  businessRole: (p: Person) => policyRoles.get(p.id)??null,
 }
}

export async function nativeActor(env: Bindings, ctx: ToolContext): Promise<Actor> {
 const a = await actorById(env.DB, ctx.person.id)
 need(a, 'Sponsor unavailable', 401)
 const state = await env.DB.prepare('SELECT envelope,local_document,local_revision,local_paused FROM agent_door_state WHERE id=1').first<any>()
 need(state, 'Company policy required', 403)
 const signed=state.envelope?JSON.parse(state.envelope):null
 need(!state.local_paused&&!signed?.paused,'Agents paused',403)
 need(!signed?.revoked?.agents?.includes(ctx.agent.id)&&(!ctx.consent||!signed?.revoked?.consents?.includes(ctx.consent)),'Consent or agent revoked',401)
 if(env.RER_OWNER_CLAIM_PUBLIC_KEYS)need(signed?.document&&signed.exp*1000>Date.now(),'Company policy unavailable',403)
 // Fence policy, Pause, revocation and native role/grants in the SAME batch as
 // every native mutation. The door has already checked consent and scopes.
 const guards = ["EXISTS(SELECT 1 FROM agent_door_state WHERE id=1 AND local_paused=0 AND envelope IS ? AND local_document IS ? AND local_revision=?)", "EXISTS(SELECT 1 FROM agent_door_agents WHERE id=? AND sponsor=? AND revoked=0)"]
 const values: any[] = [state.envelope, state.local_document, state.local_revision, ctx.agent.id, a.id]
 if (ctx.clientId?.startsWith('platter-key:')) {
  guards.push("EXISTS(SELECT 1 FROM p_agent_keys k JOIN oa_operators o ON o.id=k.owner_id WHERE k.id=? AND k.owner_id=? AND k.revoked_at IS NULL AND k.expires_at>? AND o.status='active' AND o.role='owner' AND o.version=k.owner_version AND NOT EXISTS(SELECT 1 FROM p_rest_keys WHERE key_id=k.id))")
  values.push(ctx.clientId.slice('platter-key:'.length), a.id, Date.now())
 }
 a.agent = { id: ctx.agent.id, name: ctx.agent.name, label: ctx.actor.label, sponsorName:ctx.person.name, operationId: ctx.operationId }
 if(ctx.clientId?.startsWith('platter-key:')){a.role='agent';a.keyId=ctx.clientId.slice('platter-key:'.length)}
 a.agentFence = { sql: guards.map(g => '(' + g + ')').join(' AND '), values }
 return a
}

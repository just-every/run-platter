import type { Bindings } from '../../auth.server'
import { actorById } from '../credentials'
import { providerCredential } from '../connections'
import { currentTime } from '../expiry-time'
import { commit, hash, need, text, type Actor } from '../model'
import { canonical } from './hubspot-draft'
import { providerProposal, providerSyncPlan, performProviderWrite, type CrmProvider, type ProviderOperation } from './provider-sync-plan'

function guard(review: any) {
 return { sql: "EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id=? AND c.account_id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL) AND EXISTS(SELECT 1 FROM p_proposals p WHERE p.id=? AND p.version=? AND p.revision=? AND NOT EXISTS(SELECT 1 FROM p_negotiations n WHERE n.proposal_id=p.id))", values: ['workspace:' + review.provider, review.account_id, review.connection_version, review.proposal_id, review.proposal_version, review.revision] as any[] }
}
export async function providerSyncCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>, provider: CrmProvider) {
 need(['crm.' + provider + '.sync.review', 'crm.' + provider + '.sync.apply'].includes(name), 'Unknown CRM synchronization action', 404)
 const db = env.DB, at = await currentTime(db)
 if (name.endsWith('.review')) {
  if (typeof input.proposalChoice === 'string') { const [proposalId, version] = input.proposalChoice.split(':'); input = { ...input, proposalId, version } }
  const { row, connection, remote, plan } = await providerSyncPlan(env, actor, input, provider)
  const planJson = canonical(plan), digest = await hash(planJson + '\n' + remote), id = crypto.randomUUID()
  const review = { provider, account_id: connection.account_id, connection_version: connection.version, proposal_id: row.id, proposal_version: row.version, revision: row.revision }
  await commit(db, actor, [db.prepare('INSERT INTO p_crm_provider_reviews(id,provider,proposal_id,actor_id,actor_role,actor_version,connection_version,account_id,proposal_version,revision,plan_json,source_json,digest,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, provider, row.id, actor.id, actor.role, actor.memberVersion ?? 0, connection.version, connection.account_id, row.version, row.revision, planJson, remote, digest, at)], true, guard(review))
  return { id, digest, crmProviderSyncReview: true, plan }
 }
 need(name.endsWith('.apply'), 'Unknown CRM synchronization action', 404)
 need(input.consent === true || input.consent === 'yes', 'Explicitly authorize these exact CRM writes')
 const review = await db.prepare('SELECT * FROM p_crm_provider_reviews WHERE id=? AND provider=? AND actor_id=?').bind(text(input.id, 'a CRM review'), provider, actor.id).first<any>()
 need(review && !review.consumed_at && review.created_at > at - 900000, 'Review expired or was already consumed; review again', 409)
 await providerProposal(env, actor, review.proposal_id, provider)
 need(review.digest === input.digest && review.actor_role === actor.role && review.actor_version === (actor.memberVersion ?? 0), 'Reviewed bytes or authority changed; review again', 409)
 const plan = JSON.parse(review.plan_json)
 const current = await providerSyncPlan(env, actor, { proposalId: review.proposal_id, version: review.proposal_version, ...plan.mapping }, provider)
 need(current.connection.version === review.connection_version && canonical(current.plan) === review.plan_json && current.remote === review.source_json, 'The proposal, connection, mapping or destination changed after review', 409)
 need(!await db.prepare("SELECT 1 FROM p_crm_provider_attempts WHERE provider=? AND account_id=? AND deal_id=? AND status!='confirmed'").bind(provider, review.account_id, plan.dealId).first(), 'Reconcile the uncertain provider write before authorizing further writes', 409)
 const execution = guard(review)
 execution.sql += ' AND EXISTS(SELECT 1 FROM p_crm_provider_reviews WHERE id=? AND consumed_at IS NULL)'
 execution.values.push(review.id)
 await commit(db, actor, [db.prepare('UPDATE p_crm_provider_reviews SET consumed_at=? WHERE id=?').bind(at, review.id), db.prepare('INSERT INTO p_crm_provider_consents(id,provider,proposal_id,revision,account_id,deal_id,actor_id,actor_role,connection_version,source_json,plan_json,digest,authorized_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(review.id, provider, review.proposal_id, review.revision, review.account_id, plan.dealId, actor.id, actor.role, review.connection_version, review.source_json, review.plan_json, review.digest, at)], true, execution)
 let confirmed = 0, held = 0
 for (const operation of plan.operations as ProviderOperation[]) {
  const previous = await db.prepare('SELECT status FROM p_crm_provider_attempts WHERE provider=? AND account_id=? AND deal_id=? AND operation_key=?').bind(provider, review.account_id, plan.dealId, operation.key).first<any>()
  if (previous?.status === 'confirmed') { confirmed++; continue }
  if (previous) { held++; break }
  const id = crypto.randomUUID()
  try {
   await commit(db, actor, [db.prepare("INSERT INTO p_crm_provider_attempts(id,provider,review_id,proposal_id,revision,account_id,deal_id,operation_key,request_json,status,attempted_by,attempted_at) VALUES(?,?,?,?,?,?,?,?,?,'sending',?,?)").bind(id, provider, review.id, review.proposal_id, review.revision, review.account_id, plan.dealId, operation.key, canonical(operation), actor.id, await currentTime(db))], true, guard(review))
  } catch { held++; break }
  try {
   const liveActor = await actorById(db, actor.id)
   need(liveActor && liveActor.role === review.actor_role && (liveActor.memberVersion ?? 0) === review.actor_version, 'CRM authority changed', 409)
   const live = await providerProposal(env, liveActor, review.proposal_id, provider)
   need(live.connection.version === review.connection_version && live.row.version === review.proposal_version, 'CRM destination or proposal changed', 409)
   const { secret } = await providerCredential(env, 'workspace:' + provider)
   const providerId = await performProviderWrite(provider, operation, secret.token)
   await db.prepare("UPDATE p_crm_provider_attempts SET status='confirmed',provider_id=?,confirmed_at=? WHERE id=?").bind(providerId, await currentTime(db), id).run()
   confirmed++
  } catch {
   await db.prepare("UPDATE p_crm_provider_attempts SET status='uncertain' WHERE id=?").bind(id).run()
   held++; break
  }
 }
 return { crmProviderSyncResult: true, provider, proposalId: review.proposal_id, confirmed, held, message: held ? 'Synchronization held. Inspect receipts and reconcile the provider before further writes.' : 'Reviewed CRM writes confirmed.' }
}
export async function providerSyncHistory(env: Bindings, actor: Actor) {
 if (!['owner', 'admin'].includes(actor.role)) return []
 return (await env.DB.prepare('SELECT * FROM p_crm_provider_attempts ORDER BY attempted_at,id').all<any>()).results
}

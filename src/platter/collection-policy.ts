import type { Bindings } from '../auth.server'
import { commit, exact, need, type Actor } from './model'
import { administrators, permitted, senders } from './permissions'

export const collectionMethods = ['card', 'ach', 'apple_pay', 'google_pay'] as const
export type CollectionMethod = typeof collectionMethods[number]
export type CollectionCompletion = 'required' | 'due'
export type CollectionPolicy = { enabled: boolean; completion: CollectionCompletion | 'off'; methods: CollectionMethod[] }

export function methodsInput(value: unknown): CollectionMethod[] {
 let methods = value
 if (typeof methods === 'string') {
  try { methods = JSON.parse(methods) } catch { need(false, 'Choose payment methods') }
 }
 need(Array.isArray(methods) && methods.length <= collectionMethods.length && methods.every(m => collectionMethods.includes(m)) && new Set(methods).size === methods.length, 'Choose distinct supported payment methods')
 return methods as CollectionMethod[]
}

async function savedSettings(db: D1Database, id: string) {
 const row = await db.prepare('SELECT settings FROM p_proposal_defaults WHERE proposal_id=?').bind(id).first<any>()
 return { settings: row ? JSON.parse(row.settings) as Record<string, any> : {}, serialized: row?.settings ?? null }
}

export async function collectionPolicy(db: D1Database, id: string): Promise<CollectionPolicy> {
 const policy = await db.prepare('SELECT completion FROM p_collection_policy WHERE proposal_id=?').bind(id).first<{completion: CollectionCompletion}>()
 const { settings } = await savedSettings(db, id)
 return { enabled: Boolean(policy), completion: policy?.completion ?? 'off', methods: methodsInput(settings.paymentMethods ?? []) }
}

export async function collectionPolicyCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 need(name === 'payment.collection', 'Unknown collection action', 404)
 need(senders.includes(actor.role), 'Your role cannot configure deposit collection', 403)
 const db = env.DB, row = await permitted(db, actor, input.id, 'send')
 exact(row, input)
 need(['draft', 'approved'].includes(row.status), 'Configure collection before sending the proposal', 409)
 const old = await collectionPolicy(db, row.id)
 const completion = input.completion === undefined ? old.completion : input.completion
 need(completion === 'off' || completion === 'required' || completion === 'due', 'Choose off, required or due collection')
 if (completion !== old.completion) need(administrators.includes(actor.role), 'Only owner and admins change the deposit completion policy', 403)
 const { settings, serialized } = await savedSettings(db, row.id), fields = Object.keys(input).filter(k => k.startsWith('method:'))
 const methods = input.paymentMethods === undefined
  ? input.methodsProvided === 'yes' || fields.length
   ? methodsInput(fields.filter(k => input[k] === 'yes').map(k => k.slice(7)))
   : methodsInput(settings.paymentMethods ?? [])
  : methodsInput(input.paymentMethods)
 need(completion === 'off' || methods.length > 0, 'Choose at least one payment method before enabling collection')
 const writes = [
  db.prepare('INSERT INTO p_proposal_defaults(proposal_id,settings) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET settings=excluded.settings').bind(row.id, JSON.stringify({ ...settings, paymentMethods: methods })),
  db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),
 ]
 if (completion !== old.completion) writes.push(completion === 'off'
  ? db.prepare('DELETE FROM p_collection_policy WHERE proposal_id=?').bind(row.id)
  : db.prepare('INSERT INTO p_collection_policy(proposal_id,completion) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET completion=excluded.completion').bind(row.id, completion))
 await commit(db, actor, writes, false, {
  sql: "EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved')) AND COALESCE((SELECT completion FROM p_collection_policy WHERE proposal_id=?),'off')=? AND (SELECT settings FROM p_proposal_defaults WHERE proposal_id=?) IS ?",
  values: [row.id, row.version, row.id, old.completion, row.id, serialized],
 })
 return { id: row.id, version: row.version + 1, collectionPolicy: { enabled: completion !== 'off', completion, methods } }
}

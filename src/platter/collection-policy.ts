import type { Bindings } from '../auth.server'
import { commit, exact, need, type Actor } from './model'
import { providerCredential } from './connections'
import { administrators, permitted, senders } from './permissions'

export const collectionMethods = ['card', 'ach', 'apple_pay', 'google_pay', 'paypal'] as const
export type CollectionMethod = typeof collectionMethods[number]
export type CollectionCompletion = 'required' | 'due'
export type CollectionPolicy = { enabled: boolean; completion: CollectionCompletion | 'off'; methods: CollectionMethod[]; provider?: 'paypal'; merchantId?: string; connectionVersion?: number }

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
 const paypal = await db.prepare('SELECT * FROM p_paypal_selection WHERE proposal_id=?').bind(id).first<any>()
 return { enabled: Boolean(policy), completion: policy?.completion ?? 'off', methods: methodsInput(settings.paymentMethods ?? []), ...(paypal ? {provider:'paypal' as const,merchantId:paypal.merchant_id,connectionVersion:paypal.connection_version} : {}) }
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
 const provider = input.provider ?? old.provider ?? 'stripe'
 need(provider==='stripe'||provider==='paypal','Choose a supported payment provider')
 const changingProvider=provider!==(old.provider??'stripe')
 if(changingProvider||provider==='paypal')need(administrators.includes(actor.role),'Only owner and admins select the deposit merchant',403)
 let paypal:any
 if(provider==='paypal'&&completion!=='off'){
  need(methods.length===1&&methods[0]==='paypal','Select PayPal as the only payment method')
  need(!row.payment_terms&&(!row.recipient_plan||row.recipient_plan==='[]')&&row.currency==='USD','PayPal currently requires a one-off USD agreement with one client',409)
  const {connection}=await providerCredential(env,'workspace:paypal')
  need(input.merchantId===connection.account_id&&Number(input.connectionVersion)===connection.version,'Select the current verified PayPal merchant',409)
  need(input.consent===true||input.consent==='yes','Explicitly authorize this PayPal merchant for this proposal')
  const person=await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(actor.id).first<any>()
  paypal={connection,person}
 }else need(!methods.includes('paypal')||completion==='off','Choose Stripe payment methods')
 need(completion === 'off' || methods.length > 0, 'Choose at least one payment method before enabling collection')
 const writes = [
  db.prepare('INSERT INTO p_proposal_defaults(proposal_id,settings) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET settings=excluded.settings').bind(row.id, JSON.stringify({ ...settings, paymentMethods: methods })),
  db.prepare('UPDATE p_proposals SET version=version+1 WHERE id=?').bind(row.id),
 ]
 if(paypal){
  const c=paypal.connection
  writes.push(db.prepare('INSERT INTO p_paypal_selection(proposal_id,merchant_id,connection_version) VALUES(?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET merchant_id=excluded.merchant_id,connection_version=excluded.connection_version').bind(row.id,c.account_id,c.version),db.prepare('INSERT INTO p_paypal_authority(proposal_id,merchant_id,connection_version,actor_id,actor_version,actor_role,member_version) VALUES(?,?,?,?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET merchant_id=excluded.merchant_id,connection_version=excluded.connection_version,actor_id=excluded.actor_id,actor_version=excluded.actor_version,actor_role=excluded.actor_role,member_version=excluded.member_version').bind(row.id,c.account_id,c.version,actor.id,paypal.person.version,actor.role,actor.memberVersion??0))
 }else if(provider==='stripe'||completion==='off')writes.push(db.prepare('DELETE FROM p_paypal_selection WHERE proposal_id=?').bind(row.id),db.prepare('DELETE FROM p_paypal_authority WHERE proposal_id=?').bind(row.id))
 if (completion !== old.completion) writes.push(completion === 'off'
  ? db.prepare('DELETE FROM p_collection_policy WHERE proposal_id=?').bind(row.id)
  : db.prepare('INSERT INTO p_collection_policy(proposal_id,completion) VALUES(?,?) ON CONFLICT(proposal_id) DO UPDATE SET completion=excluded.completion').bind(row.id, completion))
 await commit(db, actor, writes, false, {
  sql: "EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status IN ('draft','approved')) AND COALESCE((SELECT completion FROM p_collection_policy WHERE proposal_id=?),'off')=? AND (SELECT settings FROM p_proposal_defaults WHERE proposal_id=?) IS ?"+(paypal?" AND EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id='workspace:paypal' AND c.status='connected' AND c.account_id=? AND c.version=?)":''),
  values: [row.id, row.version, row.id, old.completion, row.id, serialized,...(paypal?[paypal.connection.account_id,paypal.connection.version]:[])],
 })
 return { id: row.id, version: row.version + 1, collectionPolicy: { enabled: completion !== 'off', completion, methods } }
}

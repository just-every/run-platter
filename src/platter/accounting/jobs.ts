import type { Bindings } from '../../auth.server'
import { providerCredential } from '../connections'
import { commit, hash, need, text, type Actor } from '../model'
import { currentTime } from '../expiry-time'
import { administrators } from '../permissions'
import { customerMatches, itemMapping, providerId, quickbooks, type QuickBooksAuthority } from './quickbooks'

const canonical = (value: any): string => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v)
const live = `SELECT s.* FROM p_accounting_settings s JOIN p_accounting_authority g ON g.singleton=s.singleton AND g.version=s.version
 JOIN oa_operators o ON o.id=s.authorized_by AND o.role='owner' AND o.status='active' AND o.version=g.operator_version
 LEFT JOIN p_members m ON m.operator_id=o.id
 JOIN p_connections c ON c.id='workspace:quickbooks' AND c.status='connected' AND c.broken_at IS NULL AND c.version=s.connection_version AND c.account_id=s.account_id
 JOIN p_connection_secrets secret ON secret.connection_id=c.id WHERE COALESCE(m.version,0)=g.member_version`
async function configuration(env: Bindings) {
 const config = await env.DB.prepare(live).first<any>()
 need(config, 'The owner must authorize the current verified QuickBooks company first', 409)
 return config
}
function configGuard(config: any) { return { sql: `EXISTS(SELECT 1 FROM (${live}) current WHERE current.version=? AND current.account_id=? AND current.connection_version=?)`, values: [config.version, config.account_id, config.connection_version] } }
async function operatorVersion(db: D1Database, id: string) { return (await db.prepare('SELECT version FROM oa_operators WHERE id=?').bind(id).first<any>())?.version }
function reader(env: Bindings, actor: Actor, config: any): QuickBooksAuthority { return async () => {
 await commit(env.DB, actor, [], false, configGuard(config))
 const { connection, secret } = await providerCredential(env, 'workspace:quickbooks')
 need(connection.version === config.connection_version && connection.account_id === config.account_id, 'QuickBooks connection changed', 409)
 return { token: secret.token, company: connection.account_id }
} }
async function planFor(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 const db = env.DB, id = text(input.proposalId, 'an accepted proposal'), config = await configuration(env)
 const row = await db.prepare(`SELECT a.*,p.version AS proposal_version,p.client_id,p.status,f.method FROM p_acceptances a
 JOIN p_proposals p ON p.id=a.proposal_id JOIN p_clients c ON c.id=p.client_id
 JOIN p_signature_facts f ON f.proposal_id=a.proposal_id AND f.revision=a.revision WHERE a.proposal_id=?`).bind(id).first<any>()
 need(row?.status === 'accepted' && row.method === 'mailbox code', 'Review a mailbox-verified accepted agreement', 409)
 const snap = JSON.parse(row.snapshot), selection = snap.selection
 need(row.currency === 'USD' && !selection?.tax && !snap.options?.some((o: any) => o.tax), 'Only tax-free USD deposits are supported; accounting tax propagation is not available', 409)
 need(!snap.recipient_plan?.length && !snap.collectionPolicy?.enabled, 'Only single-client agreements with collection off are supported', 409)
 need(!selection?.fees?.recurring?.length && !selection?.recurring && !selection?.recurringFees && !JSON.stringify(selection ?? {}).includes('"recurrence"') && !snap.options?.find((o: any) => o.id === row.option_id)?.recurrence, 'Recurring pricing requires future accounting support', 409)
 need(Number.isSafeInteger(row.deposit_cents) && row.deposit_cents > 0, 'The accepted agreement needs a positive deposit', 409)
 const name = text(snap.clientName, 'the accepted customer name', 100), authorize = reader(env, actor, config)
 const matches = await customerMatches(authorize, name)
 const existing = await db.prepare('SELECT * FROM p_accounting_customers WHERE account_id=? AND client_id=?').bind(config.account_id, row.client_id).first<any>()
 need(!existing || existing.status === 'complete', 'This customer has a retained uncertain request. Reconcile it in QuickBooks; no blind replay is allowed.', 409)
 const choice = String(input.customerId ?? '')
 need(choice === 'new' ? matches.length === 0 && !existing : matches.some((c: any) => c.id === choice) && (!existing || existing.provider_id === choice), matches.length > 1 ? 'Customer matching is ambiguous. Explicitly select one returned QuickBooks customer.' : 'Explicitly choose the matched customer or create a new customer only when none matches', 409)
 const mapping = await itemMapping(authorize, providerId(input.itemId), providerId(input.incomeAccountId))
 const invoice = await db.prepare('SELECT number FROM p_invoices WHERE proposal_id=?').bind(id).first<any>()
 const plan = { proposalId: id, proposalVersion: row.proposal_version, revision: row.revision, clientId: row.client_id, clientName: name,
  acceptedAt: row.accepted_at, acceptedDigest: await hash(row.snapshot), totalCents: row.total_cents, depositCents: row.deposit_cents, currency: row.currency,
  accountId: config.account_id, connectionVersion: config.connection_version, settingsVersion: config.version,
  customer: { choice, matches }, mapping, number: invoice?.number ?? 'PL-' + id.replaceAll('-','').toUpperCase(),
  title: snap.title, acceptedSelection: selection ?? { optionId: row.option_id },
  actorId: actor.id, actorRole: actor.role, operatorVersion: await operatorVersion(db, actor.id), memberVersion: actor.memberVersion ?? 0 }
 return { plan, config }
}
export async function accountingState(env: Bindings, actor: Actor) {
 if (!administrators.includes(actor.role)) return undefined
 const settings = await env.DB.prepare('SELECT * FROM p_accounting_settings WHERE singleton=1').first<any>()
 const jobs = (await env.DB.prepare('SELECT j.*,EXISTS(SELECT 1 FROM p_accounting_job_authority a WHERE a.proposal_id=j.proposal_id) AS executable FROM p_accounting_jobs j ORDER BY authorized_at DESC LIMIT 100').all<any>()).results
 return { settings: settings ? { ...settings, active: Boolean(await env.DB.prepare(live).first()) } : null, locked: Boolean(jobs.length), jobs, requests: (await env.DB.prepare('SELECT * FROM p_accounting_requests ORDER BY requested_at,request_id').all<any>()).results, customers: (await env.DB.prepare('SELECT * FROM p_accounting_customers').all<any>()).results }
}
export async function accountingCommand(env: Bindings, actor: Actor, name: string, input: Record<string, unknown>) {
 need(administrators.includes(actor.role), 'Only owner and admins review accounting requests', 403)
 const db = env.DB, at = await currentTime(db)
 if (name === 'accounting.configure') {
  need(actor.role === 'owner', 'Only the owner chooses the invoice authority', 403)
  need(input.authority === 'quickbooks' && (input.consent === true || input.consent === 'yes'), 'Explicitly select QuickBooks as invoice authority')
  const old = await db.prepare('SELECT * FROM p_accounting_settings WHERE singleton=1').first<any>()
  need(Number(input.version) === (old?.version ?? 0), 'Invoice authority changed. Reload.', 409)
  const { connection } = await providerCredential(env, 'workspace:quickbooks')
  need(input.accountId === connection.account_id && Number(input.connectionVersion) === connection.version, 'Review the current verified QuickBooks company', 409)
  const version = (old?.version ?? 0) + 1
  await commit(db, actor, [db.prepare(`INSERT INTO p_accounting_settings VALUES(1,?,'quickbooks',?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET version=excluded.version,account_id=excluded.account_id,connection_version=excluded.connection_version,authorized_by=excluded.authorized_by,authorized_at=excluded.authorized_at`).bind(version, connection.account_id, connection.version, actor.id, at),
   db.prepare('INSERT INTO p_accounting_authority VALUES(1,?,?,?) ON CONFLICT(singleton) DO UPDATE SET version=excluded.version,operator_version=excluded.operator_version,member_version=excluded.member_version').bind(version, await operatorVersion(db, actor.id), actor.memberVersion ?? 0)], true,
  { sql: `COALESCE((SELECT version FROM p_accounting_settings WHERE singleton=1),0)=? AND NOT EXISTS(SELECT 1 FROM p_accounting_jobs WHERE account_id!=?) AND EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:quickbooks' AND version=? AND account_id=? AND status='connected' AND broken_at IS NULL)`, values: [old?.version ?? 0, connection.account_id, connection.version, connection.account_id] })
  return { version }
 }
 if (name === 'accounting.revoke') { need(actor.role === 'owner', 'Only the owner revokes invoice authority', 403); await commit(db, actor, [db.prepare('DELETE FROM p_accounting_authority')], true); return { revoked: true } }
 if (name === 'accounting.dispatch') { await commit(db, actor, []); await runAccounting(env); return { saved: true } }
 if (name === 'accounting.customers') {
  const config = await configuration(env)
  const row = await db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(text(input.proposalId,'an accepted proposal')).first<any>()
  need(row, 'Choose an accepted agreement', 409)
  return { accountingMatches: true, proposalId: input.proposalId, matches: await customerMatches(reader(env, actor, config), text(JSON.parse(row.snapshot).clientName,'the accepted customer name',100)) }
 }
 if (name === 'accounting.review') {
  const { plan, config } = await planFor(env, actor, input), encoded = canonical(plan), digest = await hash(encoded), id = crypto.randomUUID()
  await commit(db, actor, [db.prepare('INSERT INTO p_accounting_reviews VALUES(?,?,?,?,?,?,NULL)').bind(id, plan.proposalId, actor.id, digest, encoded, at + 600000)], false, configGuard(config))
  return { accountingReview: true, id, digest, plan }
 }
 need(name === 'accounting.apply', 'Unknown accounting action', 404)
 const review = await db.prepare('SELECT * FROM p_accounting_reviews WHERE id=? AND actor_id=?').bind(text(input.id,'a reviewed accounting request'), actor.id).first<any>()
 need(review && review.digest === input.digest, 'Review the exact accepted deposit first', 409)
 const previous = await db.prepare('SELECT * FROM p_accounting_jobs WHERE proposal_id=?').bind(review.proposal_id).first<any>()
 if (previous) return { accountingResult: true, status: previous.status, message: 'This deposit already has one retained accounting request. It is never posted twice.' }
 need(!review.consumed_at && review.expires_at > at && (input.consent === true || input.consent === 'yes'), 'The review expired or consent is missing. Review again.', 409)
 const recorded = JSON.parse(review.plan)
 const { plan, config } = await planFor(env, actor, { proposalId: recorded.proposalId, customerId: recorded.customer.choice, itemId: recorded.mapping.itemId, incomeAccountId: recorded.mapping.accountId })
 need(canonical(plan) === review.plan, 'The accepted deposit, customer match, mapping, authority or connection changed. Review again.', 409)
 const guard = configGuard(config)
 guard.sql += ' AND EXISTS(SELECT 1 FROM p_accounting_reviews WHERE id=? AND consumed_at IS NULL AND expires_at>?) AND EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=? AND status=\'accepted\')'
 guard.values.push(review.id, at, plan.proposalId, plan.proposalVersion)
 // Reserve only the reviewed customer, even when another proposal commits during provider reads.
 guard.sql += ` AND NOT EXISTS(SELECT 1 FROM p_accounting_customers WHERE account_id=? AND client_id=? AND (status!='complete' OR name!=? OR provider_id IS NOT ? OR ?='new'))`
 guard.values.push(plan.accountId, plan.clientId, plan.clientName, plan.customer.choice, plan.customer.choice)
 await commit(db, actor, [
  db.prepare('UPDATE p_accounting_reviews SET consumed_at=? WHERE id=?').bind(at, review.id),
  db.prepare(`INSERT INTO p_accounting_jobs(proposal_id,review_id,account_id,client_id,revision,settings_version,connection_version,authorized_by,actor_role,operator_version,member_version,plan,authorized_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'queued')`).bind(plan.proposalId, review.id, plan.accountId, plan.clientId, plan.revision, plan.settingsVersion, plan.connectionVersion, actor.id, actor.role, plan.operatorVersion, plan.memberVersion, review.plan, at),
  db.prepare('INSERT INTO p_accounting_job_authority VALUES(?)').bind(plan.proposalId),
  db.prepare(`INSERT INTO p_accounting_customers VALUES(?,?,?,?,?) ON CONFLICT(account_id,client_id) DO NOTHING`).bind(plan.accountId, plan.clientId, plan.customer.choice === 'new' ? null : plan.customer.choice, plan.clientName, plan.customer.choice === 'new' ? 'reserved' : 'complete')
 ], false, guard)
 return { accountingResult: true, status: 'queued', message: 'The exact reviewed deposit is retained for once-only dispatch.' }
}
async function execution(env: Bindings, job: any) {
 const db = env.DB, config = await configuration(env)
 need(config.version === job.settings_version && config.connection_version === job.connection_version && config.account_id === job.account_id, 'QuickBooks authority changed. Old requests remain held; new consent never reactivates them.', 409)
 const person = await db.prepare(`SELECT o.*,COALESCE(m.role,'sales') AS member_role,COALESCE(m.version,0) AS member_version FROM oa_operators o LEFT JOIN p_members m ON m.operator_id=o.id WHERE o.id=? AND o.status='active'`).bind(job.authorized_by).first<any>()
 const role = person?.role === 'member' ? person.member_role : person?.role
 need(person && administrators.includes(role) && role === job.actor_role && person.version === job.operator_version && person.member_version === job.member_version, 'The reviewing person no longer has accounting authority', 409)
 need(await db.prepare(`SELECT 1 FROM p_accounting_job_authority g JOIN p_acceptances a ON a.proposal_id=g.proposal_id JOIN p_proposals p ON p.id=a.proposal_id JOIN p_clients c ON c.id=p.client_id WHERE g.proposal_id=? AND a.revision=? AND p.status='accepted'`).bind(job.proposal_id, job.revision).first(), 'This request has no current agreement authority; restored history never synchronizes', 409)
 const { connection, secret } = await providerCredential(env,'workspace:quickbooks')
 need(connection.version === job.connection_version && connection.account_id === job.account_id, 'QuickBooks connection changed', 409)
 return { token: secret.token, company: job.account_id }
}
async function write(env: Bindings, job: any, kind: string, body: any, authorize: QuickBooksAuthority) {
 const db = env.DB, requestId = crypto.randomUUID()
 // This durable unique claim is made before any provider write. No path replays it.
 await authorize()
 await db.prepare("INSERT INTO p_accounting_requests VALUES(?,?,?,?,'writing',NULL,?)").bind(job.proposal_id, kind, requestId, canonical(body), await currentTime(db)).run()
 try {
  const value = await quickbooks(authorize, '/' + kind, body, requestId), record = value[kind === 'customer' ? 'Customer' : 'Invoice']
  const id = providerId(record?.Id)
  if (kind === 'customer') need(record.DisplayName === body.DisplayName, 'QuickBooks returned a different customer', 409)
  if (kind === 'invoice') need(record.CustomerRef?.value === body.CustomerRef.value && Math.round(Number(record.TotalAmt) * 100) === JSON.parse(job.plan).depositCents, 'QuickBooks returned a different invoice amount or customer', 409)
  await db.prepare("UPDATE p_accounting_requests SET status='confirmed',provider_id=? WHERE proposal_id=? AND kind=?").bind(id,job.proposal_id,kind).run()
  return id
 } catch {
  await db.prepare("UPDATE p_accounting_requests SET status='uncertain' WHERE proposal_id=? AND kind=?").bind(job.proposal_id,kind).run()
  throw new Error('Uncertain accounting write')
 }
}
export async function runAccounting(env: Bindings) {
 const db = env.DB, now = await currentTime(db)
 await db.prepare("UPDATE p_accounting_jobs SET status='held',reason='Interrupted accounting request. Reconcile in QuickBooks; no blind replay.' WHERE status='running' AND started_at<?").bind(now-900000).run()
 const jobs = (await db.prepare("SELECT j.* FROM p_accounting_jobs j JOIN p_accounting_job_authority g ON g.proposal_id=j.proposal_id WHERE status='queued' ORDER BY authorized_at LIMIT 10").all<any>()).results
 for (const job of jobs) {
  const claimed = await db.prepare("UPDATE p_accounting_jobs SET status='running',started_at=? WHERE proposal_id=? AND status='queued' RETURNING proposal_id").bind(now,job.proposal_id).first()
  if (!claimed) continue
  let creatingCustomer = false
  try {
   const plan = JSON.parse(job.plan), authorize = () => execution(env,job)
   await authorize()
   // Re-read the reviewed provider mapping before the first write as well.
   need(canonical(await itemMapping(authorize,plan.mapping.itemId,plan.mapping.accountId)) === canonical(plan.mapping), 'The reviewed QuickBooks item mapping changed', 409)
   let customer = await db.prepare('SELECT * FROM p_accounting_customers WHERE account_id=? AND client_id=?').bind(job.account_id,job.client_id).first<any>()
   need(customer && customer.name === plan.clientName, 'The retained customer mapping changed', 409)
   if (customer.status === 'reserved') {
    need(plan.customer.choice === 'new' && (await customerMatches(authorize,plan.clientName)).length === 0, 'Customer matching changed after review', 409)
    const reserved = await db.prepare("UPDATE p_accounting_customers SET status='writing' WHERE account_id=? AND client_id=? AND status='reserved' RETURNING client_id").bind(job.account_id,job.client_id).first()
    need(reserved, 'Customer creation is already claimed', 409)
    creatingCustomer = true
    const id = await write(env,job,'customer',{ DisplayName: plan.clientName, CompanyName: plan.clientName },authorize)
    await db.prepare("UPDATE p_accounting_customers SET provider_id=?,status='complete' WHERE account_id=? AND client_id=?").bind(id,job.account_id,job.client_id).run()
    creatingCustomer = false
    customer = { provider_id: id, status: 'complete' }
   } else {
    need(customer.status === 'complete', 'Customer creation is uncertain or already in progress; no blind replay', 409)
    need(customer.provider_id === plan.customer.choice, 'The retained customer differs from the reviewed QuickBooks customer. Review again.', 409)
    const matches = await customerMatches(authorize,plan.clientName)
    need(matches.some((c: any) => c.id === customer.provider_id), 'The reviewed QuickBooks customer is no longer available', 409)
   }
   need(canonical(await itemMapping(authorize,plan.mapping.itemId,plan.mapping.accountId)) === canonical(plan.mapping), 'The reviewed QuickBooks item mapping changed before invoice creation', 409)
   const day = new Date(plan.acceptedAt).toISOString().slice(0,10)
   const invoice = { CustomerRef: { value: customer.provider_id }, DocNumber: plan.number.slice(0,21), PrivateNote: 'Platter deposit ' + plan.number, TxnDate: day, DueDate: day, CurrencyRef: { value: 'USD' }, GlobalTaxCalculation: 'NotApplicable', Line: [{ Amount: plan.depositCents / 100, DetailType: 'SalesItemLineDetail', Description: 'Deposit: ' + plan.title, SalesItemLineDetail: { ItemRef: { value: plan.mapping.itemId }, Qty: 1, UnitPrice: plan.depositCents / 100, TaxCodeRef: { value: 'NON' } } }] }
   const id = await write(env,job,'invoice',invoice,authorize)
   await db.prepare("UPDATE p_accounting_jobs SET status='complete',provider_id=?,completed_at=?,reason=NULL WHERE proposal_id=?").bind(id,await currentTime(db),job.proposal_id).run()
  } catch {
   if (creatingCustomer) await db.prepare("UPDATE p_accounting_customers SET status='uncertain' WHERE account_id=? AND client_id=? AND status='writing'").bind(job.account_id,job.client_id).run()
   await db.prepare("UPDATE p_accounting_jobs SET status='held',reason='Accounting request held. Review authority, matching and retained receipts in QuickBooks; uncertain writes are never automatically replayed.' WHERE proposal_id=?").bind(job.proposal_id).run()
  }
 }
}

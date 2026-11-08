import { calendarDate, currentTime, localDate } from './expiry-time'
import { installationZone } from './reports/report-state'
import type { Bindings } from '../auth.server'
import { commit, dollars, hash, need, text, type Actor } from './model'
import { permitted, scope } from './permissions'

export const financeRoles = ['owner', 'admin', 'billing']
export function paymentRequestId(value: unknown) {
 const id = text(value, 'a payment request id', 100)
 need(/^[A-Za-z0-9_-]+$/.test(id), 'Use an opaque payment request id')
 return id
}

function allocationBoundary(agreement: any, collection: boolean) {
 const frozen = JSON.parse(agreement.snapshot), schedule = frozen.paymentSchedule
 // Allocation records received money only; frozen installments already subtract deposit credits.
 return !collection && !frozen.recipient_plan?.length && !frozen.selection?.tax && !frozen.tax &&
  schedule?.rows?.length && schedule.rows.every((r: any) => ['deposit', 'milestone', 'balance', 'recurring', 'retainer'].includes(r.kind)) ? schedule : null
}

export async function allocationState(env: Bindings, actor: Actor) {
 if (!financeRoles.includes(actor.role)) return { paymentAllocations: [], paymentSchedules: [] }
 const db = env.DB, visibility = scope(actor, 'view')
 const agreements = (await db.prepare(`SELECT a.*,EXISTS(SELECT 1 FROM p_collection_policy c WHERE c.proposal_id=a.proposal_id) AS collection FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id WHERE (${visibility.sql}) AND p.status='accepted' AND p.revision=a.revision ORDER BY a.proposal_id`).bind(...visibility.values).all<any>()).results
 const allocations = (await db.prepare(`SELECT x.* FROM p_payment_allocations x JOIN p_proposals p ON p.id=x.proposal_id WHERE (${visibility.sql}) ORDER BY x.allocated_at,x.id`).bind(...visibility.values).all<any>()).results
 const completions = (await db.prepare('SELECT * FROM p_payment_milestone_events').all<any>()).results
 const paymentSchedules = []
 for (const a of agreements) {
  const schedule = allocationBoundary(a, Boolean(a.collection))
  if (!schedule) continue
  const agreementHash = await hash(a.snapshot), rows = []
  for (const [index, row] of schedule.rows.entries()) {
   if (!['milestone', 'recurring', 'retainer', 'balance'].includes(row.kind) || (!row.date && !row.event) || !Number.isSafeInteger(row.amountCents) || row.amountCents <= 0) continue
   const rowHash = await hash(JSON.stringify(row)), allocatedCents = allocations.filter(x => x.proposal_id === a.proposal_id && x.revision === a.revision && x.row_index === index && x.row_hash === rowHash && x.agreement_hash === agreementHash).reduce((n, x) => n + x.cents, 0)
   const completion = completions.find(x => x.proposal_id === a.proposal_id && x.revision === a.revision && x.row_index === index && x.row_hash === rowHash && x.agreement_hash === agreementHash)
   const ready = Boolean(row.date || row.event === 'Acceptance' && row.kind === 'balance' || completion)
   rows.push({ ...row, index, rowHash, ready, completion, allocatedCents, remainingCents: row.amountCents - allocatedCents, status: !ready ? 'awaiting completion' : allocatedCents === row.amountCents ? 'paid' : allocatedCents ? 'partially paid' : 'unpaid' })
  }
  if (rows.length) paymentSchedules.push({ proposalId: a.proposal_id, revision: a.revision, currency: a.currency, agreementHash, rows })
 }
 return { paymentAllocations: allocations, paymentSchedules }
}

export async function allocatePayment(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 need(financeRoles.includes(actor.role), 'Only owner, admins and billing allocate received payments', 403)
 const db = env.DB, proposal = await permitted(db, actor, input.id)
 const id = paymentRequestId(input.requestId), paymentId = text(input.paymentId, 'a received payment'), currency = text(input.currency, 'the agreement currency', 3)
 const revision = Number(input.revision), rowIndex = Number(input.rowIndex), paymentVersion = Number(input.paymentVersion ?? input['receiptVersion:' + paymentId]), remainingCents = Number(input.remainingCents)
 need(Number.isSafeInteger(revision) && revision > 0 && Number.isSafeInteger(rowIndex) && rowIndex >= 0 && Number.isSafeInteger(paymentVersion) && paymentVersion > 0 && Number.isSafeInteger(remainingCents) && remainingCents >= 0, 'Reload the agreement and received payment', 409)
 const agreementHash = text(input.agreementHash, 'the agreement hash', 64), rowHash = text(input.rowHash, 'the schedule row hash', 64), cents = dollars(input.amount)
 need(input.consent === true || input.consent === 'yes', 'Confirm this allocation explicitly')
 const intent = JSON.stringify({ proposalId: proposal.id, paymentId, revision, currency, agreementHash, rowIndex, rowHash, cents, paymentVersion, remainingCents })
 const previous = await db.prepare('SELECT * FROM p_payment_allocations WHERE id=?').bind(id).first<any>()
 if (previous) {
  need(previous.request_json === intent, 'This request id already names a different allocation', 409)
  return { id, proposalId: proposal.id, allocated: true }
 }
 const accepted = await db.prepare('SELECT a.*,EXISTS(SELECT 1 FROM p_collection_policy c WHERE c.proposal_id=a.proposal_id) AS collection FROM p_acceptances a WHERE a.proposal_id=?').bind(proposal.id).first<any>()
 need(accepted && proposal.status === 'accepted' && proposal.revision === revision && accepted.revision === revision && accepted.currency === currency && await hash(accepted.snapshot) === agreementHash, 'The accepted agreement changed. Reload before allocating.', 409)
 const schedule = allocationBoundary(accepted, Boolean(accepted.collection)), row = schedule?.rows[rowIndex]
 need(row && ['milestone', 'recurring', 'retainer', 'balance'].includes(row.kind) && (row.date || row.event) && Number.isSafeInteger(row.amountCents) && row.amountCents > 0 && await hash(JSON.stringify(row)) === rowHash, 'Choose a frozen installment from a tax-free, single-client agreement with collection off', 409)
 const eventRequired = !row.date && !(row.kind === 'balance' && row.event === 'Acceptance')
 const eventGuard = {sql:'EXISTS(SELECT 1 FROM p_payment_milestone_events WHERE proposal_id=? AND revision=? AND row_index=? AND agreement_hash=? AND row_hash=?)',values:[proposal.id,revision,rowIndex,agreementHash,rowHash]}
 if(eventRequired)need(await db.prepare('SELECT 1 WHERE '+eventGuard.sql).bind(...eventGuard.values).first(),'The owner must record milestone completion before allocating',409)
 const payment = await db.prepare('SELECT * FROM p_payment_records WHERE id=?').bind(paymentId).first<any>()
 need(payment && ['check', 'wire', 'ach_credit'].includes(payment.method) && payment.proposal_id === proposal.id && payment.revision === revision && payment.currency === currency, 'The receipt must match this agreement revision and currency', 409)
 await commit(db, actor, [
  db.prepare('INSERT INTO p_payment_allocations(id,payment_id,proposal_id,revision,currency,agreement_hash,row_index,row_hash,row_json,cents,request_json,allocated_by,allocated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, paymentId, proposal.id, revision, currency, agreementHash, rowIndex, rowHash, JSON.stringify(row), cents, intent, actor.id, Date.now()),
  db.prepare('UPDATE p_payment_records SET version=version+1 WHERE id=?').bind(paymentId),
 ], false, {
  sql: `EXISTS(SELECT 1 FROM p_proposals p JOIN p_acceptances a ON a.proposal_id=p.id WHERE p.id=? AND p.status='accepted' AND p.revision=? AND a.revision=? AND a.currency=? AND a.snapshot=?) AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=?) AND EXISTS(SELECT 1 FROM p_payment_records WHERE id=? AND version=? AND proposal_id=? AND revision=? AND currency=?) AND ?<=(SELECT cents FROM p_payment_records WHERE id=?)-(SELECT COALESCE(SUM(cents),0) FROM p_payment_allocations WHERE payment_id=?) AND ?=?-(SELECT COALESCE(SUM(cents),0) FROM p_payment_allocations WHERE proposal_id=? AND revision=? AND row_index=?) AND ?<=?${eventRequired?' AND '+eventGuard.sql:''}`,
  values: [proposal.id, revision, revision, currency, accepted.snapshot, proposal.id, paymentId, paymentVersion, proposal.id, revision, currency, cents, paymentId, paymentId, remainingCents, row.amountCents, proposal.id, revision, rowIndex, cents, remainingCents,...(eventRequired?eventGuard.values:[])],
 })
 return { id, proposalId: proposal.id, allocated: true }
}

export async function completePaymentMilestone(env: Bindings, actor: Actor, input: Record<string,unknown>){
 need(actor.role==='owner','Only the owner marks an event milestone complete',403)
 const proposal=await permitted(env.DB,actor,input.id),db=env.DB
 need(input.consent===true||input.consent==='yes','Confirm this completion explicitly')
 const requestId=paymentRequestId(input.requestId),completedOn=calendarDate(input.completedOn),note=text(input.note,'the completion record',1000)
 need(completedOn<=localDate(await currentTime(db),await installationZone(db)),'Completion cannot be in the future',409)
 const schedule=(await allocationState(env,actor)).paymentSchedules.find(x=>x.proposalId===proposal.id),row=schedule?.rows.find(x=>x.index===Number(input.rowIndex))
 need(schedule&&row&&row.kind==='milestone'&&row.event&&!row.date&&schedule.agreementHash===input.agreementHash&&row.rowHash===input.rowHash,'Choose the exact frozen event milestone',409)
 const previous=await db.prepare('SELECT * FROM p_payment_milestone_events WHERE request_id=?').bind(requestId).first<any>()
 if(previous){need(previous.proposal_id===proposal.id&&previous.revision===schedule.revision&&previous.row_index===row.index&&previous.agreement_hash===schedule.agreementHash&&previous.row_hash===row.rowHash&&previous.completed_on===completedOn&&previous.note===note,'This request already names another completion',409);return {id:requestId,proposalId:proposal.id}}
 const accepted=await db.prepare('SELECT snapshot FROM p_acceptances WHERE proposal_id=?').bind(proposal.id).first<any>()
 need(accepted&&await hash(accepted.snapshot)===schedule.agreementHash,'The accepted agreement changed. Reload.',409)
 await commit(db,actor,[db.prepare('INSERT INTO p_payment_milestone_events(request_id,proposal_id,revision,row_index,agreement_hash,row_hash,completed_on,note,completed_by,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(requestId,proposal.id,schedule.revision,row.index,schedule.agreementHash,row.rowHash,completedOn,note,actor.id,Date.now())],false,{sql:"EXISTS(SELECT 1 FROM p_acceptances a JOIN p_proposals p ON p.id=a.proposal_id WHERE p.id=? AND p.status='accepted' AND p.revision=? AND a.revision=? AND a.snapshot=?) AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=?)",values:[proposal.id,schedule.revision,schedule.revision,accepted.snapshot,proposal.id]})
 return {id:requestId,proposalId:proposal.id}
}

import { editablePackages, pricingInput } from './pricing'
import type { Actor } from './model'
import { need, proposal } from './model'
import { negotiatedView, pendingNegotiation } from './negotiation'

export async function revisionHistory(db: D1Database) {
 const rows = (await db.prepare('SELECT * FROM p_revisions ORDER BY proposal_id,revision DESC').all<any>()).results
 return rows.map(row => ({ ...row, snapshot: JSON.parse(row.snapshot) }))
}

export async function restoreFields(db: D1Database, actor: Actor, input: Record<string, unknown>) {
 need(actor.role !== 'agent', 'A person restores revision history', 403)
 const offer = await proposal(db, input.id)
 const current = negotiatedView(offer, await pendingNegotiation(db, offer.id))
 need(['draft', 'approved'].includes(current.status), 'Sent and accepted proposals are frozen', 409)
 const revision = Number(input.revision)
 need(Number.isInteger(revision) && revision > 0 && revision < current.revision, 'Choose an earlier draft revision')
 const source = await db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=?').bind(current.id, revision).first<any>()
 need(source, 'Revision not found', 404)
 const saved = JSON.parse(source.snapshot)
 return { ...input, document:saved.document??{}, packages:editablePackages(saved.options), pricingTables:pricingInput(saved.options), clientId: saved.client_id, title: saved.title, scope: saved.scope, terms:saved.terms??'', sectionConditions:saved.section_conditions??{}, restoredAttachments:saved.attachments??[], depositPercent: String(saved.deposit_bps / 100), optionOne: saved.options[0].label, priceOne: (saved.options[0].cents / 100).toFixed(2), optionTwo: saved.options[1]?.label??'', priceTwo: ((saved.options[1]?.cents??0) / 100).toFixed(2) }
}

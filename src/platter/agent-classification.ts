import { need } from './model'

interface DraftResult { id: string; revision: number; version: number }

/** Facts about the exact native revision, after native validation and version guards.
 * Count every offered priced row and optional item once, regardless of quantity
 * or client selection. A flat package is one priced row; table packages count
 * their lines instead of counting the package total a second time.
 * These facts are descriptive and confer no company-policy decision or authority.
 */
export async function draftClassification(db: D1Database, result: DraftResult) {
 const saved = await db.prepare('SELECT snapshot FROM p_revisions WHERE proposal_id=? AND revision=?')
  .bind(result.id, result.revision).first<{ snapshot: string }>()
 need(saved, 'Saved draft revision not found', 409)
 const revision = JSON.parse(saved.snapshot)
 let pricedRowCount = 0, optionalItemCount = 0
 for (const option of revision.options) {
  pricedRowCount += option.tables?.length
   ? option.tables.reduce((count: number, table: { lines: unknown[] }) => count + table.lines.length, 0)
   : 1
  optionalItemCount += option.optionalItems?.length ?? 0
 }
 const template = await db.prepare('SELECT template_id AS id,template_version AS version FROM p_template_sources WHERE proposal_id=?')
  .bind(result.id).first<{ id: string; version: number }>()
 return {
  classification: {
   classes: ['standard'], basis: 'validated saved revision',
   proposal: { id: result.id, revision: result.revision, version: result.version },
   ...(template ? { template } : {}),
   facts: { affectedProposalCount: 1, pricedRowCount, optionalItemCount, itemCount: pricedRowCount + optionalItemCount },
  },
  companyPolicy: { evaluated: false, decision: null },
 }
}

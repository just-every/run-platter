import type { AttachmentRef } from './attachments'

// Read side of SIGN-008: an accepted-by-upload record and its retained signed copy.
const select = 'SELECT a.*,f.filename,f.media_type,f.size,f.sha256 FROM p_paper_acceptances a JOIN p_attachment_files f ON f.id=a.file_id'
export const paperRows = async (db: D1Database) => (await db.prepare(select).all<any>()).results
export const paperRow = (db: D1Database, proposalId: string) => db.prepare(select + ' WHERE a.proposal_id=?').bind(proposalId).first<any>()
export const paperFile = (row: any): AttachmentRef => ({ id: row.file_id, filename: row.filename, mediaType: row.media_type, size: row.size, sha256: row.sha256 })
/** Acceptance method for every acceptance view; Platter e-signature unless a paper record exists. */
export const paperView = (row: any, people = true) => row
 ? { method: 'upload', signedOn: row.signed_on, attestedBy: row.attested_by, attestedAt: row.attested_at, ...(people ? { signedCopy: paperFile(row) } : {}) }
 : { method: 'platter' }

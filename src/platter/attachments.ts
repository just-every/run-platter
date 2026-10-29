import { commit, need, text, type Actor } from './model'
import { citeAgentSource } from './agent-sources'

export type AttachmentKind = 'w9' | 'insurance'
export interface AttachmentRef {
 id: string
 filename: string
 mediaType: string
 size: number
 sha256: string
 kind?: AttachmentKind
}
export interface AttachmentUpload {
 filename: string
 mediaType?: string
 bytes: ArrayBuffer | Uint8Array
}

// Base64 TEXT preserves exact bytes through the existing JSON archive transport.
// Small rows also keep every D1 value below its per-row and binding limits.
const chunkSize = 48 * 1024
const columns = 'id,filename,media_type,size,sha256'
const reference = (row: any): AttachmentRef => ({ id: row.id, filename: row.filename, mediaType: row.media_type, size: row.size, sha256: row.sha256 })
const fingerprint = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer)), byte => byte.toString(16).padStart(2, '0')).join('')

function vendorKind(kind: unknown): asserts kind is AttachmentKind {
 need(kind === 'w9' || kind === 'insurance', 'Choose W-9 or insurance')
}
function encode(bytes: Uint8Array) {
 let binary = ''
 for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
 return btoa(binary)
}

/** Prepare immutable bytes for the caller's authorized, atomic revision transaction. */
export async function prepareAttachment(db: D1Database, upload: AttachmentUpload, kind?: AttachmentKind) {
 need(upload && (upload.bytes instanceof ArrayBuffer || upload.bytes instanceof Uint8Array), 'Provide attachment bytes')
 const filename = text(upload.filename, 'an attachment filename', 255)
 need(!/[\u0000-\u001f\u007f/\\]/.test(filename), 'Use a filename without paths or control characters')
 const mediaType = upload.mediaType?.trim().toLowerCase() || 'application/octet-stream'
 need(mediaType.length <= 200 && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:\s*;[^\u0000-\u001f\u007f]*)?$/.test(mediaType), 'Provide a valid attachment media type')
 if (kind !== undefined) vendorKind(kind)
 const bytes = upload.bytes instanceof Uint8Array ? new Uint8Array(upload.bytes) : new Uint8Array(upload.bytes.slice(0))
 const attachment: AttachmentRef = { id: crypto.randomUUID(), filename, mediaType, size: bytes.byteLength, sha256: await fingerprint(bytes), ...(kind ? { kind } : {}) }
 const writes = [db.prepare('INSERT INTO p_attachment_files(id,filename,media_type,size,sha256,created_at) VALUES(?,?,?,?,?,?)')
  .bind(attachment.id, filename, mediaType, attachment.size, attachment.sha256, Date.now())]
 for (let offset = 0, part = 0; offset < bytes.length; offset += chunkSize, part++) {
  writes.push(db.prepare('INSERT INTO p_attachment_chunks(file_id,part,bytes_base64) VALUES(?,?,?)').bind(attachment.id, part, encode(bytes.subarray(offset, offset + chunkSize))))
 }
 return { attachment, writes }
}

/** Current defaults are copied into new revision snapshots, never read by client downloads. */
export async function vendorDocuments(db: D1Database, actor?: Actor): Promise<AttachmentRef[]> {
 const rows = (await db.prepare('SELECT f.*,v.kind FROM p_vendor_documents v JOIN p_attachment_files f ON f.id=v.file_id ORDER BY v.kind').all<any>()).results
 const documents = rows.map(row => ({ ...reference(row), kind: row.kind }))
 if (actor) for (const file of documents) await citeAgentSource(actor,'attachment',file.id,file.sha256,file)
 return documents
}

/** Settings replacement retains all prior file versions, including their original bytes. */
export async function saveVendorDocument(db: D1Database, actor: Actor, kind: AttachmentKind, upload: AttachmentUpload | null) {
 need(['owner','admin'].includes(actor.role), 'Only the owner changes vendor document defaults', 403)
 vendorKind(kind)
 if (upload === null) {
  await commit(db, actor, [db.prepare('DELETE FROM p_vendor_documents WHERE kind=?').bind(kind)], true)
  return null
 }
 const prepared = await prepareAttachment(db, upload, kind)
 await commit(db, actor, [...prepared.writes, db.prepare('INSERT INTO p_vendor_documents(kind,file_id,updated_at) VALUES(?,?,?) ON CONFLICT(kind) DO UPDATE SET file_id=excluded.file_id,updated_at=excluded.updated_at')
  .bind(kind, prepared.attachment.id, Date.now())], true)
 return prepared.attachment
}

/** Resolve IDs only after the caller has checked proposal/default selection authority. */
export async function resolveAttachments(db: D1Database, ids: string[]): Promise<AttachmentRef[]> {
 need(Array.isArray(ids) && ids.every(id => typeof id === 'string') && new Set(ids).size === ids.length, 'Choose distinct attachment files')
 const attachments: AttachmentRef[] = []
 for (const id of ids) {
  const row = await db.prepare(`SELECT ${columns} FROM p_attachment_files WHERE id=?`).bind(text(id, 'an attachment')).first<any>()
  need(row, 'Attachment not found', 404)
  attachments.push(reference(row))
 }
 return attachments
}

/** Copy JSON snapshot references without retaining mutable object aliases. */
export function copyAttachments(value: unknown): AttachmentRef[] {
 if (value === undefined) return []
 need(Array.isArray(value), 'Invalid attachment snapshot')
 const copied = value.map((entry: any): AttachmentRef => {
  need(entry && typeof entry === 'object', 'Invalid attachment snapshot')
  need(Number.isSafeInteger(entry.size) && entry.size >= 0 && typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.sha256), 'Invalid attachment snapshot')
  const attachment = { id: text(entry.id, 'an attachment'), filename: text(entry.filename, 'an attachment filename', 255), mediaType: text(entry.mediaType, 'an attachment media type', 200), size: entry.size, sha256: entry.sha256 }
  if (entry.kind === undefined) return attachment
  vendorKind(entry.kind)
  return { ...attachment, kind: entry.kind }
 })
 need(new Set(copied.map(item => item.id)).size === copied.length, 'Choose distinct attachment files')
 return copied
}

/** The route must select this reference from an authorized frozen snapshot or settings. */
export async function downloadAttachment(db: D1Database, allowed: AttachmentRef): Promise<Response> {
 const [attachment] = copyAttachments([allowed])
 const row = await db.prepare(`SELECT ${columns} FROM p_attachment_files WHERE id=?`).bind(attachment.id).first<any>()
 need(row, 'Attachment not found', 404)
 need(row.filename === attachment.filename && row.media_type === attachment.mediaType && row.size === attachment.size && row.sha256 === attachment.sha256, 'Attachment snapshot does not match its retained version', 409)
 const chunks = (await db.prepare('SELECT part,bytes_base64 FROM p_attachment_chunks WHERE file_id=? ORDER BY part').bind(attachment.id).all<{ part: number; bytes_base64: string }>()).results
 need(chunks.length === Math.ceil(attachment.size / chunkSize), 'Attachment bytes are incomplete', 409)
 const bytes = new Uint8Array(attachment.size)
 let offset = 0
 for (let part = 0; part < chunks.length; part++) {
  need(chunks[part].part === part, 'Attachment bytes are incomplete', 409)
  const binary = atob(chunks[part].bytes_base64)
  need(binary.length === Math.min(chunkSize, attachment.size - offset), 'Attachment bytes are incomplete', 409)
  for (let i = 0; i < binary.length; i++) bytes[offset++] = binary.charCodeAt(i)
 }
 need(await fingerprint(bytes) === attachment.sha256, 'Attachment integrity check failed', 409)
 const asciiName = attachment.filename.replace(/[^\x20-\x7e]|["\\]/g, '_')
 const encodedName = encodeURIComponent(attachment.filename).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())
 return new Response(bytes, { headers: {
  'content-type': attachment.mediaType,
  'content-length': String(attachment.size),
  'content-disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; sandbox",
 } })
}

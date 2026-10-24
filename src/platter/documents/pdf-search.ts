import { extractText, getDocumentProxy } from 'unpdf'
import { scope } from '../permissions'
import { resourceScope } from '../folders'
import { downloadAttachment } from '../attachments'
import type { Actor } from '../model'
/** Parsing never fetches a provider; originals remain immutable download attachments. */
export async function pdfSearchText(bytes:ArrayBuffer){
 try{const pdf=await getDocumentProxy(new Uint8Array(bytes.slice(0)));try{if(pdf.numPages>500)return '';const result=await extractText(pdf,{mergePages:true});return result.text.length<=1000000?result.text:''}finally{await pdf.destroy()}}catch{return ''}
}
/** Upgrade old uploads and restored files only within the reader's existing live scope. */
export async function ensurePdfSearch(db:D1Database,a:Actor){
 const access=scope(a,'view'),resources=resourceScope(a,'r')
 const rows=(await db.prepare(`SELECT DISTINCT f.id,f.filename,f.media_type AS mediaType,f.size,f.sha256 FROM p_proposals p JOIN json_each(p.attachments) j JOIN p_attachment_files f ON f.id=json_extract(j.value,'$.id') LEFT JOIN p_attachment_search s ON s.file_id=f.id WHERE (${access.sql}) AND f.media_type='application/pdf' AND s.file_id IS NULL UNION SELECT DISTINCT f.id,f.filename,f.media_type AS mediaType,f.size,f.sha256 FROM p_personal_templates r JOIN json_each(json_extract(r.snapshot,'$.attachments')) j JOIN p_attachment_files f ON f.id=json_extract(j.value,'$.id') LEFT JOIN p_attachment_search s ON s.file_id=f.id WHERE (r.owner_id=? OR r.shared=1) AND (${resources.sql}) AND f.media_type='application/pdf' AND s.file_id IS NULL`).bind(...access.values,a.id,...resources.values).all<any>()).results
 for(const file of rows){const response=await downloadAttachment(db,file),content=await pdfSearchText(await response.arrayBuffer());await db.prepare('INSERT OR IGNORE INTO p_attachment_search(file_id,content) VALUES(?,?)').bind(file.id,content).run()}
}

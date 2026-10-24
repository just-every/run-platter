import { ensurePdfSearch } from './documents/pdf-search'
import { scope } from './permissions'
import { need, type Actor } from './model'
/** A coarse text token cuts hydration work; the pipeline still checks the exact normalized phrase. */
export async function searchCandidates(db:D1Database,a:Actor,query:string){
 await ensurePdfSearch(db,a)
 need(query.length<=200,'Search must be at most 200 characters')
 const token=query.toLowerCase().match(/[\p{L}\p{N}]+/u)?.[0]
 if(!token||['draft','awaiting','approval','approved','sent','accepted','expired','withdrawn','declined','lost'].includes(token))return undefined
 const access=scope(a,'view')
 return (await db.prepare(`SELECT p.id FROM p_proposals p JOIN p_clients c ON c.id=p.client_id WHERE (${access.sql}) AND (instr(lower(p.title||char(10)||p.scope||char(10)||p.terms||char(10)||COALESCE(p.sales_owner_name,'')||char(10)||c.name||char(10)||c.email),?)>0 OR EXISTS(SELECT 1 FROM json_tree(p.document) j WHERE j.type='text' AND instr(lower(j.value),?)>0) OR EXISTS(SELECT 1 FROM json_tree(p.options) j WHERE j.type='text' AND instr(lower(j.value),?)>0) OR EXISTS(SELECT 1 FROM json_each(p.attachments) j JOIN p_attachment_search s ON s.file_id=json_extract(j.value,'$.id') WHERE instr(lower(s.content),?)>0))`).bind(...access.values,token,token,token,token).all<{id:string}>()).results.map(p=>p.id)
}

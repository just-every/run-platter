/** A manual content change or removal permanently detaches the original insertion. */
export function detachChangedLibraryCopies(db:D1Database,id:string,document:unknown){
 return db.prepare(`UPDATE p_library_uses SET linked=0 WHERE proposal_id=? AND linked=1 AND NOT EXISTS(SELECT 1 FROM json_each(?, '$.blocks') b WHERE json_extract(b.value,'$.id')=block_id AND json_extract(b.value,'$.title')=title AND json_extract(b.value,'$.text')=content AND json_extract(b.value,'$.type')=CASE kind WHEN 'section' THEN 'text' WHEN 'testimonial' THEN 'quote' ELSE kind END)`).bind(id,JSON.stringify(document))
}

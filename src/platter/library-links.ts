import { snapshot } from './model'
import { documentOf } from './documents/blocks'
import { libraryMatches } from './library-content'
import { proposalDocument } from './documents/blocks'
/** A manual content change or removal permanently detaches the original insertion. */
export async function detachChangedLibraryCopies(db:D1Database,id:string,document:unknown,options:any[]=[]){
 const blocks=proposalDocument(document).blocks,uses=(await db.prepare('SELECT * FROM p_library_uses WHERE proposal_id=? AND linked=1').bind(id).all<any>()).results
 return uses.filter(use=>!libraryMatches(blocks.find(b=>b.id===use.block_id),use,options)).map(use=>db.prepare('UPDATE p_library_uses SET linked=0 WHERE proposal_id=? AND block_id=?').bind(id,use.block_id))
}

/** Retain only provenance whose placed content still matches its recorded source. */
export async function placedLibrarySources(db:D1Database,row:any){
 const blocks=documentOf(row).blocks,options=snapshot(row).options
 const direct=(await db.prepare('SELECT * FROM p_library_uses WHERE proposal_id=? ORDER BY block_id').bind(row.id).all<any>()).results
 const origin=await db.prepare('SELECT library_uses FROM p_content_origins WHERE proposal_id=?').bind(row.id).first<any>()
 const sources=[...direct,...JSON.parse(origin?.library_uses??'[]')]
 return sources.filter(use=>libraryMatches(blocks.find(b=>b.id===use.block_id),use,options)).sort((a,b)=>blocks.findIndex(block=>block.id===a.block_id)-blocks.findIndex(block=>block.id===b.block_id))
}

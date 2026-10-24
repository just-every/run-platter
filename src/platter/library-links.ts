import { libraryMatches } from './library-content'
import { proposalDocument } from './documents/blocks'
/** A manual content change or removal permanently detaches the original insertion. */
export async function detachChangedLibraryCopies(db:D1Database,id:string,document:unknown,options:any[]=[]){
 const blocks=proposalDocument(document).blocks,uses=(await db.prepare('SELECT * FROM p_library_uses WHERE proposal_id=? AND linked=1').bind(id).all<any>()).results
 return uses.filter(use=>!libraryMatches(blocks.find(b=>b.id===use.block_id),use,options)).map(use=>db.prepare('UPDATE p_library_uses SET linked=0 WHERE proposal_id=? AND block_id=?').bind(id,use.block_id))
}

import type { Actor } from '../model'

/** A retained source library copy keeps its move-in owner's private audience. */
export function proposifyLibraryScope(a:Actor,alias='r') {
 return {sql:`(NOT EXISTS(SELECT 1 FROM p_proposify_applications pa WHERE pa.library_id=${alias}.id) OR EXISTS(SELECT 1 FROM p_proposify_applications pa JOIN p_document_moveins m ON m.id=pa.movein_id WHERE pa.library_id=${alias}.id AND m.owner_id=? AND ?='owner'))`,values:[a.id,a.role]}
}

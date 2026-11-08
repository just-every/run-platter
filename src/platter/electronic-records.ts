import { clientText, type ClientLocale } from './locales'
import { electronicDisclosureEnglish, electronicConsentEnglish } from './electronic-records-text'
export const electronicDisclosure = (language:ClientLocale) => electronicDisclosureEnglish.map(text=>clientText(text,language))
export const electronicConsent = (language:ClientLocale) => clientText(electronicConsentEnglish,language)
export const electronicOpenSql = "COALESCE((SELECT r.kind FROM p_electronic_requests r WHERE r.proposal_id=p.id AND r.revision=p.revision AND r.slot_id=COALESCE(s.slot_id,'client') AND r.recipient=COALESCE(s.recipient,(SELECT c.email FROM p_clients c WHERE c.id=p.client_id)) ORDER BY r.sequence DESC LIMIT 1),'resume')='resume'"
export async function electronicState(db:D1Database,row:any,share:any){
 const request=await db.prepare('SELECT kind,language,requested_at FROM p_electronic_requests WHERE proposal_id=? AND revision=? AND slot_id=? AND recipient=? ORDER BY sequence DESC LIMIT 1').bind(row.id,row.revision,share.slot_id??'client',row.clientEmail).first<any>()
 return {blocked:Boolean(request&&request.kind!=='resume'),request}
}

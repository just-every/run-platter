import { clientLocale } from './locales'
import { signerMethod } from './signer-methods'
import { need } from './model'

// Retain the actual disclosure per sent revision; future editions must use a new version.
export const electronicRecords = {
 version: '2026-10-29.1',
 disclosure: 'Electronic records for this proposal revision: You may review this proposal and sign it electronically using your typed name. Your affirmative consent applies to this revision and its electronic agreement and completion certificate. You need a device with a current web browser, internet access, and a PDF reader, plus the ability to download and save or print PDF files. Confirm that you can read this page and retain these records before signing. You can download the proposal before signing when the firm allows downloads, and the completed agreement and certificate after completion. Keep your own copies. You can instead request a paper copy or withdraw electronic-record consent using the request below. The firm will be told once and must arrange paper delivery with you; this request does not itself send paper or promise a delivery date or fee. Signing on this offer revision stops after your request. A request never cancels or changes an agreement already signed or removes its historical facts. Contact the firm to update your contact details, discuss paper delivery or obtain a new offer.',
 consent: 'I can read and retain the electronic records described above, consent to use electronic records for this proposal revision, and adopt my typed full name as my signature when I accept this proposal.',
}
export function signingDisclosureStatement(db:D1Database,id:string,revision:number,at:number){
 return db.prepare(`INSERT INTO p_signing_disclosures(proposal_id,revision,version,disclosure,consent,issued_at)
 SELECT p.id,p.revision,?,?,?,? FROM p_proposals p WHERE p.id=? AND p.revision=?
 AND COALESCE(p.recipient_plan,'[]')='[]'
 AND COALESCE((SELECT locale FROM p_client_locales WHERE proposal_id=p.id),'en')='en'
 AND NOT EXISTS(SELECT 1 FROM p_collection_policy WHERE proposal_id=p.id)
 AND COALESCE((SELECT method FROM p_signer_methods WHERE proposal_id=p.id AND revision=p.revision),'mailbox code')='mailbox code'
 ON CONFLICT DO NOTHING`).bind(electronicRecords.version,electronicRecords.disclosure,electronicRecords.consent,at,id,revision)
}
export async function signingConsentView(db:D1Database,row:any){
 if(clientLocale(row)!=='en'||row.recipient_plan!=='[]'||await signerMethod(db,row.id,row.revision)!=='mailbox code'||await db.prepare('SELECT 1 FROM p_collection_policy WHERE proposal_id=?').bind(row.id).first())return null
 const disclosure=await db.prepare('SELECT version,disclosure,consent FROM p_signing_disclosures WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).first<any>()
 if(!disclosure)return null
 const request=await db.prepare('SELECT requested_at AS requestedAt,paper_requested AS paperRequested,contact FROM p_signing_requests WHERE proposal_id=? AND revision=?').bind(row.id,row.revision).first<any>()
 return {...disclosure,revision:row.revision,request}
}
export function consentEvidence(disclosure:any,p:Record<string,unknown>,at:number){
 if(!disclosure)return null
 need(!disclosure.request,'Electronic-record consent was withdrawn. Contact the firm for paper or a new offer.',409)
 need(p.disclosureVersion===undefined||p.disclosureVersion===disclosure.version,'The electronic-record disclosure changed. Reload before consenting.',409)
 need(p.revision===undefined||Number(p.revision)===disclosure.revision,'This revision changed. Reload before consenting.',409)
 need(p.consent===true||['on','yes'].includes(String(p.consent)),'Read the electronic-record disclosure and confirm your consent before signing')
 return {version:disclosure.version,revision:disclosure.revision,disclosure:disclosure.disclosure,consent:disclosure.consent,consentedAt:at}
}

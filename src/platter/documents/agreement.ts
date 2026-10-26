import { collectionView } from '../collection'
import type { Bindings } from '../../auth.server'
import { commit, need, type Actor } from '../model'
import { currentTime } from '../expiry-time'
import { permitted } from '../permissions'
import { mediaBytes } from './media'
import { offerPdf } from './offer-pdf'
import { pdfFonts } from './pdf-fonts'
import { PdfText } from './pdf-text'

/** Only facts retained at signing are certified; historical missing facts are never inferred. */
export async function agreementArtifact(env:Bindings,id:string,kind:string,authority:{actor:Actor}|{client:any}){
 const db=env.DB
 const authorize=async()=>{
  if('actor' in authority){await permitted(db,authority.actor,id);need(authority.actor.role!=='agent','A person downloads the agreement',403)}
  else {const c=authority.client;need(c.verified&&c.row.id===id,'Verify the invited signer before downloading',401);need(await db.prepare("SELECT 1 FROM p_shares s JOIN p_proposals p ON p.id=s.proposal_id WHERE s.token=? AND s.session_hash=? AND s.session_expires>? AND p.id=? AND p.status='accepted' AND s.revision=p.revision").bind(c.token,c.share.session_hash,await currentTime(db),id).first(),'The signer session changed',401)}
 }
 await authorize()
 const a=await db.prepare('SELECT a.*,f.method,f.verified_at FROM p_acceptances a JOIN p_signature_facts f ON f.proposal_id=a.proposal_id AND f.revision=a.revision WHERE a.proposal_id=?').bind(id).first<any>()
 need(a,'This agreement has no retained verification-method facts; a historical method is not inferred',409)
 need((await collectionView(db,id,a)).complete,'Complete the required deposit before downloading completion artifacts',409)
 let saved=await db.prepare('SELECT * FROM p_agreement_artifacts WHERE proposal_id=?').bind(id).first<any>()
 if(!saved){
  const frozen=JSON.parse(a.snapshot),fonts=await pdfFonts(env,frozen),signer={name:a.name,email:a.email,method:a.method,verifiedAt:a.verified_at,acceptedAt:a.accepted_at,consent:a.consent}
  const bytes=await offerPdf(frozen,a.option_id,fonts,frozen.selection?.items??[],asset=>mediaBytes(db,frozen,asset),undefined,signer)
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.buffer as ArrayBuffer)),b=>b.toString(16).padStart(2,'0')).join('')
  const facts={schemaVersion:1,proposalId:id,revision:a.revision,documentSha256:digest,signers:[signer],location:'not recorded',userAgent:'not recorded',attachments:frozen.attachments??[]}
  const pdf=await PdfText.create(a.revision,fonts,'Certificate of completion')
  pdf.heading('Certificate of completion');pdf.text('Proposal: '+frozen.title);pdf.text('Revision: '+a.revision);pdf.text('Document SHA-256: '+digest);pdf.text('Signer: '+a.name);pdf.text('Recipient: '+a.email);pdf.text('Verification method: '+a.method);pdf.text('Verified at: '+(a.verified_at?new Date(a.verified_at).toISOString():'not recorded'));pdf.text('Accepted at: '+new Date(a.accepted_at).toISOString());pdf.text('Consent: '+a.consent);pdf.text('Location and user agent: not recorded')
  const certificate=await pdf.document.save()
  await authorize()
  const write=db.prepare('INSERT INTO p_agreement_artifacts VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(id,a.revision,bytes,certificate,JSON.stringify(facts))
  if('actor' in authority)await commit(db,authority.actor,[write])
  else {const c=authority.client;await db.batch([db.prepare("INSERT INTO p_guard(ok) VALUES(EXISTS(SELECT 1 FROM p_shares WHERE token=? AND session_hash=? AND session_expires>?))").bind(c.token,c.share.session_hash,await currentTime(db)),write,db.prepare('DELETE FROM p_guard')])}
  saved=await db.prepare('SELECT * FROM p_agreement_artifacts WHERE proposal_id=?').bind(id).first<any>()
 }
 await authorize()
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}
 if(kind==='certificate.json')return new Response(saved.facts,{headers:{...headers,'content-type':'application/json'}})
 need(kind==='agreement.pdf'||kind==='certificate.pdf','Unknown agreement artifact',404)
 const stored=kind==='agreement.pdf'?saved.document:saved.certificate
 return new Response(new Uint8Array(stored).buffer,{headers:{...headers,'content-type':'application/pdf','content-disposition':'attachment; filename="'+kind+'"'}})
}

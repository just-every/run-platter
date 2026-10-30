import { Buffer } from 'node:buffer'
import { canonicalJson, sha256 } from '../../modules/import-kit/src/d1/index.ts'
import { prepareAttachment } from '../attachments'
import { commit, dollars, need, snapshot, text, type Actor } from '../model'

/** A new owner-reviewed draft has no imported approval, payment or recipient authority. */
export async function documentReissue(db:D1Database,actor:Actor,name:string,input:Record<string,unknown>,move:any,originals:()=>Promise<any[]>){
 need(actor.role==='owner','Only the current owner reissues imported documents',403)
 const documentId=text(input.documentId,'an imported document'),source=await db.prepare('SELECT * FROM p_imported_documents WHERE id=?').bind(documentId).first<any>()
 need(source,'Imported document not found',404)
 const document=JSON.parse(source.data_json)
 need(document.moveinId===move.id&&document.disposition==='held-open-document'&&!document.signatureEvidence.length,'Only an open document in this move-in can become a new draft',409)
 const prior=await db.prepare('SELECT * FROM p_document_reissues WHERE document_id=?').bind(documentId).first<any>()
 if(prior){need(name==='document-import.reissue'&&input.fingerprint===prior.fingerprint,'This original already has a new draft',409);return {id:prior.proposal_id,documentId}}
 const client=await db.prepare('SELECT id,name,email,version FROM p_clients WHERE id=?').bind(text(input.clientId,'the new draft client')).first<any>()
 need(client,'Client not found',404)
 const scope=text(input.scope,'the new proposal scope',10000),cents=dollars(input.price),deposit=Number(input.depositPercent)
 need(input.depositPercent!==undefined&&Number.isFinite(deposit)&&deposit>=0.01&&deposit<=100,'Choose a new deposit percentage',409)
 const choices={documentId,clientId:client.id,scope,price:(cents/100).toFixed(2),depositPercent:String(deposit)},fingerprint=sha256(canonicalJson({owner:actor.id,source,client,choices}))
 const review={kind:'Document reissue',moveinId:move.id,title:document.title,sourceSha256:document.sha256,clientName:client.name,...choices,fingerprint}
 if(name==='document-import.reissue-preview')return review
 need(name==='document-import.reissue','Unknown reissue action',404)
 need(input.fingerprint===fingerprint,'The original, client or new draft choices changed. Preview again.',409)
 need(input.confirmVoid===true||input.confirmVoid==='yes','Confirm you will void the old offer before sending the new draft',409)
 const file=(await originals()).find(o=>o.name==='documents/'+document.sha256+'.pdf')
 need(file?.original.status==='retained','Original file unavailable',409)
 const bytes=Buffer.from(file.original.base64,'base64');need(sha256(bytes)===document.sha256,'Original integrity check failed',409)
 const retained=await prepareAttachment(db,{filename:'imported-original.pdf',mediaType:'application/pdf',bytes}),id=crypto.randomUUID(),at=Date.now(),options=[{id:'imported',label:'New reviewed price',cents}],content={version:1,blocks:[],fixedPdf:{fileId:retained.attachment.id,pages:document.pages}}
 const row={id,client_id:client.id,title:document.title,scope,terms:'',revision:1,deposit_bps:Math.round(deposit*100),options,currency:'USD',document:content}
 await commit(db,actor,[...retained.writes,
  db.prepare("INSERT INTO p_proposals(id,client_id,title,scope,terms,version,revision,status,deposit_bps,options,prepared_by,created_at,currency,sales_owner_id,sales_owner_name,document) VALUES(?,?,?,?,?,1,1,'draft',?,?,?,?,?,?,?,?)").bind(id,client.id,row.title,scope,'',row.deposit_bps,JSON.stringify(options),actor.email,at,'USD',actor.id,actor.email,JSON.stringify(content)),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,1,?,?,?,?)').bind(id,JSON.stringify(snapshot(row)),actor.email,at,'USD'),
  db.prepare('INSERT INTO p_document_media(proposal_id,file_id) VALUES(?,?)').bind(id,retained.attachment.id),
  db.prepare('INSERT INTO p_imported_document_links(document_id,proposal_id) VALUES(?,?)').bind(documentId,id),
  db.prepare('INSERT INTO p_document_reissues(document_id,proposal_id,fingerprint,created_at) VALUES(?,?,?,?)').bind(documentId,id,fingerprint,at),
  ...(document.folderIds?.length?[db.prepare('INSERT INTO p_proposal_filing(proposal_id,folder_id) VALUES(?,?)').bind(id,document.folderIds[0])]:[]),
 ],false,{sql:"EXISTS(SELECT 1 FROM p_clients WHERE id=? AND version=? AND name=? AND email=?) AND EXISTS(SELECT 1 FROM p_imported_documents WHERE id=? AND data_json=? AND revision=?) AND EXISTS(SELECT 1 FROM ik_jobs WHERE id=? AND state='completed')",values:[client.id,client.version,client.name,client.email,documentId,source.data_json,source.revision,move.job_id]})
 return {id,documentId}
}

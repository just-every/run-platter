import { Buffer } from 'node:buffer'
import type { Bindings } from '../../auth.server'
import type { Actor } from './index'
import { sha256 } from '../../modules/import-kit/src/d1/index.ts'
import { documentImportCommand, documentOwner } from './document-import'
import { captureQwilr } from './qwilr-api'
import { fail, requiredText } from './errors'

/** The token is used for this explicit read only; it never enters retained custody. */
export async function captureQwilrIntoMovein(env:Bindings,actor:Actor,input:Record<string,unknown>) {
 const db=env.DB,id=requiredText(input.id,'id')
 const current=async()=>{
  await documentOwner(db,actor)
  const move=await db.prepare('SELECT * FROM p_document_moveins WHERE id=? AND owner_id=?').bind(id,actor.id).first<any>()
  if(!move||move.source_provider!=='qwilr')fail('qwilr_movein_required',409,'Start a Qwilr move-in before reading its API')
  if(move.fingerprint)fail('import_frozen',409,'This reviewed move-in is frozen')
 }
 await current()
 if(input.consent!==true&&input.consent!=='yes')fail('consent_required',400,'Authorize reading the Qwilr pages visible to this token')
 const captured=await captureQwilr(input.token,current)
 // Provider I/O never authorizes a demoted person to retain the returned data.
 await current()
 const hash=sha256(captured.bytes),started=await documentImportCommand(db,actor,'document-import.upload-start',{id,filename:captured.filename,sha256:hash,size:captured.bytes.length}) as any
 for(let position=started.received;position<captured.bytes.length;position+=48000) {
  await documentImportCommand(db,actor,'document-import.upload-chunk',{id,sha256:hash,position,base64:Buffer.from(captured.bytes.subarray(position,position+48000)).toString('base64')})
 }
 if(!started.complete)await documentImportCommand(db,actor,'document-import.upload-finish',{id,sha256:hash})
 return {id,captured:true}
}

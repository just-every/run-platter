import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { zipSync, strToU8 } from 'fflate'

export const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function moveinFixture() {
 const make=async(title,label,signed=true)=>{
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica)
  pdf.setTitle(title);pdf.setSubject('Synthetic platter client');pdf.setCreationDate(new Date('2026-01-15T12:00:00Z'))
  pdf.addPage().drawText(label,{x:40,y:700,size:16,font})
  if(signed)pdf.addPage().drawText(label==='Synthetic platter 2'?'Signature page':'Certificate of completion',{x:40,y:700,size:16,font})
  return Buffer.from(await pdf.save())
 }
 const originals=await Promise.all([make('Alpha','Synthetic platter 1'),make('Beta','Synthetic platter 2'),make('Review','Synthetic platter 3'),make('Review','Synthetic platter 4'),make('Open','Synthetic platter 5',false)])
 const csv='Title,Client,Date,Status,Value\nAlpha,Synthetic platter client,2026-01-15,Completed,1200\nReview,Synthetic platter client,2026-01-15,Completed,2400\nBeta,Another client,2025-01-15,Completed,3600'
 const zips=[
  {filename:'first.zip',bytes:Buffer.from(zipSync({'Completed/Alpha.pdf':originals[0],'Completed/Beta.pdf':originals[1],'Review/first.pdf':originals[2],'readme.txt':strToU8('Synthetic export note')}))},
  {filename:'second.zip',bytes:Buffer.from(zipSync({'Completed/copy.pdf':originals[0],'Review/second.pdf':originals[3]}))},
  {filename:'third.zip',bytes:Buffer.from(zipSync({'Open/open.pdf':originals[4],'report.csv':strToU8(csv)}))},
 ]
 return {originals,zips,csv}
}
export async function uploadMovein(h,id,file,cookie=h.owner,position=0) {
 const sha256=hash(file.bytes),started=await h.cmd('document-import.upload-start',{id,filename:file.filename,sha256,size:file.bytes.length},cookie)
 for(let offset=Math.max(position,started.received);offset<file.bytes.length;offset+=48000){
  const bytes=file.bytes.subarray(offset,offset+48000)
  await h.cmd('document-import.upload-chunk',{id,sha256,position:offset,base64:bytes.toString('base64')},cookie)
 }
 if(!started.complete)await h.cmd('document-import.upload-finish',{id,sha256},cookie)
 return sha256
}
export async function applyMovein(h,fixture,cookie=h.owner) {
 const {id}=await h.cmd('document-import.create',{label:'Synthetic document move-in'},cookie)
 for(const file of fixture.zips)await uploadMovein(h,id,file,cookie)
 const preview=await h.cmd('document-import.preview',{id},cookie)
 assert.equal(preview.canApply,false)
 const ambiguous=preview.report.rows.find(r=>r.candidates.length===2)
 const choices={[ambiguous.id]:hash(fixture.originals[2])}
 const reviewed=await h.cmd('document-import.preview',{id,choices},cookie)
 let result=await h.cmd('document-import.apply',{id,choices,fingerprint:reviewed.fingerprint},cookie)
 while(result.job.state!=='completed')result=await h.cmd('document-import.continue',{id},cookie)
 return {id,reviewed,result}
}

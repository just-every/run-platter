import { PDFDocument } from 'pdf-lib'
import { need } from '../model'
import { readWord } from './word'

/** Shared Word conversion for draft editing and reviewed exported-file move-in. */
export async function wordContent(bytes:Uint8Array,catalog:any[],optionId:string,retain:(name:string,type:string,bytes:Uint8Array)=>Promise<string>,id:()=>string=()=>crypto.randomUUID(),tableOffset=0){
 const imported=readWord(bytes),parts:any[]=[],tables:any[]=[],report={unknown:imported.unknown,unmatched:[] as string[],missing:[...imported.missing]}
 for(const part of imported.parts){
  const blockId=id()
  if(part.type==='image'){
   const image=imported.files[part.path!],type=image[0]===137?'image/png':image[0]===255&&image[1]===216?'image/jpeg':'';need(type,'Word images must be PNG or JPEG')
   try{const probe=await PDFDocument.create(),decoded=type==='image/png'?await probe.embedPng(image):await probe.embedJpg(image);need(decoded.width*decoded.height<=16000000,'Word images must be at most 16 megapixels')}catch{need(false,'A Word image cannot be decoded')}
   parts.push({id:blockId,type:'image',title:'',text:'',assetId:await retain(part.path!.split('/').at(-1)!,type,image),alt:part.title});continue
  }
  if(part.type==='table'){
   const rows=part.text.split('\n').map(r=>r.split('\t')),headers=rows[0].map(h=>h.trim().toLowerCase()),column=(pattern:RegExp)=>headers.findIndex(h=>pattern.test(h)),price=column(/^(unit\s*)?price$|^rate$/),quantity=column(/^qty$|^quantity$/),sku=column(/^sku$/),name=column(/^name$|^item$|^product$|^description$/)
   if(price>=0||quantity>=0||sku>=0){
    need(price>=0,'A quote table needs a price column')
    const lines=rows.slice(1).filter(r=>r.some(c=>c.trim())).map((r,index)=>{const match=catalog.find(c=>sku>=0&&r[sku]&&String(c.sku).toLowerCase()===r[sku].toLowerCase())??catalog.find(c=>name>=0&&String(c.name).toLowerCase()===r[name]?.toLowerCase()),label=r[name]||match?.name||r[sku]||'Imported line '+(index+1);if(!match)report.unmatched.push(label);return {name:label,description:'',unit:'each',quantity:quantity>=0?r[quantity]:'1',unitPrice:r[price].replace(/[$,]/g,''),...(match?{catalogId:match.id}:{})}})
    parts.push({id:blockId,type:'pricing',title:'',text:'',optionId,tableIndex:tableOffset+tables.length});tables.push({optionId,name:'Imported quote',lines});report.missing.push('Quote table images absent from the Word download cannot be recovered.');continue
   }
  }
  parts.push({id:blockId,type:part.type,title:part.title,text:part.text,...(part.level?{headingLevel:part.level}:{})})
 }
 return {parts,tables,report}
}

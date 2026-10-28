import { mergeFields, type MergeFields } from '../variables'
import { embedUrl } from './embeds'
import { need } from '../model'

export const blockTypes = ['cover','heading','text','image','video','gallery','embed','columns','pricing','quote','bio','case_study','terms','field','signature','page_break','table'] as const
export type BlockType = typeof blockTypes[number]
export interface ProposalBlock { id:string; type:BlockType; headingLevel?:number;page?:number;x?:number;y?:number; title:string; text:string; second?:string; optionId?:string; tableIndex?:number; condition?:string; assetId?:string; posterId?:string; alt?:string; images?:{assetId:string;alt:string}[]; url?:string; consent?:boolean; fieldKind?:'text'|'date'|'checkbox'; required?:boolean; recipientRole?:'client'|'slot'; recipientId?:string }
export interface ProposalDocument { version:1; blocks:ProposalBlock[]; merge?:MergeFields;fixedPdf?:{fileId:string;pages:number};importReport?:{unknown:string[];unmatched:string[];missing:string[]}; brand?:{name:string; accent:string; ink:string; paper:string; font:'sans'|'serif'; cover:string;logoId?:string} }
const string=(value:unknown,max:number,label:string)=>{need(typeof value==='string'&&value.length<=max&& !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),'Enter '+label+' (up to '+max+' characters)');return value}
const color=(value:unknown)=>{need(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value),'Use six-digit brand colors');return value.toLowerCase()}
const luminance=(hex:string)=>{const parts=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return parts[0]*0.2126+parts[1]*0.7152+parts[2]*0.0722}
const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
/** Versioned, bounded data only. No HTML or executable styles. External frames use canonical allowlisted URLs. */
export function proposalDocument(value:unknown,options?:any[],clientId?:string):ProposalDocument {
 let parsed:any=value??{version:1,blocks:[]}
 if(typeof parsed==='string'){try{parsed=JSON.parse(parsed)}catch{need(false,'Invalid proposal document')}}
 need(parsed&&typeof parsed==='object'&&!Array.isArray(parsed),'Invalid proposal document')
 if(Object.keys(parsed).length===0)return {version:1,blocks:[]}
 need(parsed.version===1&&Array.isArray(parsed.blocks)&&parsed.blocks.length<=400,'Use document version 1 and at most 400 blocks')
 const ids=new Set<string>()
 const blocks:ProposalBlock[]=parsed.blocks.map((b:any)=>{
  need(b&&typeof b==='object'&&!Array.isArray(b)&&blockTypes.includes(b.type),'Choose a supported document block')
  need(typeof b.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(b.id)&&!ids.has(b.id),'Use distinct block ids');ids.add(b.id)
  const block:ProposalBlock={id:b.id,type:b.type,title:string(b.title??'',200,'a block heading'),text:string(b.text??'',10000,'block text')}
  if(['field','signature'].includes(b.type)){need(['client','slot'].includes(b.recipientRole),'Assign every field and signature to a recipient role');block.recipientRole=b.recipientRole;if(b.recipientRole==='slot'){block.recipientId=string(b.recipientId,100,'a recipient slot');need(/^[a-zA-Z0-9_-]+$/.test(block.recipientId),'Choose a recipient slot')}else if(clientId||b.recipientId)block.recipientId=string(clientId??b.recipientId,200,'a recipient id');if(b.type==='field'){need(['text','date','checkbox'].includes(b.fieldKind),'Choose text, date or checkbox');need(typeof b.required==='boolean','Choose whether this field is required');block.fieldKind=b.fieldKind;block.required=b.required}need(block.title.trim(),'Name each field or signature block')}
  if(['image','video'].includes(b.type)){block.assetId=string(b.assetId??'',80,'a media file id');need(/^[a-zA-Z0-9_-]+$/.test(block.assetId),'Choose a media file');block.alt=string(b.alt??'',1000,'an image description');need(block.alt.trim(),'Describe the image or video');if(b.type==='video'){block.posterId=string(b.posterId??'',80,'a video poster id');need(/^[a-zA-Z0-9_-]+$/.test(block.posterId),'Choose a video poster')}}
  if(b.type==='gallery'){
   need(Array.isArray(b.images)&&b.images.length>=1&&b.images.length<=12,'Choose between 1 and 12 gallery images')
   const seen=new Set<string>();block.images=b.images.map((image:any)=>{need(image&&typeof image==='object'&&!Array.isArray(image),'Choose a valid gallery image');const assetId=string(image.assetId??'',80,'a gallery file id'),alt=string(image.alt??'',1000,'a gallery image description');need(/^[a-zA-Z0-9_-]+$/.test(assetId)&&!seen.has(assetId)&&alt.trim(),'Choose distinct gallery files and describe every image');seen.add(assetId);return {assetId,alt}})
  }
  if(b.type==='embed'){
   block.url=embedUrl(b.url);need(b.consent===true,'Confirm external display consent');block.consent=true
   block.posterId=string(b.posterId??'',80,'an embed poster id');need(/^[a-zA-Z0-9_-]+$/.test(block.posterId),'Choose an uploaded embed poster')
   block.alt=string(b.alt??'',1000,'an embed description');need(block.alt.trim(),'Describe the external content')
  }
  if(b.headingLevel!==undefined){need(b.type==='heading'&&Number.isInteger(b.headingLevel)&&b.headingLevel>=1&&b.headingLevel<=6,'Choose a Word heading level');block.headingLevel=b.headingLevel}
  if(b.page!==undefined){need(['signature','field'].includes(b.type)&&Number.isInteger(b.page)&&b.page>=1&&b.page<=(parsed.fixedPdf?.pages??0),'Choose a fixed page for the field');block.page=b.page;for(const axis of ['x','y'] as const){need(Number.isFinite(b[axis])&&b[axis]>=0&&b[axis]<=1000,'Choose a valid field position');block[axis]=b[axis]}}
  if(b.type==='columns')block.second=string(b.second??'',10000,'the second column')
  if(b.type==='pricing'){
   need(typeof b.optionId==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(b.optionId)&&Number.isInteger(b.tableIndex)&&b.tableIndex>=0,'Choose a pricing table')
   need(!options||options.some(o=>o.id===b.optionId&&o.tables?.[b.tableIndex]),'Choose an existing package pricing table')
   block.optionId=b.optionId;block.tableIndex=b.tableIndex
  }
  if(b.condition){need(typeof b.condition==='string'&&/^(?:item:)?[a-zA-Z0-9_-]{1,80}$/.test(b.condition)&&(!options||options.some(o=>b.condition.startsWith('item:')?o.optionalItems?.some((i:any)=>'item:'+i.id===b.condition):o.id===b.condition)),'Choose an offered package or optional item for block visibility');block.condition=b.condition}
  return block
 })
 let brand:ProposalDocument['brand']
 if(parsed.brand){const b=parsed.brand;need(b&&typeof b==='object'&&!Array.isArray(b),'Invalid brand kit');const accent=color(b.accent),ink=color(b.ink),paper=color(b.paper);need(contrast(ink,paper)>=4.5&&contrast(accent,paper)>=4.5,'Brand text and accent must have at least 4.5:1 contrast against the paper');need(['sans','serif'].includes(b.font),'Choose a supported brand font');brand={name:string(b.name??'',200,'a brand name'),accent,ink,paper,font:b.font,cover:string(b.cover??'',200,'a default cover heading'),...(b.logoId?{logoId:string(b.logoId,80,'a logo file id')}:{})}}
 let fixedPdf:ProposalDocument['fixedPdf'];if(parsed.fixedPdf){const f=parsed.fixedPdf;need(typeof f.fileId==='string'&&/^[A-Za-z0-9_-]+$/.test(f.fileId)&&Number.isInteger(f.pages)&&f.pages>0&&f.pages<=100,'Choose a retained PDF');fixedPdf={fileId:f.fileId,pages:f.pages}}
 let importReport:ProposalDocument['importReport'];if(parsed.importReport){importReport={unknown:[],unmatched:[],missing:[]};for(const k of ['unknown','unmatched','missing'] as const){const values=parsed.importReport[k];need(Array.isArray(values)&&values.length<=500&&values.every(v=>typeof v==='string'&&v.length<=1000),'Invalid import report');importReport[k]=values}}
 const merge=mergeFields(parsed.merge)
 const document:ProposalDocument={version:1,blocks,...(brand?{brand}:{}),...(merge?{merge}:{}),...(fixedPdf?{fixedPdf}:{}),...(importReport?{importReport}:{})}
 need(new TextEncoder().encode(JSON.stringify(document)).length<=100000,'Document exceeds the 100 KB content limit')
 return document
}
export function documentOf(row:any){return proposalDocument(row.document)}
export function documentFields(row:any){const doc=documentOf(row);return doc.blocks.length||doc.brand||doc.merge||doc.fixedPdf?{document:doc}:{}}
export function selectedDocument(value:unknown,optionId:string,items:{id:string}[]=[]){const doc=proposalDocument(value);return {...doc,blocks:doc.blocks.filter(b=>!b.condition||(b.condition.startsWith('item:')?items.some(i=>'item:'+i.id===b.condition):b.condition===optionId))}}
export function documentText(value:unknown){const doc=proposalDocument(value);return doc.blocks.map(b=>[b.type,b.title,b.text,b.second??'',b.alt??'',...(b.images??[]).map(image=>image.alt)].filter(Boolean).join('\n')).join('\n\n')}

/** The single Client slot is rebound deliberately when a person chooses a new client. */
export function bindDocument(value:unknown,clientId?:string){const doc=proposalDocument(value);return {...doc,blocks:doc.blocks.map(block=>{if(!['field','signature'].includes(block.type)||block.recipientRole==='slot')return block;const {recipientId,...rest}=block;return {...rest,...(clientId?{recipientId:clientId}:{})}})}}
export const fieldSlot=(block:ProposalBlock,clientSlot?:string)=>block.recipientRole==='slot'?block.recipientId:clientSlot
export function acceptanceFields(document:unknown,input:Record<string,unknown>,signer:string,slotId?:string,clientSlot?:string){
 const blocks=proposalDocument(document).blocks.filter(b=>['field','signature'].includes(b.type)&&(!slotId||fieldSlot(b,clientSlot)===slotId)),values:Record<string,string|boolean>={}
 for(const key of Object.keys(input).filter(k=>k.startsWith('field:')||k.startsWith('signature:')))need(blocks.some(b=>(b.type==='signature'?'signature:':'field:')+b.id===key),'A field does not belong to this selected document')
 for(const block of blocks){const key=(block.type==='signature'?'signature:':'field:')+block.id,value=input[key]
  if(block.type==='signature'){need(typeof value==='string'&&value.trim()===signer,'Adopt the same full name in '+block.title+' as your acceptance name');values[block.id]=value.trim();continue}
  if(block.fieldKind==='checkbox'){need(value===undefined||typeof value==='boolean'||['on','yes'].includes(String(value)),'Choose a valid checkbox value');const checked=value===true||value==='on'||value==='yes';need(!block.required||checked,'Complete required field: '+block.title);values[block.id]=checked;continue}
  need(value===undefined||typeof value==='string','Enter text for '+block.title);const written=String(value??'').trim();need(written.length<=1000,'Use up to 1000 characters for '+block.title);need(!block.required||written,'Complete required field: '+block.title)
  if(written&&block.fieldKind==='date')need(/^\d{4}-\d{2}-\d{2}$/.test(written)&&!Number.isNaN(Date.parse(written+'T00:00:00Z'))&&new Date(written+'T00:00:00Z').toISOString().slice(0,10)===written,'Enter a valid calendar date for '+block.title)
  values[block.id]=written
 }
 return Object.keys(values).length?values:undefined
}

export function documentTextTargets(row:any){return documentOf(row).blocks.filter(b=>b.type!=='page_break').flatMap(b=>['title','text',...(b.type==='columns'?['second']:[])].map(key=>({section:'block:'+b.id+':'+key,label:(b.title||b.type)+' — '+(key==='second'?'second column':key),id:b.id,key})))}
export function blockTextTarget(row:any,section:string){const target=documentTextTargets(row).find(t=>t.section===section);need(target,'Choose a text field in this document');return target}

export const legalText=(row:any)=>JSON.stringify([String(row.terms??''),documentOf(row).blocks.filter(b=>b.type==='terms').map(({title,text,condition})=>({title,text,...(condition?{condition}:{})})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))])

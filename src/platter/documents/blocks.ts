import { need } from '../model'

export const blockTypes = ['cover','heading','text','image','video','columns','pricing','quote','bio','case_study','terms','field','signature','page_break'] as const
export type BlockType = typeof blockTypes[number]
export interface ProposalBlock { id:string; type:BlockType; title:string; text:string; second?:string; optionId?:string; tableIndex?:number; condition?:string; assetId?:string; posterId?:string; alt?:string; fieldKind?:'text'|'date'|'checkbox'; required?:boolean; recipientRole?:'client'; recipientId?:string }
export interface ProposalDocument { version:1; blocks:ProposalBlock[]; brand?:{name:string; accent:string; ink:string; paper:string; font:'sans'|'serif'; cover:string;logoId?:string} }
const string=(value:unknown,max:number,label:string)=>{need(typeof value==='string'&&value.length<=max&& !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),'Enter '+label+' (up to '+max+' characters)');return value}
const color=(value:unknown)=>{need(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value),'Use six-digit brand colors');return value.toLowerCase()}
const luminance=(hex:string)=>{const parts=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return parts[0]*0.2126+parts[1]*0.7152+parts[2]*0.0722}
const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
/** Versioned, bounded data only. No HTML, URLs, executable styles or external resources. */
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
  if(['field','signature'].includes(b.type)){need(b.recipientRole==='client','Assign every field and signature to the Client recipient role');block.recipientRole='client';if(clientId||b.recipientId)block.recipientId=string(clientId??b.recipientId,200,'a recipient id');if(b.type==='field'){need(['text','date','checkbox'].includes(b.fieldKind),'Choose text, date or checkbox');need(typeof b.required==='boolean','Choose whether this field is required');block.fieldKind=b.fieldKind;block.required=b.required}need(block.title.trim(),'Name each field or signature block')}
  if(['image','video'].includes(b.type)){block.assetId=string(b.assetId??'',80,'a media file id');need(/^[a-zA-Z0-9_-]+$/.test(block.assetId),'Choose a media file');block.alt=string(b.alt??'',1000,'an image description');need(block.alt.trim(),'Describe the image or video');if(b.type==='video'){block.posterId=string(b.posterId??'',80,'a video poster id');need(/^[a-zA-Z0-9_-]+$/.test(block.posterId),'Choose a video poster')}}
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
 const document:ProposalDocument={version:1,blocks,...(brand?{brand}:{})}
 need(new TextEncoder().encode(JSON.stringify(document)).length<=100000,'Document exceeds the 100 KB content limit')
 return document
}
export function documentOf(row:any){return proposalDocument(row.document)}
export function documentFields(row:any){const doc=documentOf(row);return doc.blocks.length||doc.brand?{document:doc}:{}}
export function selectedDocument(value:unknown,optionId:string,items:{id:string}[]=[]){const doc=proposalDocument(value);return {...doc,blocks:doc.blocks.filter(b=>!b.condition||(b.condition.startsWith('item:')?items.some(i=>'item:'+i.id===b.condition):b.condition===optionId))}}
export function documentText(value:unknown){const doc=proposalDocument(value);return doc.blocks.map(b=>[b.type,b.title,b.text,b.second??''].filter(Boolean).join('\n')).join('\n\n')}

/** The single Client slot is rebound deliberately when a person chooses a new client. */
export function bindDocument(value:unknown,clientId?:string){const doc=proposalDocument(value);return {...doc,blocks:doc.blocks.map(block=>{if(!['field','signature'].includes(block.type))return block;const {recipientId,...rest}=block;return {...rest,...(clientId?{recipientId:clientId}:{})}})}}
export function acceptanceFields(document:unknown,input:Record<string,unknown>,signer:string){
 const blocks=proposalDocument(document).blocks.filter(b=>['field','signature'].includes(b.type)),values:Record<string,string|boolean>={}
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

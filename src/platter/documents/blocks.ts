import { need } from '../model'

export const blockTypes = ['cover','heading','text','columns','pricing','quote','bio','case_study','terms','page_break'] as const
export type BlockType = typeof blockTypes[number]
export interface ProposalBlock { id:string; type:BlockType; title:string; text:string; second?:string; optionId?:string; tableIndex?:number; condition?:string }
export interface ProposalDocument { version:1; blocks:ProposalBlock[]; brand?:{name:string; accent:string; ink:string; paper:string; font:'sans'|'serif'; cover:string} }
const string=(value:unknown,max:number,label:string)=>{need(typeof value==='string'&&value.length<=max&& !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),'Enter '+label+' (up to '+max+' characters)');return value}
const color=(value:unknown)=>{need(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value),'Use six-digit brand colors');return value.toLowerCase()}
const luminance=(hex:string)=>{const parts=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return parts[0]*0.2126+parts[1]*0.7152+parts[2]*0.0722}
const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
/** Versioned, bounded data only. No HTML, URLs, executable styles or external resources. */
export function proposalDocument(value:unknown,options?:any[]):ProposalDocument {
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
 if(parsed.brand){const b=parsed.brand;need(b&&typeof b==='object'&&!Array.isArray(b),'Invalid brand kit');const accent=color(b.accent),ink=color(b.ink),paper=color(b.paper);need(contrast(ink,paper)>=4.5&&contrast(accent,paper)>=4.5,'Brand text and accent must have at least 4.5:1 contrast against the paper');need(['sans','serif'].includes(b.font),'Choose a supported brand font');brand={name:string(b.name??'',200,'a brand name'),accent,ink,paper,font:b.font,cover:string(b.cover??'',200,'a default cover heading')}}
 const document:ProposalDocument={version:1,blocks,...(brand?{brand}:{})}
 need(new TextEncoder().encode(JSON.stringify(document)).length<=100000,'Document exceeds the 100 KB content limit')
 return document
}
export function documentOf(row:any){return proposalDocument(row.document)}
export function documentFields(row:any){const doc=documentOf(row);return doc.blocks.length||doc.brand?{document:doc}:{}}
export function selectedDocument(value:unknown,optionId:string,items:{id:string}[]=[]){const doc=proposalDocument(value);return {...doc,blocks:doc.blocks.filter(b=>!b.condition||(b.condition.startsWith('item:')?items.some(i=>'item:'+i.id===b.condition):b.condition===optionId))}}
export function documentText(value:unknown){const doc=proposalDocument(value);return doc.blocks.map(b=>[b.type,b.title,b.text,b.second??''].filter(Boolean).join('\n')).join('\n\n')}

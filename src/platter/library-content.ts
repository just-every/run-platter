import { documentOf, type ProposalBlock } from './documents/blocks'
import { mediaFiles, validateDocumentMedia } from './documents/media'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { permitted } from './permissions'
import { need, snapshot, type Actor } from './model'
export const richLibraryKinds=['image','video','pricing']
export const libraryKind=(item:any)=>item.rich_kind??item.kind
export const libraryBlockType=(kind:string)=>({section:'text',testimonial:'quote'}[kind]??kind)
export function libraryBlock(item:any,id:string,optionId?:string,tableIndex?:number):ProposalBlock {
 const kind=libraryKind(item)
 if(kind==='imported')return {...JSON.parse(item.content).block,id}
 const extra=richLibraryKinds.includes(kind)?JSON.parse(item.content).block:{}
 return {...extra,id,type:libraryBlockType(kind),title:item.title,text:richLibraryKinds.includes(kind)?extra.text:item.content,...(kind==='pricing'?{optionId,tableIndex}:{})}
}
export function libraryMatches(block:any,use:any,options:any[]=[]){
 if(!block)return false
 const expected=libraryBlock({...use,title:use.source_title??use.title},block.id,block.optionId,block.tableIndex)
 if(Object.keys(block).length!==Object.keys(expected).length||Object.keys(block).some(key=>block[key]!==expected[key as keyof ProposalBlock]))return false
 if(use.kind==='imported'){const saved=JSON.parse(use.content);return !saved.table||JSON.stringify(options.find(o=>o.id===block.optionId)?.tables?.[block.tableIndex])===JSON.stringify(saved.table)}
 return use.kind!=='pricing'||JSON.stringify(options.find(o=>o.id===block.optionId)?.tables?.[block.tableIndex])===JSON.stringify(JSON.parse(use.content).table)
}
export async function captureLibraryContent(db:D1Database,a:Actor,p:Record<string,unknown>,old:any,kind:string){
 if(!richLibraryKinds.includes(kind))return {content:p.content,files:[],guard:{sql:'1',values:[] as any[]}}
 if(!p.sourceRef){need(old&&libraryKind(old)===kind,'Choose a placed source block');return {content:old.content,files:null,guard:{sql:'1',values:[] as any[]}}}
 need(p.shareConsent===true||p.shareConsent==='yes','Authorize sharing this source content with the library audience')
 const [id,blockId]=String(p.sourceRef).split(':'),source=await permitted(db,a,id,'edit'),row=negotiatedView(source,await pendingNegotiation(db,id)),block=documentOf(row).blocks.find(b=>b.id===blockId)
 need(block?.type===kind,'Choose a placed block of the selected content type')
 await validateDocumentMedia(db,{version:1,blocks:[block]},id)
 const {id:ignored,title,condition,optionId,tableIndex,...data}=block
 const table=kind==='pricing'?snapshot(row).options.find((o:any)=>o.id===optionId)?.tables?.[tableIndex!]:undefined
 if(kind==='pricing'){need(row.currency==='USD'&&table,'Choose a USD pricing table')}
 const ids=[block.assetId,block.posterId].filter(Boolean),files=(await mediaFiles(db,id)).filter(f=>ids.includes(f.id)).map(f=>f.id)
 return {content:JSON.stringify({block:data,...(table?{table}:{})}),files,guard:{sql:'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?)',values:[id,source.version]}}
}

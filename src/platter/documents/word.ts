import { PDFDocument } from 'pdf-lib'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import { XMLParser } from 'fast-xml-parser'
import { need } from '../model'
export const wordTokenMapping:Record<string,string>={'Client.Company':'Client.Company','Client.FirstName':'Client.FirstName','Client.LastName':'Client.LastName','Client.Title':'Contact.Title','Client.Address':'Client.Address','Sender.FirstName':'Sender.FirstName','Sender.LastName':'Sender.LastName','Sender.Email':'Sender.Email','Document.Name':'Deal.Name','Deal.Name':'Deal.Name','Deal.Amount':'Deal.Amount'}
const xml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')
const parser=new XMLParser({preserveOrder:true,ignoreAttributes:false,attributeNamePrefix:'',parseTagValue:false,trimValues:false,processEntities:false})
const key=(node:any)=>Object.keys(node).find(k=>k!==':@')??''
const children=(nodes:any[],name:string):any[]=>nodes.flatMap(n=>key(n)===name?n[name]:[])
const descendants=(nodes:any[],name:string):any[]=>nodes.flatMap(n=>[...(key(n)===name?[n]:[]),...(Array.isArray(n[key(n)])?descendants(n[key(n)],name):[])])
const decode=(s:string)=>s.replace(/&(?:amp|lt|gt|quot|apos);/g,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m]!))
function content(nodes:any[]):string{return nodes.map(n=>key(n)==='#text'?decode(String(n['#text'])):key(n)==='w:tab'?'\t':key(n)==='w:br'?'\n':Array.isArray(n[key(n)])?content(n[key(n)]):'').join('')}
export type WordPart={type:'heading'|'text'|'table'|'image';title:string;text:string;level?:number;path?:string}
export function readWord(bytes:Uint8Array){
 let total=0;const files=unzipSync(bytes,{filter:file=>{total+=file.originalSize;need(total<=25*1024*1024&&file.originalSize<=10*1024*1024,'Word contents exceed the import limit',413);return true}})
 need(files['word/document.xml'],'Upload a Word document')
 const parse=(name:string)=>{const source=strFromU8(files[name]??new Uint8Array());need(!/<!DOCTYPE|<!ENTITY/i.test(source),'Word entity declarations are refused');return parser.parse(source)}
 const document=parse('word/document.xml'),rels=files['word/_rels/document.xml.rels']?parse('word/_rels/document.xml.rels'):[],relationships=new Map(descendants(rels,'Relationship').filter(n=>n[':@']?.TargetMode!=='External').map(n=>[n[':@'].Id,'word/'+n[':@'].Target.replace(/^\.\//,'')]))
 const numbering=files['word/numbering.xml']?parse('word/numbering.xml'):[],numKinds=new Map<string,string>(),abstract=new Map(descendants(numbering,'w:abstractNum').map(n=>[n[':@']?.['w:abstractNumId'],descendants(n['w:abstractNum'],'w:numFmt')[0]?.[':@']?.['w:val']??'bullet']));for(const n of descendants(numbering,'w:num'))numKinds.set(n[':@']?.['w:numId'],abstract.get(descendants(n['w:num'],'w:abstractNumId')[0]?.[':@']?.['w:val'])??'bullet');const counts=new Map<string,number>()
 const parts:WordPart[]=[],unknown=new Set<string>(),missing:string[]=[]
 const tokens=(text:string)=>text.replace(/\[([A-Za-z][A-Za-z0-9_. ]{0,99})\]/g,(_,token)=>{const mapped=wordTokenMapping[token]??'Custom.'+token.replace(/[^A-Za-z0-9_]/g,'_');if(!wordTokenMapping[token])unknown.add(mapped);return '{{'+mapped+'}}'})
 const body=children(children(document,'w:document'),'w:body')
 for(const node of body){
  if(key(node)==='w:p'){
   const nodes=node['w:p'],style=descendants(nodes,'w:pStyle')[0]?.[':@']?.['w:val']??'',heading=/^Heading\s*([1-6])$/i.exec(style),text=tokens(content(nodes)),listed=descendants(nodes,'w:numPr').length>0
   const num=descendants(nodes,'w:numId')[0]?.[':@']?.['w:val'],level=descendants(nodes,'w:ilvl')[0]?.[':@']?.['w:val']??'0',count=(counts.get(num+':'+level)??0)+1;if(listed)counts.set(num+':'+level,count);const prefix=listed?'  '.repeat(Math.min(10,Number(level)||0))+(numKinds.get(num)==='decimal'?count+'. ':'- '):''
   if(text.trim())parts.push({type:heading?'heading':'text',title:heading?text:'',text:heading?'':prefix+text,...(heading?{level:Number(heading[1])}:{})})
   for(const image of descendants(nodes,'a:blip')){const id=image[':@']?.['r:embed'],path=relationships.get(id);if(path&&files[path])parts.push({type:'image',title:'Imported image',text:'',path});else missing.push('Image '+(id??'without an embedded source'))}
  }else if(key(node)==='w:tbl'){
   const rows=children(node['w:tbl'],'w:tr').length?node['w:tbl'].filter((n:any)=>key(n)==='w:tr').map((row:any)=>row['w:tr'].filter((cell:any)=>key(cell)==='w:tc').map((cell:any)=>tokens(content(cell['w:tc'])))):[]
   if(rows.length)parts.push({type:'table',title:'Imported table',text:rows.map((r:string[])=>r.join('\t')).join('\n')})
   for(const image of descendants(node['w:tbl'],'a:blip')){const id=image[':@']?.['r:embed'],path=relationships.get(id);if(path&&files[path])parts.push({type:'image',title:'Imported table image',text:'',path});else missing.push('Table image '+(id??'without an embedded source'))}
  }
 }
 need(parts.length>0&&parts.length<=400,'Import between 1 and 400 document blocks')
 return {parts,files,unknown:[...unknown],missing}
}
const paragraph=(text:string,heading?:number)=>'<w:p>'+(heading?'<w:pPr><w:pStyle w:val="Heading'+heading+'"/></w:pPr>':'')+'<w:r><w:t xml:space="preserve">'+xml(text)+'</w:t></w:r></w:p>'
const table=(rows:string[][])=>'<w:tbl>'+rows.map(row=>'<w:tr>'+row.map(cell=>'<w:tc>'+paragraph(cell)+'</w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>'
export async function writeWord(view:any,media:(id:string)=>Promise<Uint8Array>,fixedImages:Uint8Array[]=[]){
 const files:Record<string,Uint8Array>={},rels:string[]=[],blocks=view.document?.blocks??[],body:string[]=[];let imageIndex=0
 const imageBytes=async(bytes:Uint8Array,width=3657600)=>{const ext=bytes[0]===137?'png':'jpg',index=++imageIndex,name='image'+index+'.'+ext;const probe=await PDFDocument.create(),dimensions=bytes[0]===137?await probe.embedPng(bytes):await probe.embedJpg(bytes);width=Math.min(width,Math.round(8000000*dimensions.width/dimensions.height));const height=Math.round(width*dimensions.height/dimensions.width);files['word/media/'+name]=bytes;rels.push('<Relationship Id="rId'+index+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+name+'"/>');return '<w:p><w:r><w:drawing><wp:inline><wp:extent cx="'+width+'" cy="'+height+'"/><wp:docPr id="'+index+'" name="Image '+index+'"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+index+'" name="Image '+index+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId'+index+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+width+'" cy="'+height+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'}
 const prices=(optionId:string,index:number)=>{const t=view.options.find((o:any)=>o.id===optionId)?.tables?.[index];return t?table([['Name','Quantity','Unit price','Total'],...t.lines.map((l:any)=>[l.name,String(l.quantity),String(l.unitPrice??''),(l.lineTotalCents/100).toFixed(2)])]):''}
 if(view.document?.fixedPdf){need(fixedImages.length===view.document.fixedPdf.pages,'Render every fixed PDF page before exporting Word',409);for(const bytes of fixedImages)body.push(await imageBytes(bytes,5486400),'<w:p><w:r><w:br w:type="page"/></w:r></w:p>');files['word/embeddings/original.pdf']=await media(view.document.fixedPdf.fileId)}
 body.push(paragraph(view.title))
 for(const b of blocks){if(b.type==='pricing')body.push(prices(b.optionId,b.tableIndex));else if(b.type==='image')body.push(await imageBytes(await media(b.assetId)));else if(b.type==='gallery')for(const i of b.images)body.push(await imageBytes(await media(i.assetId)));else if(['video','embed'].includes(b.type))body.push(await imageBytes(await media(b.posterId)),paragraph(b.url??b.alt??''));else if(b.type==='table')body.push(table(b.text.split('\n').map((r:string)=>r.split('\t'))));else{if(b.title)body.push(paragraph(b.title,b.type==='heading'?b.headingLevel??1:undefined));if(b.text)body.push(paragraph(b.text));if(b.second)body.push(paragraph(b.second))}}
 if(view.scope)body.push(paragraph('Scope of work'),paragraph(view.scope));if(view.terms)body.push(paragraph('Terms'),paragraph(view.terms))
 for(const o of view.options)for(let i=0;i<(o.tables?.length??0);i++)if(!blocks.some((b:any)=>b.type==='pricing'&&b.optionId===o.id&&b.tableIndex===i))body.push(prices(o.id,i))
 const document='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+body.join('')+'<w:sectPr/></w:body></w:document>'
 files['word/document.xml']=strToU8(document);files['word/styles.xml']=strToU8('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+[1,2,3,4,5,6].map(i=>'<w:style w:type="paragraph" w:styleId="Heading'+i+'"><w:name w:val="heading '+i+'"/><w:pPr><w:outlineLvl w:val="'+(i-1)+'"/></w:pPr></w:style>').join('')+'</w:styles>')
 files['word/_rels/document.xml.rels']=strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels.join('')+'<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
 files['_rels/.rels']=strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="document" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
 files['[Content_Types].xml']=strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="pdf" ContentType="application/pdf"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>')
 return zipSync(files)
}

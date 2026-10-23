import { documentOf } from '../documents/blocks'
import { escape, form, hidden, proposalPath } from './shared'
import { pricingTables } from './pricing'
export const blockNames:Record<string,string>={cover:'Cover page',heading:'Heading',text:'Text',columns:'Columns',pricing:'Pricing table',quote:'Quote or testimonial',bio:'Team bio',case_study:'Case study',terms:'Terms',page_break:'Page break'}
/** Escaped text with a small, explicit formatting vocabulary; never accepts HTML. */
export function richText(value:string){return value.split('\n').map(line=>{const escaped=escape(line);return '<p>'+escaped.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/_([^_]+)_/g,'<em>$1</em>').replace(/^- /,'• ')+'</p>'}).join('')}
export function documentBlocks(view:any){
 const doc=documentOf(view)
 if(!doc.blocks.length)return ''
 return '<article class="proposal-document" aria-label="Proposal document">'+(doc.brand?.name?'<p class="document-brand">'+escape(doc.brand.name)+'</p>':'')+doc.blocks.map(b=>{
  let body=b.title?'<h2>'+escape(b.title)+'</h2>':''
  if(b.type==='page_break')return '<hr class="document-page-break" aria-label="Page break" data-document-block="'+escape(b.id)+'">'
  if(b.type==='pricing'){const option=(view.options??[]).find((o:any)=>o.id===b.optionId),table=option?.tables?.[b.tableIndex??0];body+=table?pricingTables([{...option,tables:[table]}],view.currency):'<p>Pricing table unavailable.</p>'}
  else if(b.type==='columns')body+='<div class="document-columns"><div>'+richText(b.text)+'</div><div>'+richText(b.second??'')+'</div></div>'
  else if(b.type==='quote')body+='<blockquote>'+richText(b.text)+'</blockquote>'
  else body+=richText(b.text)
  return '<section class="document-block document-'+escape(b.type)+'" data-document-block="'+escape(b.id)+'">'+body+'</section>'
 }).join('')+'</article>'
}
export function documentBrandCss(view:any){const b=documentOf(view).brand;return b?`.proposal-document{--document-accent:${b.accent};color:${b.ink};background:${b.paper};font-family:${b.font==='serif'?'var(--pl-serif)':'var(--pl-sans)'}}`:''}
export function blockEditor(p:any){
 const doc=documentOf(p),path=proposalPath(p.id)
 const palette=Object.entries(blockNames).map(([type,name])=>'<option value="'+type+'">'+name+'</option>').join('')
 const content=hidden('id',p.id)+hidden('version',p.version)+hidden('document',JSON.stringify(doc))
 +'<p>Build your document in reading order. Use **bold**, _italic_ and lines starting with - for lists. Client pages and PDFs use this same content.</p>'
 +'<div class="document-toolbar"><label>Block type<select data-block-type>'+palette+'</select></label><button type="button" data-block-add>Add block</button><button type="button" class="secondary" data-block-undo disabled>Undo</button><button data-document-save>Save document</button></div>'
 +'<p role="status" aria-live="polite" data-document-status>Revision '+escape(p.revision)+' saved. Changes autosave after a pause.</p><p data-document-error role="alert"></p>'
 +'<div data-document-blocks></div><details class="document-brand-kit"><summary>Brand kit</summary><label>Brand name<input data-brand="name" maxlength="200"></label><label>Accent color<input data-brand="accent" value="#7c144a" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Text color<input data-brand="ink" value="#1c1c24" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Paper color<input data-brand="paper" value="#ffffff" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Document font<select data-brand="font"><option value="serif">Serif</option><option value="sans">Sans serif</option></select></label><label>Default cover heading<input data-brand="cover" maxlength="200"></label><button type="button" class="secondary" data-brand-apply>Apply brand kit</button><p>Colors need at least 4.5:1 contrast on the paper. A new cover uses the default cover heading.</p></details>'
 +'<noscript><p>The block editor needs JavaScript. Existing content stays preserved when you use the proposal form.</p></noscript>'
 +'<script src="/document-editor.js" defer></script>'
 return '<section class="panel document-editor" aria-labelledby="document-editor-heading"><h2 id="document-editor-heading">Document blocks</h2>'+form('proposal.document',path,content).replace('<form ','<form data-document-editor data-revision="'+escape(p.revision)+'" data-lock-terms="'+(p.lockedSections?.includes('terms')?'yes':'no')+'" data-options="'+escape(JSON.stringify(p.options))+'" ')+'</section>'
}

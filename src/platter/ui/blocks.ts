import { documentOf } from '../documents/blocks'
import { escape, form, hidden, proposalPath } from './shared'
import { pricingTables } from './pricing'
export const blockNames:Record<string,string>={cover:'Cover page',heading:'Heading',text:'Text',image:'Image',video:'Video',columns:'Columns',pricing:'Pricing table',quote:'Quote or testimonial',bio:'Team bio',case_study:'Case study',terms:'Terms',field:'Form field',signature:'Signature block',page_break:'Page break'}
/** Escaped text with a small, explicit formatting vocabulary; never accepts HTML. */
export function richText(value:string){return value.split('\n').map(line=>{const escaped=escape(line);return '<p>'+escaped.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/_([^_]+)_/g,'<em>$1</em>').replace(/^- /,'• ')+'</p>'}).join('')}
export function documentBlocks(view:any,mediaBase='',suffix=''){
 const doc=documentOf(view)
 if(!doc.blocks.length)return ''
 const media=(id:string)=>escape(mediaBase+encodeURIComponent(id)+suffix)
 return '<article class="proposal-document" aria-label="Proposal document">'+(doc.brand?.logoId?'<img class="document-logo" src="'+media(doc.brand.logoId)+'" alt="'+escape(doc.brand.name||'Firm logo')+'" width="200" height="100">':'')+(doc.brand?.name?'<p class="document-brand">'+escape(doc.brand.name)+'</p>':'')+doc.blocks.map(b=>{
  let body=b.title?'<h2>'+escape(b.title)+'</h2>':''
  if(b.type==='page_break')return '<hr class="document-page-break" aria-label="Page break" data-document-block="'+escape(b.id)+'">'
  if(b.type==='field'||b.type==='signature'){
   const value=view.acceptance?.fieldValues?.[b.id],disabled=view.preview||!view.verified||view.status==='accepted',name=(b.type==='signature'?'signature:':'field:')+b.id
   body+='<p class="muted">Assigned to the Client recipient'+(b.recipientId?'':' role')+'.</p>'
   if(view.status==='accepted')body+='<p>'+escape(value===undefined?'Not collected':value===true?'Yes':value===false?'No':value)+'</p>'
   else {const kind=b.type==='signature'?'text':b.fieldKind,required=b.type==='signature'||b.required;body+='<label>'+escape(b.type==='signature'?'Type your full name for '+b.title:b.title)+'<input form="platter-acceptance" name="'+escape(name)+'" type="'+escape(kind)+'"'+(kind==='checkbox'?' value="yes"':' maxlength="1000"')+(required?' required':'')+(disabled?' disabled':'')+'></label>'+(b.type==='signature'?'<p>By accepting below, you adopt this typed name as your signature for this block. It must match your acceptance name.</p>':'')}
   if(b.text)body+=richText(b.text)
  }
  else if(b.type==='image')body+='<figure><img src="'+media(b.assetId!)+'" alt="'+escape(b.alt)+'" loading="lazy" decoding="async" width="1280" height="720">'+(b.text?'<figcaption>'+escape(b.text)+'</figcaption>':'')+'</figure>'
  else if(b.type==='video')body+='<video controls preload="none" poster="'+media(b.posterId!)+'" aria-label="'+escape(b.alt)+'" width="1280" height="720"><source src="'+media(b.assetId!)+'"><a href="'+media(b.assetId!)+'">Download video</a></video>'+richText(b.text)
  else if(b.type==='pricing'){const option=(view.options??[]).find((o:any)=>o.id===b.optionId),table=option?.tables?.[b.tableIndex??0];body+=table?pricingTables([{...option,tables:[table]}],view.currency):'<p>Pricing table unavailable.</p>'}
  else if(b.type==='columns')body+='<div class="document-column-grid"><div>'+richText(b.text)+'</div><div>'+richText(b.second??'')+'</div></div>'
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
 +'<div data-document-blocks></div><details class="document-brand-kit"><summary>Brand kit</summary><label>Brand name<input data-brand="name" maxlength="200"></label><label>Accent color<input data-brand="accent" value="#7c144a" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Text color<input data-brand="ink" value="#1c1c24" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Paper color<input data-brand="paper" value="#ffffff" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Document font<select data-brand="font"><option value="serif">Serif</option><option value="sans">Sans serif</option></select></label><label>Logo<select data-brand="logoId"><option value="">No logo</option>'+ (p.documentMedia??[]).filter((f:any)=>f.mediaType.startsWith('image/')).map((f:any)=>'<option value="'+escape(f.id)+'">'+escape(f.filename)+'</option>').join('')+'</select></label><label>Default cover heading<input data-brand="cover" maxlength="200"></label><button type="button" class="secondary" data-brand-apply>Apply brand kit</button><p>Colors need at least 4.5:1 contrast on the paper. A new cover uses the default cover heading.</p></details>'
 +'<noscript><p>The block editor needs JavaScript. Existing content stays preserved when you use the proposal form.</p></noscript>'
 +'<script src="/document-editor.js" defer></script>'
 return '<section class="panel document-editor" aria-labelledby="document-editor-heading"><h2 id="document-editor-heading">Document blocks</h2>'+form('proposal.document',path,content).replace('<form ','<form data-document-editor data-revision="'+escape(p.revision)+'" data-lock-terms="'+(p.lockedSections?.includes('terms')?'yes':'no')+'" data-options="'+escape(JSON.stringify(p.options))+'" data-media="'+escape(JSON.stringify(p.documentMedia??[]))+'" ')+`<details><summary>Upload display media</summary><p>Upload images (PNG/JPEG, up to 5 MiB and 16 megapixels) or video (MP4/WebM, up to 20 MiB). Video blocks need an uploaded image poster. Attachments remain download-only.</p><form method="post" enctype="multipart/form-data" action="/app/document-media">${hidden('id',p.id)}${hidden('version',p.version)}<label>Display media file<input name="file" type="file" accept="image/png,image/jpeg,video/mp4,video/webm" required></label><label class="choice"><input type="checkbox" name="consent" value="yes" required>I authorize displaying this file to the recipients of this proposal when I place it in a block or brand kit.</label><button>Upload display media</button></form></details>`+'</section>'
}

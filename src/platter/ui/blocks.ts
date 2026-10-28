import { ui } from '../locales'
import { recipientPlan } from '../recipients'
import { fieldSlot } from '../documents/blocks'
import { displayOptions } from '../discounts'
import { documentOf } from '../documents/blocks'
import { embedProvider } from '../documents/embeds'
import { escape, form, hidden, proposalPath } from './shared'
import { pricingTables } from './pricing'
export const blockNames:Record<string,string>={table:'Text table',cover:'Cover page',heading:'Heading',text:'Text',image:'Image',video:'Video',gallery:'Image gallery',embed:'External embed',columns:'Columns',pricing:'Pricing table',quote:'Quote or testimonial',bio:'Team bio',case_study:'Case study',terms:'Terms',field:'Form field',signature:'Signature block',page_break:'Page break'}
/** Escaped text with a small, explicit formatting vocabulary; never accepts HTML. */
export function richText(value:string){return value.split('\n').map(line=>{const escaped=escape(line);return '<p>'+escaped.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/_([^_]+)_/g,'<em>$1</em>').replace(/^- /,'• ')+'</p>'}).join('')}
export function documentBlocks(view:any,mediaBase='',suffix=''){
 const doc=documentOf(view)
 if(!doc.blocks.length&&!doc.fixedPdf)return ''
 const media=(id:string)=>escape(mediaBase+encodeURIComponent(id)+suffix)
 return ui('<article class="proposal-document" aria-label="Proposal document">')+(doc.brand?.logoId?'<img class="document-logo" src="'+media(doc.brand.logoId)+'" alt="'+escape(doc.brand.name||ui('Firm logo'))+'" width="200" height="100">':'')+(doc.fixedPdf?ui('<section aria-label="Fixed PDF pages"><h2>Fixed PDF pages</h2><p>')+doc.fixedPdf.pages+ui(' original pages, followed by the appended blocks.</p><a href="')+media(doc.fixedPdf.fileId)+ui('">Open original PDF</a><div data-fixed-pages data-source="')+media(doc.fixedPdf.fileId)+ui('"><p role="status">Loading original PDF pages…</p></div><script type="module" src="/fixed-pages.js"></script></section>'):'')+(doc.brand?.name?'<p class="document-brand">'+escape(doc.brand.name)+'</p>':'')+doc.blocks.map(b=>{
  let body=b.title?'<h2>'+escape(b.title)+'</h2>':''
  if(b.type==='page_break')return ui('<hr class="document-page-break" aria-label="Page break" data-document-block="')+escape(b.id)+'">'
  if(b.type==='field'||b.type==='signature'){
   if(view.recipientProgress&&view.status!=='accepted'&&fieldSlot(b,view.recipientProgress.clientSlot)!==view.recipientProgress.recipient.id)return ''
   const value=view.acceptance?.fieldValues?.[b.id]??view.recipientProgress?.ownFields?.[b.id],disabled=view.preview||!view.verified||view.status==='accepted'||view.recipientProgress?.signed||view.recipientProgress&&!view.recipientProgress.ready,name=(b.type==='signature'?'signature:':'field:')+b.id
   body+='<p class="muted">'+(b.recipientRole==='slot'?ui('Assigned to ')+escape(recipientPlan(view).find(r=>r.id===b.recipientId)?.name??'this recipient')+ui(' recipient role.'):ui('Assigned to the Client recipient')+(b.recipientId?'':ui(' role'))+'.')+'</p>'
   if(view.status==='accepted'||view.recipientProgress?.signed)body+='<p>'+escape(value===undefined?ui('Not collected'):value===true?ui('Yes'):value===false?ui('No'):value)+'</p>'
   else {const kind=b.type==='signature'?'text':b.fieldKind,required=b.type==='signature'||b.required;body+='<label>'+escape(b.type==='signature'?ui('Type your full name for ')+b.title:b.title)+'<input form="platter-acceptance" name="'+escape(name)+'" type="'+escape(kind)+'"'+(kind==='checkbox'?' value="yes"':' maxlength="1000"')+(required?' required':'')+(disabled?' disabled':'')+'></label>'+(b.type==='signature'?ui('<p>By accepting below, you adopt this typed name as your signature for this block. It must match your acceptance name.</p>'):'')}
   if(b.text)body+=richText(b.text)
  }
  else if(b.type==='table')body+='<div class="pricing-table-wrap"><table>'+b.text.split('\n').map(row=>'<tr>'+row.split('\t').map(cell=>'<td>'+escape(cell)+'</td>').join('')+'</tr>').join('')+'</table></div>'
  else if(b.type==='image')body+='<figure><img src="'+media(b.assetId!)+'" alt="'+escape(b.alt)+'" loading="lazy" decoding="async" width="1280" height="720">'+(b.text?'<figcaption>'+escape(b.text)+'</figcaption>':'')+'</figure>'
  else if(b.type==='video')body+='<video controls preload="none" poster="'+media(b.posterId!)+'" aria-label="'+escape(b.alt)+'" width="1280" height="720"><source src="'+media(b.assetId!)+'"><a href="'+media(b.assetId!)+ui('">Download video</a></video>')+richText(b.text)
  else if(b.type==='gallery')body+='<div class="document-gallery-grid">'+(b.images??[]).map(image=>'<figure><img src="'+media(image.assetId)+'" alt="'+escape(image.alt)+'" loading="lazy" decoding="async" width="1280" height="720"></figure>').join('')+'</div>'+richText(b.text)
  else if(b.type==='embed'&&!view.externalContentEnabled)body+='<p>'+escape(embedProvider(b.url!))+ui(' content is disabled by the workspace administrator.</p>')
  else if(b.type==='embed')body+='<div data-external-embed><img src="'+media(b.posterId!)+'" alt="'+escape(b.alt)+ui('" loading="lazy" width="1280" height="720"><p>Loading this content connects to ')+escape(new URL(b.url!).hostname)+ui(', which receives your network address. Load only if you agree.</p><button type="button" data-embed-url="')+escape(b.url)+'" data-embed-title="'+escape(b.alt)+ui('">Load external content</button><p><a href="')+escape(b.url)+ui('" target="_blank" rel="noopener noreferrer">Open external content</a></p></div>')+richText(b.text)
  else if(b.type==='pricing'){const option=displayOptions(view.options??[]).find((o:any)=>o.id===b.optionId),table=option?.tables?.[b.tableIndex??0];body+=table?pricingTables([{...option,concealDiscount:false,tables:[table]}],view.currency):ui('<p>Pricing table unavailable.</p>')}
  else if(b.type==='columns')body+='<div class="document-column-grid"><div>'+richText(b.text)+'</div><div>'+richText(b.second??'')+'</div></div>'
  else if(b.type==='quote')body+='<blockquote>'+richText(b.text)+'</blockquote>'
  else body+=richText(b.text)
  return '<section class="document-block document-'+escape(b.type)+'" data-document-block="'+escape(b.id)+'" data-engagement-section="block:'+escape(b.id)+'">'+body+'</section>'
 }).join('')+'</article>'
}
export function documentBrandCss(view:any){const b=documentOf(view).brand;return b?`.proposal-document{--document-accent:${b.accent};color:${b.ink};background:${b.paper};font-family:${b.font==='serif'?'var(--pl-serif)':'var(--pl-sans)'}}`:''}
export function blockEditor(p:any){
 const doc=documentOf(p),path=proposalPath(p.id)
 const palette=Object.entries(blockNames).filter(([type])=>type!=='embed'||p.canEditExternal).map(([type,name])=>'<option value="'+type+'">'+name+'</option>').join('')
 const content=hidden('id',p.id)+hidden('version',p.version)+hidden('document',JSON.stringify(doc))
 +'<p>Build your document in reading order. Use **bold**, _italic_ and lines starting with - for lists. Client pages and PDFs use this same content.</p>'
 +'<div class="document-toolbar"><label>Block type<select data-block-type>'+palette+'</select></label><button type="button" data-block-add>Add block</button><button type="button" class="secondary" data-block-undo disabled>Undo</button><button data-document-save>Save document</button></div>'
 +'<p role="status" aria-live="polite" data-document-status>Revision '+escape(p.revision)+' saved. Changes autosave after a pause.</p><p data-document-error role="alert" hidden></p>'
 +'<div data-document-blocks></div><details class="document-brand-kit"><summary>Brand kit</summary><label>Brand name<input data-brand="name" maxlength="200"></label><label>Accent color<input data-brand="accent" value="#7c144a" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Text color<input data-brand="ink" value="#1c1c24" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Paper color<input data-brand="paper" value="#ffffff" pattern="#[0-9a-fA-F]{6}" maxlength="7"></label><label>Document font<select data-brand="font"><option value="serif">Serif</option><option value="sans">Sans serif</option></select></label><label>Logo<select data-brand="logoId"><option value="">No logo</option>'+ (p.documentMedia??[]).filter((f:any)=>f.mediaType.startsWith('image/')).map((f:any)=>'<option value="'+escape(f.id)+'">'+escape(f.filename)+'</option>').join('')+'</select></label><label>Default cover heading<input data-brand="cover" maxlength="200"></label><button type="button" class="secondary" data-brand-apply>Apply brand kit</button><p>Colors need at least 4.5:1 contrast on the paper. A new cover uses the default cover heading.</p></details>'
 +'<noscript><p>The block editor needs JavaScript. Existing content stays preserved when you use the proposal form.</p></noscript>'
 +'<script src="/document-editor.js" defer></script>'
 return '<section class="panel document-editor" aria-labelledby="document-editor-heading"><h2 id="document-editor-heading">Document blocks</h2>'+form('proposal.document',path,content).replace('<form ','<form data-document-editor data-external-edit="'+(p.canEditExternal?'yes':'no')+'" data-revision="'+escape(p.revision)+'" data-block-locks="'+escape(JSON.stringify(p.lockedSections??[]))+'" data-lock-terms="'+(p.lockedSections?.includes('terms')?'yes':'no')+'" data-options="'+escape(JSON.stringify(p.options))+'" data-media="'+escape(JSON.stringify(p.documentMedia??[]))+'" data-recipient-slots="'+escape(JSON.stringify(typeof p.recipient_plan==='string'?JSON.parse(p.recipient_plan):p.recipient_plan??[]))+'" ')+`<details><summary>Upload display media</summary><p>Upload images (PNG and JPEG, up to 5 MiB and 16 megapixels) or video (MP4 or WebM, up to 20 MiB). Video blocks need an uploaded image poster. Attachments remain download-only.</p><form method="post" enctype="multipart/form-data" action="/app/document-media">${hidden('id',p.id)}${hidden('version',p.version)}<label>Display media file<input name="file" type="file" accept="image/png,image/jpeg,video/mp4,video/webm" required></label><label class="choice"><input type="checkbox" name="consent" value="yes" required>I authorize displaying this file to the recipients of this proposal when I place it in a block or brand kit.</label><button>Upload display media</button></form></details>`+'</section>'
}

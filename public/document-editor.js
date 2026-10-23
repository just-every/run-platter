// Small native-control editor. Server owns validation, scope, locks and revisions.
(() => {
 const names={cover:'Cover page',heading:'Heading',text:'Text',columns:'Columns',pricing:'Pricing table',quote:'Quote or testimonial',bio:'Team bio',case_study:'Case study',image:'Image',video:'Video',terms:'Terms',field:'Form field',signature:'Signature block',page_break:'Page break'};
 for(const form of document.querySelectorAll('[data-document-editor]')){
  const payload=form.elements.document,container=form.querySelector('[data-document-blocks]'),status=form.querySelector('[data-document-status]'),error=form.querySelector('[data-document-error]'),undo=form.querySelector('[data-block-undo]');
  let doc=JSON.parse(payload.value),options=JSON.parse(form.dataset.options),media=JSON.parse(form.dataset.media??'[]'),history=[],saved=JSON.stringify(doc),pending=false,timer,halted=false,dragged,savePromise;
  const element=(tag,attrs={},text)=>{const node=document.createElement(tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);if(text!==undefined)node.textContent=text;return node;};
  const checkpoint=()=>{const value=JSON.stringify(doc);if(history.at(-1)!==value)history.push(value);if(history.length>20)history.shift();undo.disabled=!history.length;};
  const dirty=()=>JSON.stringify(doc)!==saved;
  const schedule=()=>{if(!dirty()&&!pending){form.dataset.saveState='saved';status.textContent='Revision '+form.dataset.revision+' saved. No unsaved document changes.';return;}form.dataset.saveState='unsaved';payload.value=JSON.stringify(doc);status.textContent='Unsaved document changes.';clearTimeout(timer);if(!halted)timer=setTimeout(save,800);};
  const control=(label,key,value,oninput,tag='input')=>{
   const wrap=element('label',{},label),node=element(tag,{'data-block-field':key,'aria-label':label});
   if(tag==='textarea'){node.rows=4;node.maxLength=10000;}else node.maxLength=200;
   node.value=value??'';node.addEventListener('input',()=>{checkpoint();oninput(node.value);schedule();});wrap.append(node);return wrap;
  };
  const button=(label,symbol,action)=>{const tip=element('span',{class:'document-tool'}),node=element('button',{type:'button',class:'secondary','aria-label':label},symbol),tooltip=element('span',{role:'tooltip',class:'document-tooltip'},label);tooltip.id='tip-'+crypto.randomUUID();node.setAttribute('aria-describedby',tooltip.id);node.addEventListener('click',action);tip.append(node,tooltip);return {tip,node};};
  const renumber=()=>{for(const [i,card] of Array.from(container.querySelectorAll('[data-block-id]')).entries()){const label=(i+1)+'. '+names[doc.blocks[i].type],heading=card.querySelector('h3');if(heading.textContent!==label)heading.textContent=label;const aria=names[doc.blocks[i].type]+' block '+(i+1);if(card.getAttribute('aria-label')!==aria)card.setAttribute('aria-label',aria);for(const direction of [-1,1])card.querySelector(`[data-move="${direction}"]`).disabled=i+direction<0||i+direction>=doc.blocks.length;}};
  const place=(id,index)=>{const from=doc.blocks.findIndex(b=>b.id===id);if(from<0||from===index)return;checkpoint();const [block]=doc.blocks.splice(from,1);doc.blocks.splice(index,0,block);const node=container.querySelector(`[data-block-id="${id}"]`);node.remove();container.insertBefore(node,container.children[index]??null);renumber();schedule();};
  const moved=(id,direction)=>{const at=doc.blocks.findIndex(b=>b.id===id),next=at+direction;if(next<0||next>=doc.blocks.length)return;place(id,next);container.querySelector(`[data-block-id="${id}"] [data-move="${direction}"]`).focus();};
  function render(){
   container.replaceChildren();
   if(!doc.blocks.length)container.append(element('p',{class:'empty-document'},'No blocks yet. Choose a block type and add your first section.'));
   for(const [index,block] of doc.blocks.entries()){
    const locked=form.dataset.lockTerms==='yes'&&block.type==='terms';
    const card=element('section',{class:'document-editor-block','data-block-id':block.id,'aria-label':names[block.type]+' block '+(index+1)}),bar=element('div',{class:'document-block-bar'}),title=element('h3',{},(index+1)+'. '+names[block.type]);
    bar.append(title);
    const drag=button('Drag block','⠿',()=>{status.textContent='Drag this handle onto another block, or use Move up and Move down.';});drag.node.draggable=true;drag.node.dataset.blockDrag='';
    drag.node.addEventListener('keydown',event=>{if(event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();moved(block.id,event.key==='ArrowUp'?-1:1);}});
    drag.node.addEventListener('dragstart',event=>{dragged=block.id;event.dataTransfer.setData('text/plain',block.id);event.dataTransfer.effectAllowed='move';card.classList.add('document-dragging');});
    drag.node.addEventListener('dragend',()=>{dragged=undefined;card.classList.remove('document-dragging');});bar.append(drag.tip);
    for(const [label,symbol,direction] of [['Move up','↑',-1],['Move down','↓',1]]){const b=button(label,symbol,()=>moved(block.id,direction));b.node.dataset.move=String(direction);b.node.disabled=index+direction<0||index+direction>=doc.blocks.length;bar.append(b.tip);}
    const duplicate=button('Duplicate block','⧉',()=>{checkpoint();doc.blocks.splice(doc.blocks.findIndex(b=>b.id===block.id)+1,0,{...block,id:crypto.randomUUID()});render();schedule();});duplicate.node.disabled=locked;bar.append(duplicate.tip);
    const remove=button('Delete block','×',()=>{checkpoint();const position=doc.blocks.findIndex(b=>b.id===block.id);doc.blocks.splice(position,1);render();const next=container.querySelectorAll('[data-block-id]')[Math.min(position,doc.blocks.length-1)];(next?.querySelector('input,textarea,button')??form.querySelector('[data-block-add]')).focus();schedule();});remove.node.disabled=locked;bar.append(remove.tip);card.append(bar);
    card.addEventListener('dragover',event=>{if(dragged&&dragged!==block.id){event.preventDefault();event.dataTransfer.dropEffect='move';}});
    card.addEventListener('drop',event=>{if(!dragged||dragged===block.id)return;event.preventDefault();const from=doc.blocks.findIndex(b=>b.id===dragged);if(from<0)return;const to=doc.blocks.findIndex(b=>b.id===block.id)-(from<doc.blocks.findIndex(b=>b.id===block.id)?1:0),id=dragged;dragged=undefined;place(id,to);});
    if(block.type!=='page_break'){
     card.append(control('Block heading','title',block.title,v=>block.title=v));
     if(['field','signature'].includes(block.type)){
      const label=element('label',{},'Assigned recipient'),select=element('select',{'aria-label':'Assigned recipient'});select.append(element('option',{value:'client'},'Client recipient'));label.append(select);card.append(label);
      if(block.type==='field'){const wrap=element('label',{},'Field type'),kind=element('select',{'aria-label':'Field type'});for(const [id,name] of [['text','Text'],['date','Date'],['checkbox','Checkbox']]){const option=element('option',{value:id},name);option.selected=block.fieldKind===id;kind.append(option);}kind.addEventListener('change',()=>{checkpoint();block.fieldKind=kind.value;schedule();});wrap.append(kind);card.append(wrap);const required=element('label',{class:'choice'},'Required field'),check=element('input',{type:'checkbox','aria-label':'Required field'});check.checked=block.required;check.addEventListener('change',()=>{checkpoint();block.required=check.checked;schedule();});required.prepend(check);card.append(required);}
      card.append(control('Instructions','text',block.text,v=>block.text=v,'textarea'));
     }else if(['image','video'].includes(block.type)){
      const choice=(label,key,files)=>{const wrap=element('label',{},label),select=element('select',{'aria-label':label});for(const file of files){const option=element('option',{value:file.id},file.filename);option.selected=block[key]===file.id;select.append(option);}select.addEventListener('change',()=>{checkpoint();block[key]=select.value;schedule();});wrap.append(select);return wrap;};
      card.append(choice('Media file','assetId',media.filter(f=>f.mediaType.startsWith(block.type==='image'?'image/':'video/'))),control('Media description','alt',block.alt,v=>block.alt=v));
      if(block.type==='video')card.append(choice('Video poster','posterId',media.filter(f=>f.mediaType.startsWith('image/'))));
      card.append(control('Caption','text',block.text,v=>block.text=v,'textarea'));
     }else if(block.type==='pricing'){
      const wrap=element('label',{},'Placed pricing table'),select=element('select',{'aria-label':'Placed pricing table'});select.append(element('option',{value:''},'Choose a saved pricing table'));
      for(const o of options)for(const [i,t] of (o.tables??[]).entries()){const opt=element('option',{value:o.id+':'+i},o.label+' · '+t.name);opt.selected=block.optionId===o.id&&block.tableIndex===i;select.append(opt);}
      select.addEventListener('change',()=>{checkpoint();const split=select.value.lastIndexOf(':');block.optionId=select.value.slice(0,split);block.tableIndex=Number(select.value.slice(split+1));schedule();});wrap.append(select);card.append(wrap,element('p',{class:'muted'},'Create and save itemised pricing in the proposal composer first. This block places that exact table in the document.'));
     }else if(block.type!=='heading')card.append(control(block.type==='columns'?'First column':'Block text','text',block.text,v=>block.text=v,'textarea'));
     if(block.type==='columns')card.append(control('Second column','second',block.second,v=>block.second=v,'textarea'));
     const wrap=element('label',{},'Block visibility'),select=element('select',{'aria-label':'Block visibility'});select.append(element('option',{value:''},'Every package'));
     const conditions=new Map();for(const o of options){conditions.set(o.id,'Only '+o.label);for(const i of o.optionalItems??[])conditions.set('item:'+i.id,'Only with '+i.label);}
     for(const [id,label] of conditions){const opt=element('option',{value:id},label);opt.selected=block.condition===id;select.append(opt);}select.addEventListener('change',()=>{checkpoint();if(select.value)block.condition=select.value;else delete block.condition;schedule();});wrap.append(select);card.append(wrap);
    }
    if(locked){card.append(element('p',{class:'muted'},'Terms are locked. You can move this section; ask an owner, admin or team manager to unlock it before changing its content.'));for(const node of card.querySelectorAll('input,textarea,select'))node.disabled=true;}
    container.append(card);
   }
   undo.disabled=!history.length;
  }
  const brandDefaults={name:'',accent:'#7c144a',ink:'#1c1c24',paper:'#ffffff',font:'serif',cover:''};
  const fillBrand=()=>{for(const node of form.querySelectorAll('[data-brand]'))node.value=(doc.brand??brandDefaults)[node.dataset.brand]??'';};
  fillBrand();render();form.dataset.saveState='saved';
  form.querySelector('[data-block-add]').addEventListener('click',()=>{if(doc.blocks.length>=400){error.textContent='A document supports up to 400 blocks.';return;}checkpoint();const type=form.querySelector('[data-block-type]').value,block={id:crypto.randomUUID(),type,title:type==='cover'?doc.brand?.cover??'':'',text:''};if(['field','signature'].includes(type)){block.recipientRole='client';block.title=type==='field'?'Client detail':'Client signature';if(type==='field'){block.fieldKind='text';block.required=false;}}if(['image','video'].includes(type)){const file=media.find(f=>f.mediaType.startsWith(type==='image'?'image/':'video/')),poster=media.find(f=>f.mediaType.startsWith('image/'));if(!file||(type==='video'&&!poster)){error.textContent='Upload the display media and, for video, an image poster first.';return;}block.assetId=file.id;block.alt=file.filename;if(type==='video')block.posterId=poster.id;}if(type==='columns')block.second='';if(type==='pricing'){const o=options.find(o=>o.tables?.length);if(!o){error.textContent='Create and save an itemised pricing table in the composer before placing it.';return;}block.optionId=o.id;block.tableIndex=0;}doc.blocks.push(block);render();container.lastElementChild.querySelector('input,textarea,button')?.focus();schedule();});
  undo.addEventListener('click',()=>{const previous=history.pop();if(!previous)return;doc=JSON.parse(previous);render();fillBrand();schedule();});
  form.querySelector('[data-brand-apply]').addEventListener('click',()=>{const fields=Array.from(form.querySelectorAll('[data-brand]'));if(fields.some(f=>!f.reportValidity()))return;checkpoint();doc.brand=Object.fromEntries(fields.filter(node=>node.dataset.brand!=='logoId'||node.value).map(node=>[node.dataset.brand,node.value]));schedule();});
  async function save(){
   clearTimeout(timer);if(pending)return savePromise;if(!dirty()){form.dataset.saveState='saved';status.textContent='Revision '+form.dataset.revision+' saved. No unsaved document changes.';return;}
   pending=true;form.dataset.saveState='saving';halted=false;error.textContent='';status.textContent='Saving document…';
   const written=JSON.stringify(doc),version=form.elements.version.value;
   savePromise=(async()=>{
    try{
     const response=await fetch('/api/platter/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'proposal.document',input:{id:form.elements.id.value,version,document:JSON.parse(written)}})});
     const result=await response.json();if(!response.ok)throw new Error(result.error??'Could not save the document.');
     window.platterRevisionSaved?.(form.elements.id.value,version,result);form.elements.version.value=String(result.version);form.dataset.revision=String(result.revision);saved=written;form.dataset.saveState=dirty()?'unsaved':'saved';
     status.replaceChildren(document.createTextNode('Saved revision '+result.revision+'. '));const link=element('a',{href:location.pathname+location.search},'Reload proposal to review and approve');status.append(link);
     // Every save still binds a single exact server version; conflicting requests pause.
     if(!dirty())payload.value=written;else status.textContent='Saving latest document changes…';
    }catch(reason){halted=true;form.dataset.saveState='error';error.textContent=reason.message+' Your edits remain here. Reload only after copying any changes you need to keep.';status.textContent='Document not saved. Automatic saving paused.';}
    finally{pending=false;if(dirty()&&!halted)timer=setTimeout(save,800);}
   })();return savePromise;
  }
  form.addEventListener('submit',event=>{event.preventDefault();save();});
  window.addEventListener('beforeunload',event=>{if(dirty()||pending){event.preventDefault();event.returnValue='';}});
 }
})();

// Serialize writes from this tab's document, pricing and details editors.
(() => {const locks=new Map();window.platterWithSaveLock=async(id,write)=>{const previous=locks.get(id)??Promise.resolve();let release;const gate=new Promise(resolve=>release=resolve),tail=previous.then(()=>gate);locks.set(id,tail);await previous;try{return await write()}finally{release();if(locks.get(id)===tail)locks.delete(id)}}})();
// Synchronize disjoint editors in this tab after a successful exact-version save.
window.platterRevisionSaved=(id,previous,result)=>{
 for(const form of document.forms){const record=form.querySelector('input[name="id"]'),version=form.querySelector('input[name="version"]');if(record?.value!==id||version?.value!==String(previous))continue;version.value=String(result.version);if(form.dataset.documentEditor!==undefined)form.dataset.revision=String(result.revision);const revision=form.querySelector('input[name="revision"]');if(revision)revision.value=String(result.revision);}
 for(const link of document.querySelectorAll('a[href^="/app/preview?"]')){const url=new URL(link.href);if(url.searchParams.get('id')===id){url.searchParams.set('revision',String(result.revision));link.href=url.pathname+url.search;}}
};
// Persist only explicitly enabled internal form drafts within this tab.
(() => {
  const scope = document.body.dataset.draftScope;
  if (!scope) return;
  const prefix = `platter:draft:${scope}:`;
  const forms = Array.from(document.querySelectorAll('form[data-draft]'));
  const eligible = form => Array.from(form.elements).filter(field =>
    field.name && !['hidden', 'password', 'checkbox', 'radio', 'submit', 'file'].includes(field.type)
    && !['code', 'token', 'key', 'apiKey', 'confirmName'].includes(field.name));
  try {
    const pending = sessionStorage.getItem(`${prefix}pending`);
    if (pending && document.body.dataset.actionSuccess === 'true') sessionStorage.removeItem(`${prefix}${pending}`);
    sessionStorage.removeItem(`${prefix}pending`);
    for (const form of forms) {
      const key = `${prefix}${form.dataset.draft}`;
      const fields = eligible(form);
      let saved;
      try { saved = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { sessionStorage.removeItem(key); }
      if (saved && typeof saved === 'object') for (const field of fields) {
        if (typeof saved[field.name] === 'string') field.value = saved[field.name];
      }
      const save = () => {
        try { sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(fields.map(field => [field.name, field.value])))); } catch { /* Native forms remain usable when tab storage is unavailable. */ }
      };
      form.addEventListener('input', save);
      form.addEventListener('change', save);
      window.addEventListener('pagehide', save);
      form.addEventListener('submit', () => {
        save();
        try { sessionStorage.setItem(`${prefix}pending`, form.dataset.draft); } catch { /* Storage is optional. */ }
      });
    }
  } catch { /* Browser storage restrictions do not change submission behavior. */ }
})();

// Live tier columns: each option's deposit and the receipt follow the typed prices and percentage.
// The server prices acceptance itself; this only mirrors what the saved revision will show.
(() => {
  // The server's own rule: up to two decimals, written plain or with US thousands commas and a leading $.
  const cents = (value, allowZero = false) => {
    const written = value.trim(), plain = /^\$?\s*\d{1,3}(,\d{3}){1,2}(\.\d{1,2})?$/.test(written) ? written.replace(/[$,\s]/g, '') : written.replace(/^\$\s*/, '');
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(plain)) return null;
    const amount = Math.round(Number(plain) * 100);
    return amount >= (allowZero ? 0 : 1) && amount <= 1000000000 ? amount : null;
  };
  // The price field is the amount before the package reduction, after table reductions.
  const netPrice = (tier, gross) => {
    if (gross === null) return null;
    const percent = tier.querySelector('[data-package-field="discountPercent"]')?.value.trim() || '0';
    const fixed = cents(tier.querySelector('[data-package-field="discountAmount"]')?.value || '0', true);
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(percent) || fixed === null) return null;
    const [whole, fraction = ''] = percent.split('.'), bps = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    const net = Number((BigInt(gross) * BigInt(10000 - bps) + 5000n) / 10000n) - fixed;
    return net > 0 ? net : null;
  };
  const show = value => value === null ? '—' : '$' + (value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  for (const form of document.querySelectorAll('form.composer')) {
    const page = form.closest('.composer-page');
    const update = () => {
      const percent = Number(form.elements.depositPercent?.value);
      const fixed = form.elements.scheduleEnabled?.value === 'yes' && form.elements.depositKind?.value === 'fixed';
      const fixedAmount = cents(form.elements.depositAmount?.value ?? '');
      const valid = Number.isFinite(percent) && percent > 0 && percent <= 100;
      for (const tier of form.querySelectorAll('.tier[data-tier]')) {
        const id = tier.dataset.tier, field = tier.querySelector('.tier-price input');
        if (!field) continue;
        const gross = cents(field.value), price = netPrice(tier, gross);
        field.classList.toggle('invalid', field.value.trim() !== '' && price === null);
        const figure = tier.querySelector('.money-figure');
        if (figure) figure.textContent = gross === null ? field.value.trim() : show(gross);
        const deposit = price === null || !valid ? null : fixed ? fixedAmount : Math.round(price * percent * 100 / 10000);
        tier.querySelector('[data-line="deposit"]').textContent = show(deposit);
        tier.querySelector('[data-line="balance"]').textContent = show(deposit === null ? null : price - deposit);
        if (valid) { const output=tier.querySelector('[data-line="percent"]'); output.textContent = fixed ? 'Fixed' : String(percent); if(output.nextSibling)output.nextSibling.textContent=fixed?' deposit':'% deposit'; }
        if (!page || !id) continue;
        const sum = page.querySelector(`[data-sum-price="${id}"]`), part = page.querySelector(`[data-sum-deposit="${id}"]`);
        if (sum) { sum.textContent = show(price); sum.classList.toggle('invalid', price === null); }
        if (part) part.textContent = show(deposit);
        const label = sum?.previousElementSibling, typed = tier.querySelector('.tier-name input')?.value.trim();
        if (label && typed) label.textContent = typed;
      }
      const shown = page?.querySelector('[data-sum-percent]');
      if (shown && valid) { shown.textContent = fixed ? 'Fixed' : String(percent); if(shown.nextSibling)shown.nextSibling.textContent=fixed?' deposit ':'% deposit '; }
    };
    form.addEventListener('input', update);
    form.addEventListener('click', () => requestAnimationFrame(update));
    update();
  }
})();

// Keep a true client viewport while fitting the preview canvas to its member page.
(() => {
  const frame = document.querySelector('.preview-viewport iframe');
  if (!frame) return;
  const viewport = frame.parentElement;
  const resize = () => {
    const scale = Math.min(1, viewport.clientWidth / Number(frame.getAttribute('width')));
    frame.style.transform = `scale(${scale})`;
    frame.style.position = 'absolute';
    frame.style.top = '0';
    frame.style.left = '0';
    viewport.style.height = `${Number(frame.getAttribute('height')) * scale}px`;
  };
  new ResizeObserver(resize).observe(viewport);
  resize();
})();

// The client's email under its select; the band's inline fix; the catalog shelf folded on phones.
(() => {
  for (const select of document.querySelectorAll('form.composer select[name="clientId"]')) {
    const note = select.parentElement.querySelector('[data-client-email]');
    if (note) select.addEventListener('change', () => { note.textContent = select.selectedOptions[0]?.dataset.email ?? ''; });
  }
  for (const button of document.querySelectorAll('[data-fix-field]')) {
    const field = document.getElementById(button.dataset.fixField);
    if (!field) continue;
    button.hidden = false;
    button.addEventListener('click', () => {
      if (button.dataset.fixValue !== undefined) {
        field.value = button.dataset.fixValue;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      field.focus();
      field.select();
    });
  }
  if (window.matchMedia('(max-width: 600px)').matches) for (const shelf of document.querySelectorAll('details.shelf[open]')) shelf.open = false;
})();


// Once a proposal has document content, its native details and table controls
// participate in the same revision-guarded autosave. New blank proposals still
// need an explicit Prepare action; starting a negotiation stays explicit too.
(() => {
 for(const form of document.querySelectorAll('form.composer')){
  if(!form.elements.id||new URL(form.action).searchParams.get('name')!=='proposal.revise')continue;
  const documentForm=Array.from(document.querySelectorAll('[data-document-editor]')).find(f=>f.elements.id.value===form.elements.id.value);
  if(!documentForm)continue;
  const active=()=>{try{const doc=JSON.parse(documentForm.elements.document.value);return doc.blocks.length>0||Boolean(doc.brand)}catch{return false}};
  const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.dataset.composerAutosave='';status.hidden=true;form.append(status);
  let timer,pending=false,needsSave=false,paused=false,applying=false,manualSubmission=false;
  const schedule=()=>{if(applying||!active()||paused)return;needsSave=true;status.hidden=false;status.textContent='Unsaved proposal changes.';status.dataset.saveState='unsaved';clearTimeout(timer);timer=setTimeout(save,900);};
  async function save(){
   if(pending||paused||!needsSave)return;
   if(!form.checkValidity()){status.textContent='Complete the required fields to autosave this proposal.';return;}
   if(['unsaved','saving'].includes(documentForm.dataset.saveState)){timer=setTimeout(save,250);return;}
   if(documentForm.dataset.saveState==='error'){status.textContent='Resolve the document save before saving proposal details.';return;}
   pending=true;needsSave=false;status.textContent='Saving proposal…';status.dataset.saveState='saving';
   try{await window.platterWithSaveLock(form.elements.id.value,async()=>{
    form.dispatchEvent(new Event('platter:serialize'));
    const input=Object.fromEntries(new FormData(form)),version=input.version;
    const response=await fetch('/api/platter/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'proposal.autosave',input})}),result=await response.json();
    if(!response.ok)throw new Error(result.error??'Could not autosave this proposal.');
    window.platterRevisionSaved?.(input.id,version,result);
    applying=true;
    for(const option of result.options){const price=form.querySelector(`[data-package-id="${option.id}"] [data-package-field="price"]`);if(price&&(price.readOnly||!needsSave)){price.value=((option.discount?.grossCents??option.cents)/100).toFixed(2);price.dispatchEvent(new Event('input',{bubbles:true}));}}
    applying=false;if(!needsSave)form.dispatchEvent(new Event('platter:pricing-saved'));
    const title=document.querySelector('main>h1');if(title)title.textContent=result.title;
    status.textContent='Saved revision '+result.revision+'. Reload the proposal to review and approve.';status.dataset.saveState=needsSave?'unsaved':'saved';
   });}catch(error){applying=false;paused=true;needsSave=true;status.textContent=error.message+' Automatic saving paused. Fix the fields and use Save revision, or reload before continuing.';status.dataset.saveState='error';}
   finally{pending=false;if(needsSave&&!paused)timer=setTimeout(save,900);}
  }
  form.addEventListener('input',event=>{if((event.target.matches('[data-pricing-field="quantity"]')&&event.target.closest('[data-saved-line]')&&form.dataset.pricingStructureDirty!=='yes')||event.target.readOnly)return;schedule();});
  form.addEventListener('change',event=>{if((event.target.matches('[data-pricing-field="quantity"]')&&event.target.closest('[data-saved-line]')&&form.dataset.pricingStructureDirty!=='yes')||event.target.readOnly)return;schedule();});
  form.addEventListener('click',event=>{if(event.target.closest('[data-package-action],[data-pricing-action]'))setTimeout(schedule,0);});
  form.addEventListener('submit',()=>{clearTimeout(timer);manualSubmission=true});documentForm.addEventListener('platter:document-saved',()=>{if(needsSave&&!paused){clearTimeout(timer);timer=setTimeout(save,0)}});
  window.addEventListener('beforeunload',event=>{if(!manualSubmission&&(needsSave||pending)){event.preventDefault();event.returnValue='';}});
 }
})();

// Third parties receive no request until the viewer explicitly loads the frame.
for(const button of document.querySelectorAll('[data-embed-url]'))button.addEventListener('click',()=>{
 const frame=document.createElement('iframe');frame.src=button.dataset.embedUrl;frame.title=button.dataset.embedTitle;frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-presentation');frame.setAttribute('allow','fullscreen');frame.referrerPolicy='no-referrer';frame.loading='lazy';button.closest('[data-external-embed]').replaceChildren(frame);
});

// Sender notices are generic; the authenticated endpoint rechecks current scope.
(() => {
 const panel=document.querySelector('[data-tracking-notices]');if(!panel)return;
 const list=panel.querySelector('ul');let stopped=false;
 window.addEventListener('pagehide',()=>{stopped=true;},{once:true});
 const refresh=async()=>{
  if(stopped)return;
  try{
   const response=await fetch('/api/platter/tracking-alerts',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok){list.replaceChildren();panel.hidden=true;stopped=true;return;}
   const {alerts}=await response.json(),known=Array.from(list.children).map(node=>node.dataset.alertId);
   if(JSON.stringify(known)!==JSON.stringify(alerts.map(row=>row.id))){
    list.replaceChildren(...alerts.map(row=>{const item=document.createElement('li'),link=document.createElement('a');item.dataset.alertId=row.id;link.href='/app/proposal?id='+encodeURIComponent(row.proposalId);link.textContent=(row.kind==='first'?'First open':'Return visit')+' · '+row.title;item.append(link);return item;}));
   }
   panel.hidden=alerts.length===0;
  }catch{/* A failed refresh keeps the retained notices until the next read. */}
  if(!stopped)setTimeout(refresh,5000);
 };
 refresh();
})();

// Measure only disclosed, explicitly enabled client pages, never member previews.
(() => {
 const view=document.querySelector('[data-engagement-view]');if(!view)return;
 const totals=new Map(),sections=[...document.querySelectorAll('[data-engagement-section]')],content=[...document.querySelectorAll('[data-engagement-content]')];
 let previous=performance.now(),visible=document.visibilityState==='visible',active=null,visibleContent=[],sequence=0,lastChoice='',pending=Promise.resolve();
 function current(){let best=null,pixels=0;for(const node of sections){const rect=node.closest('section').getBoundingClientRect(),height=Math.max(0,Math.min(innerHeight,rect.bottom)-Math.max(0,rect.top));if(height>pixels){best=node.dataset.engagementSection;pixels=height;}}return best;}
 function contentInView(){return [...new Set(content.filter(node=>{const r=node.getBoundingClientRect();return r.height>0&&Math.min(innerHeight,r.bottom)-Math.max(0,r.top)>=Math.min(r.height/2,100);}).map(node=>node.dataset.engagementContent))];}
 function tick(){const now=performance.now();if(visible){if(active)totals.set(active,(totals.get(active)||0)+now-previous);for(const key of visibleContent)totals.set(key,(totals.get(key)||0)+now-previous);}previous=now;active=current();visibleContent=contentInView();}
 function selection(){
  const select=document.querySelector('select[name="optionId"]'),optionId=select?.value||document.querySelector('input[name="optionId"]:checked')?.value||view.dataset.engagementOption;
  const controls=[...document.querySelectorAll('input[name^="add."]')],renderedOption=select?.form?.querySelector('input[name="itemsOptionId"]')?.value,items=select&&optionId!==renderedOption?[]:controls.length?controls.filter(input=>input.checked).map(input=>({id:input.name.slice(4),quantity:Number([...document.querySelectorAll('input[name^="qty."]')].find(q=>q.name==='qty.'+input.name.slice(4))?.value||1)})):JSON.parse(view.dataset.engagementItems);
  return {optionId,items:items.sort((a,b)=>a.id.localeCompare(b.id))};
 }
 function flush(){
  tick();const choice=selection(),key=JSON.stringify(choice);if(key!==lastChoice){sequence++;lastChoice=key;}
  const payload={viewId:view.dataset.engagementView,readings:Object.fromEntries([...totals].map(([section,ms])=>[section,Math.floor(ms)])),choiceSequence:sequence,...choice};
  pending=pending.catch(()=>{}).then(()=>fetch(view.dataset.engagementEndpoint,{method:'POST',headers:{'content-type':['application','json'].join('/')},credentials:'same-origin',keepalive:true,body:JSON.stringify(payload)}));
 }
 for(const link of document.querySelectorAll('a[href*="/attachments/"]')){const url=new URL(link.href);if(url.origin===location.origin){url.searchParams.set('viewId',view.dataset.engagementView);link.href=url.pathname+url.search;}}
 active=current();flush();setInterval(flush,1000);
 document.addEventListener('change',flush);document.addEventListener('scroll',tick,{passive:true});
 document.addEventListener('visibilitychange',()=>{tick();visible=document.visibilityState==='visible';flush();});window.addEventListener('pagehide',flush);
})();

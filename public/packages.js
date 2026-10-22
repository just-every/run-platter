// Edit definitions only; every price and selection is recalculated by the server.
(() => {
 for(const editor of document.querySelectorAll('[data-packages-editor]')) {
  if(editor.dataset.ready)continue;
  editor.dataset.ready='true';
  const form=editor.closest('form'),payload=editor.querySelector('[data-packages-payload]'),status=editor.querySelector('[data-packages-status]');
  const field=(scope,key)=>scope.querySelector(`[data-package-field="${key}"]`);
  const visibility=()=>form.querySelectorAll('[name=scopeOption],[name=termsOption]');
  // An optional item is a visibility condition until no package offers its id.
  const dropItems=ids=>{for(const id of ids)if(!editor.querySelector(`[data-optional-item][data-item-id="${id}"]`))for(const select of visibility())select.querySelector(`option[value="item:${id}"]`)?.remove();};
  const serialize=()=>{payload.name='packages';payload.value=JSON.stringify(Array.from(editor.querySelectorAll('[data-package-id]'),pack=>({id:pack.dataset.packageId,label:field(pack,'label').value,price:field(pack,'price').value,discountPercent:field(pack,'discountPercent')?.value??'0',optionalItems:Array.from(pack.querySelectorAll('[data-optional-item]'),item=>Object.fromEntries([['id',item.dataset.itemId],...['label','unitPrice','min','max','quantity','editable'].map(key=>{const node=item.querySelector(`[data-item-field="${key}"]`);return [key,key==='editable'?node.checked:node.value]})]))})));};
  form.addEventListener('submit',serialize);
  editor.addEventListener('click',event=>{
   const button=event.target.closest('[data-package-action]');if(!button)return;
   const pack=button.closest('[data-package-id]'),pricing=form.querySelector('[data-pricing-editor]');
   if(button.dataset.packageAction==='add-package'){
    const added=editor.querySelector('[data-package-template]').content.firstElementChild.cloneNode(true),id=crypto.randomUUID();added.dataset.packageId=id;editor.querySelector('[data-packages]').append(added);
    if(pricing){const tables=pricing.querySelector('[data-pricing-option-template]').content.firstElementChild.cloneNode(true);tables.dataset.pricingOption=id;tables.querySelector('legend').textContent='New package';pricing.querySelector('[data-pricing-controls]').insertBefore(tables,pricing.querySelector('[data-pricing-status]'));}
    for(const select of visibility())select.add(new Option('New package',id));
    field(added,'label').focus();status.textContent='Package added.';
   }else if(button.dataset.packageAction==='remove-package'){
    if(editor.querySelectorAll('[data-package-id]').length===1){status.textContent='Offer at least one package.';return;}
    const id=pack.dataset.packageId,items=Array.from(pack.querySelectorAll('[data-optional-item]'),item=>item.dataset.itemId);pricing?.querySelector(`[data-pricing-option="${id}"]`)?.remove();for(const select of visibility())select.querySelector(`option[value="${id}"]`)?.remove();pack.remove();dropItems(items);editor.querySelector('[data-package-action=add-package]').focus();status.textContent='Package removed.';
   }else if(button.dataset.packageAction==='add-item'){
    const added=editor.querySelector('[data-optional-template]').content.firstElementChild.cloneNode(true);added.dataset.itemId=crypto.randomUUID();pack.querySelector('[data-optional-items]').append(added);for(const select of visibility())select.add(new Option('Only with new optional item','item:'+added.dataset.itemId));added.querySelector('input').focus();status.textContent='Optional item added.';
   }else if(button.dataset.packageAction==='remove-item'){
    const item=button.closest('[data-optional-item]');item.remove();dropItems([item.dataset.itemId]);pack.querySelector('[data-package-action=add-item]').focus();status.textContent='Optional item removed.';
   }
  });
  editor.addEventListener('input',event=>{
   const item=event.target.closest('[data-optional-item]');
   if(item&&event.target.matches('[data-item-field=label]')){for(const select of visibility()){const option=select.querySelector(`option[value="item:${item.dataset.itemId}"]`);if(option)option.textContent='Only with '+(event.target.value||'optional item');}return;}
   const pack=event.target.closest('[data-package-id]');if(!pack||event.target!==field(pack,'label'))return;
   const id=pack.dataset.packageId,label=field(pack,'label').value||'Package';form.querySelector(`[data-pricing-option="${id}"] > legend`).textContent=label;
   for(const select of visibility()){const option=select.querySelector(`option[value="${id}"]`);if(option)option.textContent='Only '+label;}
  });
 }
})();

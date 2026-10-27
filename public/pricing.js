// Native controls edit values; the server calculates and validates all totals.
(() => {
  for (const editor of document.querySelectorAll('[data-pricing-editor]')) {
    if (editor.dataset.pricingReady) continue;
    const form = editor.closest('form');
    if (!form) continue;
    editor.dataset.pricingReady = 'true';
    const payload = editor.querySelector('input[name="pricingTables"]');
    const status = editor.querySelector('[data-pricing-status]');
    const value = (scope, key) => scope.querySelector(`[data-pricing-field="${key}"]`).value;
    const clone = selector => editor.querySelector(selector).content.firstElementChild.cloneNode(true);
    const focus = element => element.querySelector('input, textarea, button')?.focus();

    const syncPrices = () => {
      for (const option of editor.querySelectorAll('[data-pricing-option]')) {
        const hasTables = Boolean(option.querySelector('[data-pricing-table]'));
        const price = form.querySelector(`[data-package-id="${option.dataset.pricingOption}"] [data-package-field=price]`);
        if (price) price.readOnly = hasTables;
        option.querySelector('[data-pricing-derived]').hidden = !hasTables;
      }
    };

    const serialize = () => {
      const tables = [];
      for (const option of editor.querySelectorAll('[data-pricing-option]')) {
        for (const table of option.querySelectorAll('[data-pricing-table]')) {
          tables.push({
            optionId: option.dataset.pricingOption,
            name: value(table, 'name'),
            lines: Array.from(table.querySelectorAll('[data-pricing-line]'), line =>
              Object.fromEntries(['catalogId', 'name', 'description', 'quantity', 'unit', 'unitPrice', 'group', 'discountPercent', 'discountAmount', 'groupDiscountPercent', 'groupDiscountAmount'].map(key => [key, line.querySelector(`[data-pricing-field="${key}"]`)?.value ?? '']))),
          });
        }
      }
      payload.value = JSON.stringify(tables);
    };

    editor.addEventListener('click', event => {
      const button = event.target.closest('button[data-pricing-action]');
      if (!button || !editor.contains(button)) return;
      quantityStructureDirty=true;form.dataset.pricingStructureDirty='yes';
      const option = button.closest('[data-pricing-option]');
      const table = button.closest('[data-pricing-table]');
      switch (button.dataset.pricingAction) {
        case 'add-table': {
          const added = clone('[data-pricing-table-template]');
          option.querySelector('[data-pricing-tables]').append(added);
          focus(added);
          status.textContent = 'Pricing table added.';
          break;
        }
        case 'remove-table':
          table.remove();
          option.querySelector('[data-pricing-action="add-table"]').focus();
          status.textContent = 'Pricing table removed.';
          break;
        case 'add-line': {
          const added = clone('[data-pricing-line-template]');
          table.querySelector('[data-pricing-lines]').append(added);
          focus(added);
          status.textContent = 'Line item added.';
          break;
        }
        case 'remove-line': {
          const line = button.closest('[data-pricing-line]');
          if (table.querySelectorAll('[data-pricing-line]').length === 1) {
            status.textContent = 'A table needs at least one line item. Remove the table to remove its final line.';
            return;
          }
          line.remove();
          table.querySelector('[data-pricing-action="add-line"]').focus();
          status.textContent = 'Line item removed.';
          break;
        }
      }
      syncPrices();
    });

    let quantityTimer,quantityPending=false,quantityHalted=false,quantityStructureDirty=false,quantityDirty=false;const quantities=new Set();
    const documentActive=()=>{const own=Array.from(document.querySelectorAll('[data-document-editor]')).find(f=>f.elements.id.value===form.elements.id?.value);if(!own)return false;try{const doc=JSON.parse(own.elements.document.value);return doc.blocks.length>0||Boolean(doc.brand)}catch{return false}};
    const confirmation=editor.querySelector('[data-pricing-confirmation]');
    const saveQuantity=async input=>{
      if(quantityHalted||quantityStructureDirty||!form.elements.id||!input.isConnected)return;if(quantityPending){quantities.add(input);return;}
      const option=input.closest('[data-pricing-option]'),table=input.closest('[data-pricing-table]'),line=input.closest('[data-pricing-line]');
      quantityPending=true;confirmation.textContent='Confirming quantity with the server…';
      try{await window.platterWithSaveLock(form.elements.id.value,async()=>{if(quantityStructureDirty||!input.isConnected)return;const version=form.elements.version.value,tableIndex=Array.from(option.querySelectorAll('[data-pricing-table]')).indexOf(table),lineIndex=Array.from(table.querySelectorAll('[data-pricing-line]')).indexOf(line);const response=await fetch('/api/platter/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'proposal.quantity',input:{id:form.elements.id.value,version,optionId:option.dataset.pricingOption,tableIndex,lineIndex,quantity:input.value}})}),result=await response.json();if(!response.ok)throw new Error(result.error??'Could not save quantity');window.platterRevisionSaved?.(form.elements.id.value,version,result);const price=form.querySelector(`[data-package-id="${result.option.id}"] [data-package-field="price"]`);if(price){price.value=(result.option.priceCents/100).toFixed(2);price.dispatchEvent(new Event('input',{bubbles:true}));}confirmation.textContent=result.option.label+' server-confirmed total: $'+(result.option.cents/100).toFixed(2)+' USD · revision '+result.revision;confirmation.dataset.confirmedVersion=String(result.version);quantityDirty=input.value!==String(result.quantity)||quantities.size>0;});}
      catch(error){quantityHalted=true;confirmation.textContent=error.message+' Quantity was not confirmed. Reload before continuing.';}
      finally{quantityPending=false;if(quantities.size&&!quantityHalted){const [next]=quantities;quantities.delete(next);quantityTimer=setTimeout(()=>saveQuantity(next),120);}}
    };
    editor.addEventListener('input',event=>{if(!event.target.matches('[data-pricing-field="quantity"]')||!event.target.closest('[data-saved-line]')||!form.elements.id||quantityStructureDirty||!documentActive())return;quantityDirty=true;quantities.add(event.target);clearTimeout(quantityTimer);quantityTimer=setTimeout(()=>{const [next]=quantities;quantities.delete(next);saveQuantity(next)},120);});
    form.addEventListener('submit',()=>{clearTimeout(quantityTimer);quantityDirty=false;serialize();});form.addEventListener('platter:serialize',serialize);form.addEventListener('platter:pricing-saved',()=>{quantityStructureDirty=false;quantityDirty=false;delete form.dataset.pricingStructureDirty;quantities.clear();for(const line of editor.querySelectorAll('[data-pricing-line]'))line.dataset.savedLine='';});
    window.addEventListener('beforeunload',event=>{if(quantityDirty||quantityPending){event.preventDefault();event.returnValue='';}});
    editor.querySelector('[data-pricing-controls]').disabled = false;
    editor.querySelector('[data-pricing-enhancement]').hidden = false;
    syncPrices();
  }
})();

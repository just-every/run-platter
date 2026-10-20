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
        const price = form.elements.namedItem(option.dataset.pricingOption === 'one' ? 'priceOne' : 'priceTwo');
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
              Object.fromEntries(['name', 'description', 'quantity', 'unit', 'unitPrice', 'group'].map(key => [key, value(line, key)]))),
          });
        }
      }
      payload.value = JSON.stringify(tables);
    };

    editor.addEventListener('click', event => {
      const button = event.target.closest('button[data-pricing-action]');
      if (!button || !editor.contains(button)) return;
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

    form.addEventListener('submit', serialize);
    editor.querySelector('[data-pricing-controls]').disabled = false;
    editor.querySelector('[data-pricing-enhancement]').hidden = false;
    syncPrices();
  }
})();

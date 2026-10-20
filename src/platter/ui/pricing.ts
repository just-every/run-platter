import { escape, hidden, money } from './shared'

const textInput = (label: string, key: string, value: unknown = '', extra = ''): string =>
  `<label>${escape(label)}<input data-pricing-field="${key}" value="${escape(value)}" ${extra}></label>`

function lineEditor(line: any = {}): string {
  return `<fieldset data-pricing-line><legend>Line item</legend>${textInput('Item name', 'name', line.name, 'required maxlength="200"')}
    <label>Description<textarea data-pricing-field="description" rows="3" maxlength="2000">${escape(line.description)}</textarea></label>
    ${textInput('Quantity', 'quantity', line.quantity ?? '1', 'required inputmode="decimal" pattern="(?=.*[1-9])[0-9]+([.][0-9]{1,3})?" title="Enter a positive quantity with up to three decimal places, at most 1000000."')}
    ${textInput('Unit', 'unit', line.unit, 'required maxlength="40" placeholder="e.g. hours, guests, items"')}
    ${textInput('Unit price in USD', 'unitPrice', line.unitPrice, 'required inputmode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" title="Enter a USD amount with up to two decimal places, at most 10000000."')}
    ${textInput('Group (optional)', 'group', line.group, 'maxlength="200"')}
    <button type="button" class="secondary" data-pricing-action="remove-line">Remove line item</button></fieldset>`
}

function tableEditor(table: any = {}): string {
  return `<fieldset data-pricing-table><legend>Pricing table</legend>${textInput('Table name', 'name', table.name, 'required maxlength="200"')}
    <div data-pricing-lines>${(table.lines ?? []).map(lineEditor).join('')}</div>
    <div class="actions"><button type="button" class="secondary" data-pricing-action="add-line">Add line item</button>
    <button type="button" class="secondary" data-pricing-action="remove-table">Remove table</button></div></fieldset>`
}

export function pricingEditor(options: any[]): string {
  const tables = options.flatMap(option => (option.tables ?? []).map((table: any) => ({ ...table, optionId: option.id })))
  return `<div data-pricing-editor>${hidden('pricingTables', JSON.stringify(tables))}
    <div hidden data-pricing-enhancement><fieldset disabled data-pricing-controls><legend>Pricing tables</legend>
    <p>Add tables for itemised pricing. A package with tables uses their combined total. Totals are calculated when you save.</p>
    ${['one', 'two'].map((id, index) => {
      const option = options.find(item => item.id === id)
      return `<fieldset data-pricing-option="${id}"><legend>${escape(option?.label || `Option ${index + 1}`)}</legend>
        <p data-pricing-derived hidden>The package price is calculated from its pricing tables.</p>
        <div data-pricing-tables>${(option?.tables ?? []).map(tableEditor).join('')}</div>
        <button type="button" class="secondary" data-pricing-action="add-table">Add table</button></fieldset>`
    }).join('')}
    <p class="muted" data-pricing-status role="status" aria-live="polite"></p></fieldset></div>
    <template data-pricing-table-template>${tableEditor({ lines: [{}] })}</template>
    <template data-pricing-line-template>${lineEditor()}</template>
    <script src="/pricing.js" defer></script></div>`
}

function lineDetails(line: any, currency: string): string {
  return `<li><article><strong>${escape(line.name)}</strong>${line.description ? `<p class="preserve">${escape(line.description)}</p>` : ''}
    <dl><dt>Quantity</dt><dd>${escape(line.quantity)}</dd><dt>Unit</dt><dd>${escape(line.unit || '—')}</dd>
    <dt>Unit price</dt><dd>${money(Number(line.unitPrice) * 100, currency)}</dd>
    ${line.group ? `<dt>Group</dt><dd>${escape(line.group)}</dd>` : ''}
    <dt>Line total</dt><dd>${money(line.lineTotalCents, currency)}</dd></dl></article></li>`
}

export function pricingTables(options: any[], currency: string): string {
  return options.filter(option => option.tables?.length).map(option => `<section data-pricing-display>
    <h3>${escape(option.label)} pricing</h3>${option.tables.map((table: any) => `<section>
      <h4>${escape(table.name)}</h4><ul class="records">${table.lines.map((line: any) => lineDetails(line, currency)).join('')}</ul>
      ${table.groups?.length ? `<dl>${table.groups.map((group: any) => `<dt>${escape(group.name || 'Ungrouped')} subtotal</dt><dd>${money(group.subtotalCents, currency)}</dd>`).join('')}</dl>` : ''}
      <p><strong>Table subtotal: ${money(table.subtotalCents, currency)}</strong></p></section>`).join('')}
    <p class="option-price">Package grand total: ${money(option.cents, currency)}</p></section>`).join('')
}

import { feeLines } from '../recurring'
import { recurrenceEditor } from './recurring'
import { editablePackages } from '../pricing'
import { escape, field, hidden, money, panel } from './shared'

export function optionalEditor(item: any = {}): string {
 return `<fieldset data-optional-item data-item-id="${escape(item.id??'')}"><legend>Optional item</legend>
 ${field('Item name','',item.label,'data-item-field="label" required maxlength="200"')}
 ${field('Unit price in USD','',item.unitPrice,'data-item-field="unitPrice" required inputmode="decimal"')}
 ${recurrenceEditor(item,'item')}
 ${field('Minimum quantity','',item.min??1,'data-item-field="min" required type="number" min="1" max="1000000"')}
 ${field('Maximum quantity','',item.max??10,'data-item-field="max" required type="number" min="1" max="1000000"')}
 ${field('Default quantity','',item.quantity??1,'data-item-field="quantity" required type="number" min="1" max="1000000"')}
 <label class="choice"><input type="checkbox" data-item-field="editable"${item.editable!==false?' checked':''}><span>Client can edit the quantity</span></label>
 <button type="button" class="secondary" data-package-action="remove-item">Remove optional item</button></fieldset>`
}
function packageEditor(option: any): string {
 const suffix=option.id==='one'?'One':option.id==='two'?'Two':''
 return `<fieldset data-package-id="${escape(option.id)}"><legend>Package</legend>
 ${field('Option label',suffix?'option'+suffix:'',option.label,'data-package-field="label" required maxlength="200"')}
 ${field('Price in USD',suffix?'price'+suffix:'',option.price,'data-package-field="price" required inputmode="decimal"')}
 ${field('Package discount (%)','',option.discountPercent??'0','data-package-field="discountPercent" inputmode="decimal"')}
 ${field('Package discount in USD','',option.discountAmount??'0','data-package-field="discountAmount" inputmode="decimal"')}
<label>Show discounts to client<select data-package-field="showDiscount"><option value="yes"${option?.showDiscount!=='no'?' selected':''}>Show discounts</option><option value="no"${option?.showDiscount==='no'?' selected':''}>Show net prices only</option></select></label><label>Discount expiry date (UTC)<input type="date" data-package-field="discountExpiresOn" value="${escape(option?.discountExpiresOn??'')}"></label> <div data-optional-items>${(option.optionalItems??[]).map(optionalEditor).join('')}</div>
 <div class="actions"><button type="button" class="secondary" data-package-action="add-item">Add optional item</button>
 <button type="button" class="secondary" data-package-action="remove-package">Remove package</button></div></fieldset>`
}
export function packagesEditor(options: any[]): string {
 const packages=options.length?editablePackages(options):[{id:'one',label:'',price:''},{id:'two',label:'',price:''}]
 return `<div data-packages-editor><input type="hidden" data-packages-payload>
 <p>Offer one or more packages. Optional items start unselected; the client can add them and review the server total before accepting.</p>
 <div data-packages>${packages.map(packageEditor).join('')}</div>
 <button type="button" class="secondary" data-package-action="add-package">Add package</button>
 <p role="status" data-packages-status></p>
 <template data-package-template>${packageEditor({id:'',label:'',price:''})}</template>
 <template data-optional-template>${optionalEditor()}</template>
 <script src="/packages.js" defer></script></div>`
}

export const hasExpandedSelection = (options: any[]) => options.length!==2 || options.some((o:any,i:number)=>o.id!==['one','two'][i] || o.optionalItems?.length || o.tables?.some((t:any)=>t.lines.some((l:any)=>l.recurrence)))
export const selectionChoices = (selection:any) => (selection?.items??[]).map((x:any)=>({id:x.id,quantity:x.quantity}))
export function itemChoices(option:any, selection:any): string {
 return (option.optionalItems??[]).map((item:any)=>{
  const chosen=selection?.items?.find((x:any)=>x.id===item.id)
  return `<fieldset><legend>${escape(item.label)}</legend><label class="choice"><input type="checkbox" name="add.${escape(item.id)}" value="yes"${chosen?' checked':''}><span>Add ${escape(item.label)} — ${money(item.unitCents,'USD')}${item.recurrence?` per ${escape(item.recurrence.interval)} for ${item.recurrence.term} installments from ${escape(item.recurrence.startsOn)}`:" each"}</span></label>
  <label>Quantity for ${escape(item.label)}<input type="number" name="qty.${escape(item.id)}" value="${escape(chosen?.quantity??item.quantity)}" min="${item.min}" max="${item.max}" step="1"${item.editable?'':' readonly'} required></label>
  <p class="muted">${item.editable?`Choose ${item.min} to ${item.max}.`:`Fixed quantity: ${item.quantity}.`}</p></fieldset>`
 }).join('')
}
export function selectedSummary(selection:any,currency:string,reviewLabel?:string): string {
 if(!selection)return ''
 const review=reviewLabel!==undefined
 const total=selection.totalCents??selection.option?.cents,deposit=selection.depositCents??selection.deposit
 const conceal=selection.concealDiscount||selection.option?.concealDiscount
 const discount=conceal?0:selection.discountCents??selection.option?.discount?.cents,bps=selection.discountBps??selection.option?.discount?.bps
 const contents=`${feeLines(selection.fees,currency).map(line=>'<p>'+escape(line)+'</p>').join('')}${review?`<p>Package: ${escape(reviewLabel)}</p>`:''}<ul>${(selection.items??[]).map((x:any)=>`<li>${escape(x.label)} · ${x.quantity} × ${money(x.unitCents,currency)}${x.recurrence?` × ${x.recurrence.term} installments`:""} = ${money(x.totalCents,currency)}</li>`).join('')}</ul>${discount?`<p>Package discount: ${escape(bps/100)}% · −${money(discount,currency)}</p>`:''}<p>Total: <output aria-label="Selected total">${money(total,currency)}</output></p><p>Deposit due: <output aria-label="Selected deposit">${money(deposit,currency)}</output></p>`
 // A native fragment target restores reading/focus after the GET review, even
 // without JavaScript. Other summary surfaces retain their existing markup.
 return review?`<section class="panel" id="selection-review" tabindex="-1" aria-labelledby="selection-heading"><h2 id="selection-heading">Your selection</h2>${contents}</section>`:panel('Your selection',contents)
}

import { field, form, hidden, panel } from './shared'
export function collectionFeesPanel(s:any){
 const f=s.collectionFees;if(!f)return ''
 return panel('Card fee policy',form('payment.surcharge','/app/settings',hidden('version',f.version)+field('Card fee percent','percent',f.bps/100,'type="number" min="0" max="3" step="0.01"')+field('Billing states where the fee is confirmed permitted','allowedStates',f.allowedStates.join(', '),'placeholder="Two-letter state codes"')+field('Billing states where fees are prohibited','prohibitedStates',f.prohibitedStates.join(', '),'placeholder="Two-letter state codes"')+'<p>Unknown and prohibited billing states have no fee. ACH has no card fee.</p><label class="choice"><input type="checkbox" name="consent" value="yes"><span>I have confirmed this fee is allowed in every listed permitted billing state.</span></label><button>Save card fee policy</button>'))
}

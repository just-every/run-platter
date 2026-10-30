import { escape, form, hidden, panel, proposalPath } from './shared'

const methods = [['card', 'Card'], ['ach', 'ACH bank payment'], ['apple_pay', 'Apple Pay'], ['google_pay', 'Google Pay']] as const

export function collectionPolicyPanel(proposal: any, state?: any): string {
 if (!['draft', 'approved'].includes(proposal.status)) return ''
 const policy = proposal.collectionPolicy, completion = policy?.enabled ? policy.completion : 'off', provider = policy?.provider ?? 'stripe'
 const editable = proposal.collectionPolicyEditable !== false
 const paypal = state?.connections?.find((connection: any) => connection.provider === 'paypal' && connection.status === 'connected')
 const labels = { off: 'Off — collect payment separately', required: 'Required — collect the deposit before acceptance completes', due: 'Due — allow acceptance with the deposit still due' }
 const policyField = !editable
  ? hidden('completion', completion) + `<p>${escape(labels[completion as keyof typeof labels])}</p><p>Only the owner and admins change when deposit collection is required or select the payment provider.</p>`
  : `<label>Acceptance and deposit<select name="completion" aria-label="Acceptance and deposit">${Object.entries(labels).map(([value, label]) => `<option value="${value}"${completion === value ? ' selected' : ''}>${escape(label)}</option>`).join('')}</select></label>`
 const merchant = provider === 'paypal' ? (editable ? paypal?.accountId ?? policy?.merchantId : policy?.merchantId) ?? '' : ''
 const connectionVersion = provider === 'paypal' ? (editable ? paypal?.version ?? policy?.connectionVersion : policy?.connectionVersion) ?? '' : ''
 const providerField = editable
  ? `<label>Deposit payment provider<select name="provider" aria-label="Deposit payment provider" data-collection-provider><option value="stripe"${provider === 'stripe' ? ' selected' : ''}>Stripe</option><option value="paypal" data-merchant-id="${escape(paypal?.accountId ?? merchant)}" data-connection-version="${escape(paypal?.version ?? connectionVersion)}"${provider === 'paypal' ? ' selected' : ''}>PayPal${paypal ? ' · ' + escape(paypal.accountId) : ' · connect in Settings'}</option></select></label>`
  : hidden('provider', provider) + '<p>Deposit payment provider: ' + (provider === 'paypal' ? 'PayPal' : 'Stripe') + '</p>'
 return panel('Deposit collection', form('payment.collection', proposalPath(proposal.id),
  hidden('id', proposal.id) + hidden('version', proposal.version) + policyField +
  '<p>Required: the deposit must be collected before acceptance completes. Due: the client can complete acceptance while the deposit remains due. Off completes acceptance without collecting here.</p>' +
  providerField + hidden('merchantId', merchant) + hidden('connectionVersion', connectionVersion) +
  `<div data-paypal-policy${provider === 'paypal' ? '' : ' hidden'}><p>PayPal collects a one-time USD deposit for a tax-free agreement with one client. The client approves on PayPal, then explicitly confirms payment here. No future charges are authorized.</p><p data-paypal-merchant>Verified PayPal merchant: ${escape(merchant || paypal?.accountId || 'Connect PayPal in Settings before enabling collection.')}</p></div>` +
  `<input type="hidden" name="paymentMethods" value="[&quot;paypal&quot;]" data-paypal-method${provider === 'paypal' ? '' : ' disabled'}>` +
  `<div data-stripe-methods${provider === 'paypal' ? ' hidden' : ''}><fieldset${provider === 'paypal' ? ' disabled' : ''}><legend>Payment methods offered to the client</legend>` + hidden('methodsProvided', 'yes') +
  methods.map(([value, label]) => `<label class="choice"><input type="checkbox" name="method:${value}" value="yes"${policy?.methods?.includes(value) ? ' checked' : ''}><span>${label}</span></label>`).join('') +
  '</fieldset></div><label class="choice"><input type="checkbox" name="consent" value="yes"><span>I authorize the selected verified merchant for this proposal.</span></label><button type="submit">Save deposit collection</button>') + '<script src="/paypal-collection.js" defer></script>')
}

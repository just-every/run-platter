import { escape, hidden, money, panel } from './shared'

export function paypalCollectionPanel(view: any, token: string): string {
 const c = view.collection, acceptance = view.acceptance
 if (!acceptance) return panel('Deposit payment', '<p>' + (c.completion === 'required' ? 'Your signature is retained immediately. Acceptance completes when PayPal confirms the deposit.' : 'Signing completes acceptance. The deposit remains due until PayPal confirms payment.') + '</p><p>You will review and approve your one-time USD deposit on PayPal. Returning here does not collect payment; you must explicitly confirm payment after approval.</p>')
 if (acceptance.depositCents === 0) return ''
 const payment = c.payment, status = payment?.status, paid = status === 'succeeded', approved = status === 'approved'
 const held = Boolean(payment && !['created', 'approved', 'succeeded'].includes(status))
 const amount = money(payment?.cents ?? acceptance.depositCents, acceptance.currency ?? view.currency), revision = acceptance.revision
 const endpoint = '/p/' + encodeURIComponent(token)
 const refresh = `<form data-paypal-status method="post" action="${endpoint}/paypal-status.json"><button class="secondary">Refresh PayPal payment status</button></form>`
 const title = paid ? 'Deposit paid' : held ? 'Deposit awaiting confirmation' : approved ? 'PayPal approval confirmed — confirm payment' : 'Deposit due'
 let body = `<p>${amount}${paid ? ' received.' : ' deposit due.'} Agreement revision ${escape(revision)}.</p>`
 if (payment?.authorization) body += '<p class="preserve">' + escape(payment.authorization) + '</p>'
 if (paid) body += '<p>PayPal confirmed this deposit.</p>'
 else if (held) body += '<p>The payment outcome is held for confirmation. Refresh its status or contact the firm before taking any further payment action.</p>'
 else {
  body += approved ? '<p>PayPal approved this order. Confirm below to collect the exact one-time deposit. Approval and returning from PayPal do not complete payment.</p>' : '<p>Continue to PayPal to review and approve this one-time deposit. After returning, refresh the payment status and explicitly confirm payment here. No future charges are authorized.</p>'
  body += `<form data-paypal-${approved ? 'capture' : 'prepare'} method="post" action="${endpoint}/${approved ? 'paypal-capture' : 'paypal'}.json">` + hidden('cents', payment?.cents ?? acceptance.depositCents) + hidden('revision', revision) +
   `<label class="choice"><input type="checkbox" name="consent" value="yes" required><span>${approved ? 'I authorize collecting' : 'I agree to review and approve'} my one-time PayPal deposit of ${amount} for agreement revision ${escape(revision)}. No future charges are authorized.</span></label><button>${approved ? 'Pay ' + amount + ' deposit' : 'Continue to PayPal approval'}</button></form>`
 }
 body += refresh + '<p data-paypal-feedback role="status" tabindex="-1"></p><noscript><p>Enable JavaScript to approve the PayPal deposit and explicitly confirm payment.</p></noscript><script src="/paypal-collection.js" defer></script>'
 return panel(title, body)
}

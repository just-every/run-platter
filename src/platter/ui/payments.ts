import { escape, field, form, hidden, money, panel, proposalPath } from './shared'

export function paymentsPanel(s: any, p: any) {
 if (!['owner', 'admin', 'billing'].includes(s.actor.role) || !p.acceptance) return ''
 const back = proposalPath(p.id), confirm = '<label><input type="checkbox" name="consent" value="yes" required>I confirm this financial action.</label>'
 const record = form('payment.record', back, hidden('id', p.id) + '<label>Payment method<select name="method"><option value="check">Check</option><option value="wire">Wire</option><option value="ach_credit">ACH credit</option></select></label>' + field('Amount received', 'amount', '', 'required inputmode="decimal"') + field('Payment reference', 'reference', '', 'required maxlength="200"') + field('Payment received on', 'receivedOn', new Date().toISOString().slice(0, 10), 'type="date" required') + confirm + '<button>Record received payment</button>')
 const bind = form('payment.bind', back, hidden('id', p.id) + field('Stripe deposit charge id', 'chargeId', '', 'required maxlength="200"') + confirm + '<button>Verify and link Stripe deposit</button>')
 const records = s.paymentRecords.filter((r: any) => r.proposal_id === p.id).map((r: any) => {
  const provider = r.method === 'paypal' ? 'PayPal' : 'Stripe'
  const held = r.refunds.some((refund: any) => ['reserved', 'needs_review', 'pending_provider'].includes(refund.status))
  const refundable = ['stripe', 'paypal'].includes(r.method) && !held && r.cents > r.heldCents
  const refund = refundable ? form('payment.refund', back, hidden('id', p.id) + hidden('paymentId', r.id) + hidden('requestId', crypto.randomUUID()) + field('Refund amount', 'amount', '', 'required inputmode="decimal"') + field('Refund reason', 'reason', '', 'required maxlength="1000"') + confirm + '<button>Refund ' + provider + ' deposit</button>') : held ? '<p>Refund held for provider reconciliation. Check the provider outcome before creating another refund request.</p>' : ''
  return '<article><h3>' + escape(r.method) + ' · ' + money(r.cents, r.currency) + '</h3><p>Reference: ' + escape(r.reference) + '</p><ul>' + r.refunds.map((f: any) => '<li>' + money(f.cents, r.currency) + ' · ' + escape(f.status) + '</li>').join('') + '</ul>' + refund + '</article>'
 }).join('')
 return panel('Payments and refunds', '<p>Record money already received, or refund a provider-confirmed deposit. Stripe linking requires metadata platter_proposal_id and platter_revision matching the accepted deposit. PayPal deposits appear here after PayPal confirms capture. Enter the exact refund amount and reason, including for a partial refund. Refunds with an uncertain result remain held for provider reconciliation; do not create a new request for the same refund.</p>' + record + bind + records)
}

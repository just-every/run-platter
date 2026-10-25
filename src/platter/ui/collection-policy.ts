import { escape, form, hidden, panel, proposalPath } from './shared'

const methods = [['card', 'Card'], ['ach', 'ACH bank payment'], ['apple_pay', 'Apple Pay'], ['google_pay', 'Google Pay']] as const

export function collectionPolicyPanel(proposal: any): string {
 if (!['draft', 'approved'].includes(proposal.status)) return ''
 const policy = proposal.collectionPolicy, completion = policy?.enabled ? policy.completion : 'off'
 const labels = { off: 'Off — collect payment separately', required: 'Required — collect the deposit before acceptance completes', due: 'Due — allow acceptance with the deposit still due' }
 const policyField = proposal.collectionPolicyEditable === false
  ? hidden('completion', completion) + `<p>${escape(labels[completion as keyof typeof labels])}</p><p>Only the owner and admins change when deposit collection is required.</p>`
  : `<label>Acceptance and deposit<select name="completion">${Object.entries(labels).map(([value, label]) => `<option value="${value}"${completion === value ? ' selected' : ''}>${escape(label)}</option>`).join('')}</select></label>`
 return panel('Deposit collection', form('payment.collection', proposalPath(proposal.id),
  hidden('id', proposal.id) + hidden('version', proposal.version) + policyField +
  '<p>Required: the deposit must be collected before acceptance completes. Due: the client can complete acceptance while the deposit remains due. Off completes acceptance without collecting here.</p>' +
  hidden('methodsProvided', 'yes') + '<fieldset><legend>Payment methods offered to the client</legend>' +
  methods.map(([value, label]) => `<label class="choice"><input type="checkbox" name="method:${value}" value="yes"${policy?.methods?.includes(value) ? ' checked' : ''}><span>${label}</span></label>`).join('') +
  '</fieldset><button type="submit">Save deposit collection</button>'))
}

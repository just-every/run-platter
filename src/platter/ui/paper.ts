import { date, escape, field, hidden, money, panel, proposalPath } from './shared'

// SIGN-008 screens: record a client-signed copy, and label how an agreement was accepted.
export function paperAcceptanceForm(state: any, p: any): string {
  if (state.actor?.role !== 'owner' || p.status !== 'sent') return ''
  const options = (p.options ?? []).map((o: any) => `<label class="choice option-choice"><input type="radio" name="optionId" value="${escape(o.id)}" required><span>${escape(o.label)} — ${money(o.cents, p.currency)}</span></label>`).join('')
  const returnTo = encodeURIComponent(proposalPath(p.id))
  return panel('Record acceptance signed outside Platter', `<p>Use this when the client signed revision ${escape(p.revision)} in their own procurement or signing system. Platter keeps the file and your attestation; it does not verify the signature.</p>`
    + `<form method="post" enctype="multipart/form-data" action="/app/paper-acceptance?returnTo=${returnTo}">${hidden('id', p.id)}${hidden('version', p.version)}`
    + `<fieldset><legend>Option the client signed</legend>${options}</fieldset>`
    + field('Signer full name', 'signer', '', 'required maxlength="200" autocomplete="off"')
    + field('Signed date', 'signedOn', '', 'required type="date"')
    + '<label>Client-signed copy<input name="file" type="file" required></label>'
    + '<label class="choice"><input type="checkbox" name="attest" value="yes" required><span>I attest that this file is the client\'s signed copy of this revision, signed by the named signer on that date.</span></label>'
    + '<button>Record accepted by upload</button></form>')
}

export function acceptanceMethod(a: any, signedCopyBase?: string): string {
  if (a.method !== 'upload') return '<dt>Acceptance method</dt><dd>Platter e-signature after mailbox verification</dd>'
  const copy = a.signedCopy && signedCopyBase ? `<dt>Signed copy</dt><dd><a href="${signedCopyBase}${encodeURIComponent(a.signedCopy.id)}">${escape(a.signedCopy.filename)} · ${escape(a.signedCopy.size)} bytes</a></dd>` : ''
  return `<dt>Acceptance method</dt><dd>Accepted by upload: signed outside Platter. Platter did not verify this signature.</dd><dt>Signed on</dt><dd>${escape(a.signedOn)}</dd>${copy}<dt>Attested by</dt><dd>${escape(a.attestedBy)} · ${date(a.attestedAt)}</dd>`
}

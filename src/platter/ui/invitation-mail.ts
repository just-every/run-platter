import { date, escape, field, panel, type Feedback } from './shared'

export function invitationFields(p: any, feedback?: Feedback) {
 const retry = feedback?.command === 'proposal.send' && feedback.input?.id === p.id ? feedback.input : undefined
 return `<details${retry ? ' open' : ''}><summary>Review invitation email</summary><p>The personal message goes with a new client link. Sending keeps this revision’s approved content.</p>` +
  field('Invitation subject', 'mailSubject', retry?.mailSubject ?? 'Your proposal: ' + p.title, 'required maxlength="200"') +
  `<label for="invitation-message-${escape(p.id)}">Invitation message</label><textarea id="invitation-message-${escape(p.id)}" name="mailMessage" rows="4" required maxlength="10000">${escape(retry?.mailMessage ?? 'Review your proposal and verify your email before accepting:')}</textarea><p class="muted">Platter appends the new client link. Fill all variables before sending.</p></details>`
}

export function invitationTimeline(p: any) {
 if (!p.invitationMessages?.length) return ''
 return panel('Invitation email history', '<p>Exact subject and personal message queued for each invitation. Client links are excluded from this retained history. Queuing does not confirm delivery.</p><ol>' + p.invitationMessages.map((m: any) =>
  `<li><p>Revision ${escape(m.revision)} · ${escape(m.recipient)} · Queued ${date(m.queued_at)}</p><h3>${escape(m.subject)}</h3><p class="preserve">${escape(m.message)}</p></li>`).join('') + '</ol>')
}

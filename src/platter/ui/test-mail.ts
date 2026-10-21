import { date, escape, field, form, hidden, panel, proposalPath, type Feedback } from './shared'

export function testMailPanel(state: any, p: any, feedback?: Feedback) {
 if (!['owner', 'member'].includes(state.actor?.role)) return ''
 const retry = feedback?.command === 'proposal.test-mail' && feedback.input?.id === p.id ? feedback.input : undefined
 const composer = ['draft', 'approved'].includes(p.status) ? form('proposal.test-mail', proposalPath(p.id),
  hidden('id', p.id) + hidden('version', p.version) +
  `<p>A rehearsal for <strong>${escape(state.actor.email)}</strong>. The link opens this revision’s preview after sign-in. Clients receive nothing; your approval and offer stay as they are.</p>` +
  field('Test subject', 'subject', retry?.subject ?? 'Your proposal: ' + p.title, 'required maxlength="200"') +
  `<label for="test-message-${escape(p.id)}">Test message</label><textarea id="test-message-${escape(p.id)}" name="message" rows="5" required maxlength="10000">${escape(retry?.message ?? 'Review your proposal and verify your email before accepting:')}</textarea>` +
  '<p class="muted">The subject starts with [Test]. Up to 10 tests per person and proposal each calendar day in the installation time zone.</p><button class="secondary">Send test to me</button>') : ''
 const timeline = p.testMail?.length ? '<h3>Test-send timeline</h3><ul>' + p.testMail.map((event: any) => `<li>Test queued · ${date(event.occurred_at)}</li>`).join('') + '</ul>' : ''
 return composer || timeline ? panel('Test the proposal email', composer + timeline) : ''
}

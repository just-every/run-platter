import { date, escape, field, form, hidden, panel, proposalPath } from './shared'

export function expiryLabel(expiry: any): string {
 if (!expiry || expiry.mode === 'never') return 'No expiry date.'
 if (!expiry.date) return `Expires ${escape(expiry.days)} calendar days after sending.`
 return `Expires at the start of ${escape(expiry.date)} (${escape(expiry.timeZone)}).`
}

export function expiryPanel(state: any, p: any): string {
 const expiry = p.expiry ?? { mode: 'never' }
 if (p.status === 'withdrawn') return ''
 if (p.status === 'accepted') return panel('Expiry', '<p>Accepted agreements never expire.</p>')
 let html = `<p${expiry.expired ? ' role="status"' : ''}>${expiry.expired ? '<strong>This offer has expired.</strong> ' : ''}${expiryLabel(expiry)}</p>`
 if (state.actor?.role !== 'owner') return panel('Expiry', html)
 if (['sent','expired'].includes(p.status) && expiry.sentAt == null) html += '<p>No original send time is recorded for this legacy offer. Choose a specific expiry date or send a negotiated revision; calendar days after sending is unavailable.</p>'
 const returnTo = proposalPath(p.id), identity = hidden('id', p.id) + hidden('version', p.version)
 html += '<p>Expiry starts at midnight on the expiry date in the installation time zone. Days are calendar days from the first send date. A fresh invitation keeps that deadline; sending a negotiated revision starts the period again.</p>'
 html += form('expiry.set', returnTo, identity
  + `<label>Expiry type<select name="mode"><option value="never"${expiry.mode === 'never' ? ' selected' : ''}>Never</option><option value="days"${expiry.mode === 'days' ? ' selected' : ''}>Calendar days after sending</option><option value="date"${expiry.mode === 'date' ? ' selected' : ''}>Specific date</option></select></label>`
  + field('Expiry period in calendar days', 'days', expiry.days ?? '', 'type="number" min="1" max="36500" step="1"')
  + field('Expiry date in installation time', 'date', expiry.date ?? '', 'type="date"')
  + field('Warning lead days (leave blank for no warning)', 'warningDays', expiry.warningDays ?? '', 'type="number" min="1" max="36500" step="1"')
  + `<p>Time zone: ${escape(state.timeZone ?? expiry.timeZone ?? 'UTC')}. Change the installation time zone in report settings. The warning uses fixed automatic wording and goes once to the current unsigned signer for each sent revision. Shared editable email templates are not available.</p>`
  + (expiry.warningSentAt ? `<p>Warning queued: ${date(expiry.warningSentAt)}. Changing this deadline does not send a second warning for this revision.</p>` : '')
  + '<button>Save expiry</button>')
 if (expiry.mode !== 'never') html += form('expiry.remove', returnTo, identity + '<button class="secondary">Remove expiry</button>')
 const requests = expiry.reopenRequests ?? []
 if (requests.length) html += `<h3>Reopen requests</h3><ol class="records">${requests.map((r: any) => `<li><p>Revision ${escape(r.revision)} · Requested ${date(r.requestedAt)}</p><p>${r.resolvedAt ? `${escape(r.resolution)} · ${date(r.resolvedAt)}` : 'Waiting for your response. Extend the expiry or remove it to reopen the same links, or prepare and send a negotiated revision to reissue.'}</p></li>`).join('')}</ol>`
 return panel('Expiry and reopening', html)
}

export function clientExpiryPanel(view: any, publicForm: (name: string, body: string) => string): string {
 if (view.status === 'accepted' || view.acceptance) return ''
 const expiry = view.expiry
 if (!expiry) return ''
 if (!expiry.expired) return panel('Offer expiry', `<p>${expiryLabel(expiry)}</p>`)
 const pending = (expiry.reopenRequests ?? []).some((r: any) => !r.resolvedAt && r.revision === view.revision && r.deadlineAt === expiry.deadlineAt)
 return panel('This proposal has expired', `<p>${expiryLabel(expiry)} Acceptance is closed.</p>`
  + (!view.verified ? '<p>Verify your email below to ask the firm to reopen this offer.</p>'
    : pending ? '<p role="status">Your request to reopen this proposal has been saved. The firm can extend this offer or send you a revised one.</p>'
      : '<p>Ask the firm to reopen this offer so you can accept it.</p>' + publicForm('expiry.reopen', '<button>Request reopening</button>')))
}

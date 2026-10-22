import { area, date, empty, escape, field, form, hidden, panel, proposalPath, statusPill } from './shared'

const deliveryStates: Record<string, { label: string; detail: string }> = {
  withheld: { label: 'Sending refused', detail: 'The sender’s permission or approval changed. Nothing was sent.' },
  local: { label: 'Captured locally', detail: 'No external email was sent.' },
  pending: { label: 'Queued', detail: 'Waiting for a sending attempt. The provider has not accepted this invitation.' },
  sending: { label: 'Sending', detail: 'A sending attempt is in progress. Delivery is not confirmed.' },
  accepted: { label: 'Accepted by provider', detail: 'The provider accepted this invitation for processing. Delivery to the recipient’s mail server is not confirmed.' },
  uncertain: { label: 'Status unknown', detail: 'The sending result could not be confirmed. Check before sending another invitation; the first may have been sent.' },
  delivered: { label: 'Delivery reported', detail: 'The provider reports acceptance by the recipient’s mail server. This does not confirm that a person received or read the invitation.' },
  deferred: { label: 'Delivery delayed', detail: 'The provider reports a delivery delay. Delivery is not confirmed.' },
  bounced: { label: 'Bounced', detail: 'The provider reports that the invitation was refused or returned. Follow up with the recipient.' },
  complained: { label: 'Spam complaint reported', detail: 'The provider reported a spam complaint for this invitation. Follow up before sending again.' },
  failed: { label: 'Sending failed', detail: 'The sending attempt failed. Delivery is not confirmed.' },
  rejected: { label: 'Rejected by provider', detail: 'The provider rejected this invitation.' },
}

function correction(noticeId: unknown, email: unknown, returnTo: string): string {
  return '<p>Correcting the address sends a fresh invitation and replaces the old invitation link and verification session. The frozen offer stays unchanged. An uncertain sending result keeps the follow-up open.</p>'
    + form('delivery.correct', returnTo, hidden('noticeId', noticeId)
      + field('Correct recipient email', 'email', email, 'type="email" autocomplete="email" required')
      + '<button>Correct address and send fresh invitation</button>')
}

export function deliveryPanel(state: any, p: any): string {
  const deliveries = p.deliveries ?? []
  const list = deliveries.length ? `<ol class="records" aria-label="Invitation delivery history">${deliveries.map((mail: any) => {
    const status = deliveryStates[String(mail.status)]
    return `<li><article><h3>${escape(mail.recipient)}</h3><p>${statusPill(status?.label ?? 'Status unknown')}</p>`
      + `<p>${escape(status?.detail ?? 'No confirmed delivery result is available.')}</p>`
      + `<dl><dt>Invitation created</dt><dd>${date(mail.created_at)}</dd>`
      + (mail.event_at ? `<dt>Provider event reported</dt><dd>${date(mail.event_at)}</dd>` : '')
      + (mail.provider ? `<dt>Provider</dt><dd>${escape(mail.provider)}</dd>` : '')
      + '</dl></article></li>'
  }).join('')}</ol>` : empty('No invitation has been recorded for this proposal.')
  const attribution=(p.mailAttributions??[]).map((m:any)=>'<p>'+escape(m.actor_email)+' · '+escape(m.route==='installation'?'Installation sender':m.route+' mailbox')+' · '+escape(m.sender_address)+' · '+escape(m.outcome==='accepted'?'Accepted by provider':m.outcome)+(m.fallback?' · Mailbox unavailable; sent through the installation sender.':'')+'</p>').join('')
  const replies=(p.mailReplies??[]).map((m:any)=>'<article><h3>Client email reply · revision '+escape(m.revision)+'</h3><p>'+'Claimed From: '+escape(m.claimed_from??m.client_email)+' · '+date(m.received_at)+'</p><p>Resend SPF: '+escape(m.spf_result)+' · DKIM: '+escape(m.dkim_result)+'. The From address is not proven client identity.</p><p>This email is a record only. It does not approve, sign or change the proposal.</p><p class="preserve">'+escape(m.text)+'</p></article>').join('')
  const notice = state.bounceNotices?.find((n:any)=>n.proposal_id===p.id&&!n.closed_at)
  const correct = p.canSend && p.status === 'sent' && notice
    ? '<h3>Correct invitation address</h3>' + correction(notice.id, notice.recipient, proposalPath(p.id)) : ''
  return panel('Invitation delivery', (state.mailTransport==='cloudflare'?'<p>Delivery events unavailable with this mail transport.</p>':'') + '<p>Invitations are listed newest first. Provider acceptance is separate from reported delivery; neither proves a person received or read the invitation.</p>' + attribution + list + replies + correct)
}

export function bounceInbox(state: any): string {
  const caps=state.replyCapNotices?.length?panel('Email reply limits', '<p>One notice is saved per invitation that reaches its one-reply limit. Further replies are not recorded.</p><ul class="records">'+state.replyCapNotices.map((n:any)=>'<li><a href="'+escape(proposalPath(n.proposal_id))+'">'+escape(n.title)+'</a> · revision '+escape(n.revision)+' · '+date(n.created_at)+'</li>').join('')+'</ul>'):''
  if (!state.bounceNotices?.length) return caps
  const notices = state.bounceNotices ?? []
  const list = notices.length ? `<ul class="records" aria-label="Sender bounce notices">${notices.map((notice: any) => {
    const proposal = (state.proposals ?? []).find((p: any) => String(p.id) === String(notice.proposal_id))
    const path = proposalPath(notice.proposal_id)
    const read = notice.read_at ? `Read ${date(notice.read_at)}` : 'Unread'
    const followUp = notice.closed_at ? `Closed ${date(notice.closed_at)}` : 'Open follow-up'
    const markRead = notice.read_at ? '' : form('delivery.read', '/app', hidden('noticeId', notice.id) + '<button>Mark notice as read</button>')
    const dismiss = notice.closed_at ? '' : form('delivery.dismiss', '/app', hidden('noticeId', notice.id)
      + area('Reason for closing follow-up (logged)', 'reason', '', 'required')
      + '<button>Close follow-up</button>')
    const correct = !notice.closed_at && proposal?.status === 'sent'
      ? '<h4>Correct invitation address</h4>' + correction(notice.id, notice.recipient, '/app') : ''
    return `<li><article><h3><a href="${escape(path)}">${escape(notice.title)}</a></h3>`
      + `<p>Bounced invitation to ${escape(notice.recipient)} · ${date(notice.created_at)}</p>`
      + `<dl><dt>Notice</dt><dd>${read}</dd><dt>Follow-up</dt><dd>${followUp}</dd>`
      + (notice.action ? `<dt>Recorded action</dt><dd>${escape(notice.action)}</dd>` : '') + '</dl>'
      + markRead + correct + dismiss + '</article></li>'
  }).join('')}</ul>` : empty('No bounced invitation notices.')
  return caps+panel('Bounced invitations', '<p>These notices belong to the sending person and stay here after reading or closing. Reading a notice does not close its follow-up. An uncertain sending result keeps the follow-up open. Close a follow-up only after checking it, with a logged reason.</p>' + list)
}

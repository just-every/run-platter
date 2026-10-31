import { clientLocale } from '../locales'
import { proposalMail } from '../mail'
import { recipientPlan } from '../recipients'
import { action, date, escape, field, hidden, panel, proposalPath, type Feedback } from './shared'

export function invitationComposer(state: any, p: any, feedback?: Feedback) {
 if (!p.canSend || (!p.approval?.complete && !['sent','expired'].includes(p.status))) return ''
 const defaults=proposalMail(p.title,'',clientLocale(p))
 const retry = feedback?.command === 'proposal.send' && feedback.input?.id === p.id ? feedback.input : undefined
 return panel('Review invitation email', `<form id="invitation-${escape(p.id)}" method="post" action="${action('proposal.send', proposalPath(p.id))}">${hidden('id', p.id)}${hidden('version', p.version)}<p>The personal message goes with a new client link. Sending freezes this revision’s content.</p>` +
  (state.smsTransportAvailable&&!recipientPlan(p).length?'<label for="invitation-delivery-'+escape(p.id)+'">Invitation delivery</label><select id="invitation-delivery-'+escape(p.id)+'" name="delivery"><option value="email">Email invitation</option><option value="sms"'+(retry?.delivery==='sms'?' selected':'')+'>Prepare text-only invitation</option></select><p>Text-only preparation sends no email. After preparing the link, record recipient assent and explicitly send the text in SMS Settings.</p>':'')+
  field('Invitation subject', 'mailSubject', retry?.mailSubject ?? defaults[0].slice(0, 200), 'required maxlength="200"') +
  `<label for="invitation-message-${escape(p.id)}">Invitation message</label><textarea id="invitation-message-${escape(p.id)}" name="mailMessage" rows="4" required maxlength="10000">${escape(retry?.mailMessage ?? defaults[1].trimEnd())}</textarea><p class="muted">Platter appends the new client link. Fill all variables before sending.</p>${state.clientMailRepliesAvailable?'<label><input type="checkbox" name="mailRepliesConsent" value="yes"> Allow one client email reply to be saved on this proposal, visible to its collaborators. The email is a record, not an approval or signature. From is not proven identity; Resend SPF/DKIM results are shown. Automatic replies and bulk mail are dropped. The owner receives one in-app notice if the one-reply limit is reached. This consent is audited.</label>':''}<button>Send this invitation</button></form>`)
}

export function invitationTimeline(p: any) {
 if (!p.invitationMessages?.length) return ''
 return panel('Invitation email history', '<p>Exact subject and personal message queued for each invitation. Client links are excluded from this retained history. Queuing does not confirm delivery.</p><ol>' + p.invitationMessages.map((m: any) =>
  `<li><p>Revision ${escape(m.revision)} · ${escape(m.recipient)} · Queued ${date(m.queued_at)}</p><h3>${escape(m.subject)}</h3><p class="preserve">${escape(m.message)}</p></li>`).join('') + '</ol>')
}

export function signerReplacementPanel(p:any){
 const slots=recipientPlan(p).filter(r=>['signer','countersigner'].includes(r.role)&&!p.recipientSignatures?.some((s:any)=>s.slot_id===r.id)),slotSelector=recipientPlan(p).length?'<label>Signer slot<select name="recipientId" aria-label="Signer slot">'+slots.map(r=>'<option value="'+escape(r.id)+'">'+escape(r.name)+'</option>').join('')+'</select></label>':''
 const history=p.signerReplacements??[]
 const rows=history.length?'<ol>'+history.map((r:any)=>`<li><p>${escape(r.old_recipient)} → ${escape(r.new_recipient)} · Position ${escape(r.signing_position)}</p><p>${escape(r.actor_email)} · ${date(r.replaced_at)}</p><p>${escape(r.reason)}</p><p>Required identity: ${escape(r.required_method)}</p></li>`).join('')+'</ol>':''
 const controls=p.canSend&&p.status==='sent'&&!p.negotiating?`<form method="post" action="${action('signer.replace',proposalPath(p.id))}">${hidden('id',p.id)}${hidden('version',p.version)}${slotSelector}<p>The new signer keeps this signing position and identity requirement. The previous link and verification are revoked. SMS consent and reminders require fresh authorization.</p>${field('Replacement signer email','recipient','','type="email" required maxlength="254"')}${field('Replacement reason','reason','','required maxlength="1000"')}${field('Replacement invitation subject','mailSubject',('Your proposal: '+p.title).slice(0,200),'required maxlength="200"')}<label>Replacement invitation message<textarea name="mailMessage" required maxlength="10000" rows="4">Review your proposal and verify your email before accepting:</textarea></label><button>Replace unsigned signer</button></form>`:p.acceptance?'<p>A signed recipient cannot be replaced.</p>':''
 return controls||rows?panel('Signer replacement',controls+rows):''
}

export function signerDelegationSettings(state:any){
 if(state.actor.role!=='owner')return ''
 const offers=state.proposals.filter((p:any)=>p.status==='sent'&&!p.negotiating&&p.recipient_plan==='[]'&&!p.collectionPolicy?.enabled)
 return offers.length?panel('Signer delegation Settings','<p>Enable delegation explicitly for each sent offer. Only mailbox-verified recipients can delegate; every new signer must verify before viewing.</p>'+offers.map((p:any)=>`<form method="post" action="${action('signer.delegation.configure','/app/settings')}">${hidden('id',p.id)}${hidden('version',p.version)}${hidden('enabled',p.delegation?.enabled?'no':'yes')}<h3>${escape(p.title)} · Revision ${escape(p.revision)}</h3><p>Delegation is ${p.delegation?.enabled?'on':'off'} for this offer.</p><button class="secondary">${p.delegation?.enabled?'Disable delegation':'Enable delegation'}</button></form>`).join('')):''
}
export function signerDelegationHistory(state:any,p:any){
 const history=p.delegation?.history??[]
 if(state.actor.role!=='owner')return ''
 const body=history.map((r:any)=>`<li><p>${escape(r.old_recipient)} delegated to ${escape(r.delegate_name)} · ${escape(r.new_recipient)}</p><p>${date(r.delegated_at)} · Position ${escape(r.signing_position)}</p>${r.undone_at?`<p>Undone ${date(r.undone_at)} by ${escape(r.undone_by)}</p>`:p.status==='sent'&&p.delegation.currentId===r.id?`<form method="post" action="${action('signer.delegation.undo',proposalPath(p.id))}">${hidden('id',p.id)}${hidden('version',p.version)}${hidden('delegationId',r.id)}<button class="secondary">Undo delegation</button></form>`:'<p>This delegation is no longer active.</p>'}</li>`).join('')
 return panel('Signer delegation','<p><a href="/app/settings">Manage delegation in Settings</a></p>'+(body?'<ol>'+body+'</ol>':''))
}

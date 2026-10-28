import { clientLocale, clientText } from './locales'
import { resendReplyAvailable } from './question-reply-mail'
import type { Bindings } from '../auth.server'
import { proposalMail, queueMail } from './mail'
import { need, text, type Actor } from './model'

/** Queue transport and retain link-free invitation text in the caller's atomic send. */
export function invitationMail(
 env: Bindings, actor: Actor, input: Record<string, unknown>,
 offer: { id: string; title: string; revision: number; client_locale?: string },
 recipient: string, shareUrl: string, at: number,
): D1PreparedStatement[] {
 let subject: string, message: string, body: string
 if (input.localizedDefaults === 'yes' || input.mailSubject === undefined && input.mailMessage === undefined) {
  const defaults = proposalMail(offer.title, shareUrl, clientLocale(offer))
  subject = defaults[0]
  body = defaults[1]
  message = body.slice(0, -(shareUrl.length + 1))
 } else {
  need(typeof input.mailSubject === 'string' && !/[\r\n]/.test(input.mailSubject), 'The email subject must be a single line')
  subject = text(input.mailSubject, 'an email subject', 200)
  message = text(input.mailMessage, 'an email message', 10000)
  const missing = (subject + '\n' + message).match(/\{([^{}]+)\}/)
  need(!missing, 'Fill the variable before sending: ' + (missing?.[1] ?? ''))
  body = message + '\n\n' + shareUrl
 }
 const replies=input.mailRepliesConsent===true||input.mailRepliesConsent==='yes'
 need(!replies||resendReplyAvailable(env),'Email replies are not configured',409)
 if(replies)body+='\n\n'+clientText("You may reply once from this invited address to add a plain-text message to the proposal. The full reply, including quoted text, is visible to the firm’s proposal collaborators. Remove private reply addresses and attachments before sending. This email is a record only, never an approval, signature or proposal state change. The From address is a claim, not proven client identity. Automatic replies and bulk mail are discarded. Only one reply is recorded per invitation; the owner receives one in-app notice if the limit is reached. A fresh invitation replaces this reply address.",clientLocale(offer))
 return [
  queueMail(env, offer.id, recipient, subject, body, actor.id, null, crypto.randomUUID(), true, replies),
  env.DB.prepare('INSERT INTO p_invitation_messages(id,proposal_id,revision,recipient,subject,message,queued_at,actor_id) VALUES(?,?,?,?,?,?,?,?)')
   .bind(crypto.randomUUID(), offer.id, offer.revision, recipient, subject, message, at, actor.id),
 ]
}

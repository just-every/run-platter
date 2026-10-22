import type { Bindings } from '../auth.server'
import { proposalMail, queueMail } from './mail'
import { need, text, type Actor } from './model'

/** Queue transport and retain link-free invitation text in the caller's atomic send. */
export function invitationMail(
 env: Bindings, actor: Actor, input: Record<string, unknown>,
 offer: { id: string; title: string; revision: number },
 recipient: string, shareUrl: string, at: number,
): D1PreparedStatement[] {
 let subject: string, message: string, body: string
 if (input.mailSubject === undefined && input.mailMessage === undefined) {
  const defaults = proposalMail(offer.title, shareUrl)
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
 return [
  queueMail(env, offer.id, recipient, subject, body, actor.id, null, crypto.randomUUID(), true),
  env.DB.prepare('INSERT INTO p_invitation_messages(id,proposal_id,revision,recipient,subject,message,queued_at,actor_id) VALUES(?,?,?,?,?,?,?,?)')
   .bind(crypto.randomUUID(), offer.id, offer.revision, recipient, subject, message, at, actor.id),
 ]
}

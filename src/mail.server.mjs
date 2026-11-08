import { createMailSender } from '@runeditrun/rer/internal/modules/mail/index.mjs'

export function operatorMail(env) {
 if (env.RER_DEMO === '1' || env.AUTH_LOCAL === 'true') {
  return createMailSender({ provider: 'development', mode: 'development' })
 }
 if (!env.MAIL_PROVIDER || env.MAIL_PROVIDER === 'development') return undefined
 return {
  async send(message) {
   return createMailSender({ provider: env.MAIL_PROVIDER, mode: 'production', apiKey: env.MAIL_API_KEY, ...(env.MAIL_PROVIDER === 'rer' ? { relayUrl: env.MAIL_RELAY_URL } : {}), ...(env.MAIL_PROVIDER === 'cloudflare' ? { accountId: env.MAIL_ACCOUNT_ID } : {}) }).send(message)
  },
 }
}

/** @typedef {{filename:string,contentType:string,content:Uint8Array,disposition:'attachment'}} MailAttachment */
const base64 = bytes => btoa(Array.from(bytes, c => String.fromCharCode(c)).join(''))
const wrapped = bytes => base64(bytes).match(/.{1,76}/g)?.join('\r\n') ?? ''

/** Compose the mailbox payload from the same retained bytes as installation mail. */
export function mailboxMime(from, to, subject, text, replyTo, attachments) {
 const boundary = 'platter-' + crypto.randomUUID()
 const headers = ['From: '+from, 'To: '+to, 'Subject: =?UTF-8?B?'+base64(new TextEncoder().encode(subject))+'?=', 'MIME-Version: 1.0', ...(replyTo ? ['Reply-To: '+replyTo] : [])]
 const body = ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', wrapped(new TextEncoder().encode(text))]
 if (!attachments?.length) return [...headers, ...body].join('\r\n')
 return [...headers, 'Content-Type: multipart/mixed; boundary="'+boundary+'"', '', '--'+boundary, ...body,
  ...attachments.flatMap(a => ['--'+boundary, 'Content-Type: '+a.contentType, 'Content-Disposition: attachment; filename="'+a.filename+'"', 'Content-Transfer-Encoding: base64', '', wrapped(a.content)]), '--'+boundary+'--', ''].join('\r\n')
}

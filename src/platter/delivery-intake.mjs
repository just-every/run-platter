import { createDeliveryEventIntake, createD1EventStore } from '@runeditrun/rer/internal/modules/mail/index.mjs'

export function deliveryIntake(env) {
 return createDeliveryEventIntake({
  provider: env.MAIL_PROVIDER, tenantId: env.AUTH_ORIGIN, eventNamespace: 'platter-mail-v1',
  key: env.MAIL_WEBHOOK_KEY, store: createD1EventStore({ db: env.DB }),
  authorize: async event => {
   if (event.recipients.length !== 1) return false
   const row = env.MAIL_PROVIDER === 'sendgrid'
    ? await env.DB.prepare('SELECT * FROM p_mail WHERE id=? AND provider=?').bind(event.deliveryId, event.provider).first()
    : await env.DB.prepare('SELECT * FROM p_mail WHERE provider_message_id=? AND provider=?').bind(event.providerMessageId, event.provider).first()
   return Boolean(row && row.recipient === event.recipients[0])
  },
 })
}

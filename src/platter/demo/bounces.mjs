// The demo's one failure: the provider reports a first invitation bounced, recorded through the same
// event store and delivery triggers a live provider webhook uses, so the owner's notice is real.
import { createD1EventStore } from '@runeditrun/rer/internal/modules/mail/index.mjs'

export async function reportBounces(env, bounces) {
  if (!bounces.length) return
  const events = []
  for (const bounce of bounces) {
    const mail = await env.DB.prepare('SELECT provider, provider_message_id FROM p_mail WHERE id = ?').bind(bounce.mailId).first()
    if (!mail?.provider) throw new Error('The demo bounce needs its sent invitation')
    events.push({ provider: mail.provider, tenantId: env.AUTH_ORIGIN, eventNamespace: 'platter-mail-v1', eventId: `demo-bounce-${bounce.mailId}`, fingerprint: `demo-bounce-${bounce.mailId}`,
      providerMessageId: mail.provider_message_id, recipients: [bounce.recipient], status: 'bounced', occurredAt: bounce.at })
  }
  await createD1EventStore({ db: env.DB }).commit(events)
}

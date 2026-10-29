import type { Bindings } from '../../auth.server'
import { providerCredential, openCredential, sealCredential } from '../connections'
import { actorById } from '../credentials'
import { currentTime } from '../expiry-time'
import { commit, need, text, type Actor } from '../model'
import { administrators } from '../permissions'

const credentialId = 'hubspot:app-card'
export async function configureHubspotCard(env: Bindings, actor: Actor, input: Record<string, unknown>) {
 need(administrators.includes(actor.role), 'Only owner and admins configure the HubSpot app card', 403)
 const { connection } = await providerCredential(env, 'workspace:hubspot')
 const guard = { sql: "EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:hubspot' AND version=? AND status='connected' AND broken_at IS NULL)", values: [connection.version] }
 if (input.enabled === 'no') {
  await commit(env.DB, actor, [env.DB.prepare('DELETE FROM p_crm_card_secrets')], true, guard)
  return { saved: true }
 }
 need(input.consent === true || input.consent === 'yes', 'Authorize this installed app to read linked proposal titles and status')
 const appId = text(input.appId, 'the installed HubSpot app id', 100)
 need(/^[A-Za-z0-9_-]+$/.test(appId), 'Use the installed app id')
 const clientSecret = text(input.clientSecret, 'the HubSpot app client secret', 8192)
 const sealed = await sealCredential(env, credentialId, { clientSecret, accountId: connection.account_id, appId })
 await commit(env.DB, actor, [env.DB.prepare('INSERT INTO p_crm_card_secrets(singleton,connection_version,authorized_at,sealed) VALUES(1,?,?,?) ON CONFLICT(singleton) DO UPDATE SET connection_version=excluded.connection_version,authorized_at=excluded.authorized_at,sealed=excluded.sealed').bind(connection.version, await currentTime(env.DB), sealed)], true, guard)
 return { saved: true }
}
export async function hubspotCardData(env: Bindings, actor: Actor, deal: unknown, account: unknown) {
 need(administrators.includes(actor.role), 'Only owner and admins open the HubSpot proposal card', 403)
 const dealId = text(deal, 'a HubSpot deal id', 100), accountId = text(account, 'the HubSpot account id', 200)
 need(/^[A-Za-z0-9_-]+$/.test(dealId), 'Use a HubSpot deal id')
 const { connection } = await providerCredential(env, 'workspace:hubspot')
 need(!connection.broken_at && connection.account_id === accountId, 'This card belongs to another or disconnected HubSpot account', 409)
 const rows = (await env.DB.prepare('SELECT p.id,p.title,p.status,p.revision FROM p_crm_draft_sources s JOIN p_proposals p ON p.id=s.proposal_id WHERE s.account_id=? AND s.deal_id=? ORDER BY p.created_at,p.id').bind(accountId, dealId).all<any>()).results
 return { dealId, accountId, startUrl: env.AUTH_ORIGIN + '/app/crm-card?' + new URLSearchParams({ dealId, accountId }), proposals: rows.map(p => ({ ...p, url: env.AUTH_ORIGIN + '/app/proposal?id=' + encodeURIComponent(p.id) })) }
}
/** Modern app cards use HubSpot's v3 signature. No session or credential is exported. */
export async function hubspotCardResponse(env: Bindings, request: Request) {
 need(request.method === 'GET', 'Use a signed card read', 405)
 const url = new URL(request.url), timestamp = request.headers.get('x-hubspot-request-timestamp') ?? '', signature = request.headers.get('x-hubspot-signature-v3') ?? ''
 need(/^\d{13}$/.test(timestamp) && Math.abs(await currentTime(env.DB) - Number(timestamp)) <= 300000, 'The HubSpot card request expired', 401)
 const { connection } = await providerCredential(env, 'workspace:hubspot')
 const row = await env.DB.prepare('SELECT * FROM p_crm_card_secrets WHERE singleton=1').first<any>()
 need(row && row.connection_version === connection.version && Number(timestamp) >= row.authorized_at && !connection.broken_at, 'Configure the connected HubSpot app card again', 401)
 const secret = await openCredential(env, credentialId, row.sealed)
 need(secret.accountId === connection.account_id && url.searchParams.get('portalId') === secret.accountId && url.searchParams.get('appId') === secret.appId, 'This app card belongs to another account', 403)
 const decodedUri = request.url.replace(/%(3A|2F|3F|40|21|24|27|28|29|2A|2C|3B)/gi, v => decodeURIComponent(v))
 const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret.clientSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
 const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(request.method + decodedUri + timestamp)))
 const expected = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
 let mismatch = expected.length ^ signature.length
 for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ (signature.charCodeAt(i) || 0)
 need(mismatch === 0, 'Invalid HubSpot app card signature', 401)
 need(url.searchParams.get('objectTypeId') === '0-3', 'This card only reads deals', 400)
 const operator = await env.DB.prepare("SELECT id FROM oa_operators WHERE lower(email)=? AND status='active'").bind((url.searchParams.get('userEmail') ?? '').toLowerCase()).first<any>()
 const actor = operator ? await actorById(env.DB, operator.id) : undefined
 need(actor && administrators.includes(actor.role), 'Sign in with a current Platter owner or admin in HubSpot', 403)
 const data = await hubspotCardData(env, actor, url.searchParams.get('dealId'), secret.accountId)
 // Recheck current authority and connection after the reads, before exposing any card data.
 await commit(env.DB, actor, [], true, { sql: "EXISTS(SELECT 1 FROM p_connections WHERE id='workspace:hubspot' AND version=? AND status='connected' AND broken_at IS NULL) AND EXISTS(SELECT 1 FROM p_crm_card_secrets WHERE singleton=1 AND sealed=?)", values: [connection.version, row.sealed] })
 return Response.json(data, { headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' } })
}

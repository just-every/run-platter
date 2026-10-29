import type { Bindings } from '../../auth.server'
import { currentTime } from '../expiry-time'
import { need } from '../model'

/** A provider refusal only invalidates the credential version that made the request. */
export async function hubspotJson(env: Bindings, connection: any, token: string, url: string, init: RequestInit = {}, emptyReceipt = false) {
 const live = await env.DB.prepare("SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id='workspace:hubspot' AND c.account_id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL").bind(connection.account_id, connection.version).first()
 need(live, 'Reconnect HubSpot before making another CRM request', 409)
 let response: Response, value: any
 try {
  response = await fetch(url, { ...init, headers: { ...init.headers, authorization: 'Bearer ' + token, accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(30000) })
  const raw = await response.text()
  // A 401 is definitive even when the provider supplies no JSON error body.
  if (raw.length <= 262144) { try { value = JSON.parse(raw) } catch {} }
 } catch {
  need(false, 'HubSpot did not confirm the request; review before trying again', 409)
 }
 if (response.status === 401 || response.status === 403 && value?.category === 'MISSING_SCOPES') {
  await env.DB.prepare("UPDATE p_connections SET broken_at=? WHERE id='workspace:hubspot' AND account_id=? AND version=? AND status='connected' AND broken_at IS NULL").bind(await currentTime(env.DB), connection.account_id, connection.version).run()
  need(false, 'HubSpot rejected this credential or its scopes. Reconnect before continuing.', 409)
 }
 if (emptyReceipt && response.status === 204) return null
 need(response.ok && value && typeof value === 'object' && !Array.isArray(value), 'HubSpot did not confirm the request; review before trying again', 409)
 return value
}

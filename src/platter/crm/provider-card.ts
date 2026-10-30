import type { Bindings } from '../../auth.server'
import { providerCredential } from '../connections'
import { commit, need, text, type Actor } from '../model'
import { administrators } from '../permissions'
import { hubspotCardData } from './hubspot-card'

/** Provider launch links carry record context only; a current Platter session supplies authority. */
export async function crmCardData(env: Bindings, actor: Actor, params: URLSearchParams) {
 const provider = params.get('provider') ?? 'hubspot'
 if (provider === 'hubspot') return hubspotCardData(env, actor, params.get('dealId'), params.get('accountId'))
 need(provider === 'pipedrive' || provider === 'zoho', 'Choose a supported CRM card', 404)
 need(administrators.includes(actor.role), 'Only owner and admins open connected deal cards', 403)
 const dealId = text(params.get('dealId'), 'a deal id', 100), accountId = text(params.get('accountId'), 'a provider account id', 100)
 need(/^[1-9]\d{0,19}$/.test(dealId) && /^[1-9]\d{0,19}$/.test(accountId), 'Use the provider record ids')
 const { connection } = await providerCredential(env, 'workspace:' + provider)
 need(!connection.broken_at && connection.account_id === accountId, 'This card belongs to another or disconnected provider account', 409)
 const query = new URLSearchParams({ provider, accountId, dealId })
 if (provider === 'zoho' && params.get('quoteId')) {
  const quoteId = params.get('quoteId') ?? ''
  need(/^[1-9]\d{0,19}$/.test(quoteId), 'Use the Zoho quote id')
  query.set('quoteId', quoteId)
 }
 const proposals = (await env.DB.prepare('SELECT p.id,p.title,p.status,p.revision FROM p_crm_draft_sources s JOIN p_proposals p ON p.id=s.proposal_id WHERE s.provider=? AND s.account_id=? AND s.deal_id=? ORDER BY p.created_at,p.id').bind(provider, accountId, dealId).all<any>()).results
 await commit(env.DB, actor, [], true, {
  sql: "EXISTS(SELECT 1 FROM p_connections c JOIN p_connection_secrets s ON s.connection_id=c.id WHERE c.id=? AND c.account_id=? AND c.version=? AND c.status='connected' AND c.broken_at IS NULL)",
  values: ['workspace:' + provider, accountId, connection.version],
 })
 return { provider, dealId, accountId, startUrl: env.AUTH_ORIGIN + '/app/crm-card?' + query, proposals: proposals.map(p => ({ ...p, url: env.AUTH_ORIGIN + '/app/proposal?id=' + encodeURIComponent(p.id) })) }
}

import type { Bindings } from '../auth.server'
import { command } from './commands'
import { state } from './state'
import { need, type Actor } from './model'
import { requestSend } from './send-requests'
import { recordAudit } from './audit'

const headers = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' }
const versions = ['2025-03-26', '2025-06-18']
const json = (value: unknown, status = 200) => Response.json(value, { status, headers })
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)
const string = { type: 'string', minLength: 1, maxLength: 200 }
const integer = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }
const fields = {
 clientId: string, title: string, scope: { ...string, maxLength: 10000 },
 depositPercent: { type: 'number', exclusiveMinimum: 0, maximum: 100 },
 optionOne: string, priceOne: { type: ['string', 'number'] },
 optionTwo: string, priceTwo: { type: ['string', 'number'] },
}
const schema = (properties: Record<string, any>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false, ...(Object.hasOwn(properties,'packages')?{anyOf:[{required:['packages']},{required:['optionOne','priceOne','optionTwo','priceTwo']}]}:{}) })
const draftRequired=['clientId','title','scope','depositPercent']
const draftingFields={...fields,packages:{type:'array',minItems:1,items:{type:'object',description:'Package id, label, price, optionalItems: id, label, unitPrice, min, max, quantity and editable. Prices and optional-item totals are always calculated by the server.'}},pricingTables:{type:'array',items:{type:'object',description:'Tables with an offered package optionId, name, and lines: name, description, quantity (positive decimal up to 3 places), unit, unitPrice (USD up to 2 places), group. Server rounds each extended line half up to cents and recomputes totals.'}}}
const tools = [
 { name: 'search_proposals', description: 'Search current proposals by title, scope or client. Includes matching existing clients for preparing a draft; at most 100 results of each kind.', inputSchema: schema({ query: { type: 'string', maxLength: 200 }, status: { type: 'string', enum: ['draft', 'approved', 'sent', 'accepted'] }, limit: { type: 'integer', minimum: 1, maximum: 100 } }) },
 { name: 'search_templates', description: 'Find built-in starter templates and personal templates belonging to this key’s owner. Use the returned id and version to prepare an independent draft.', inputSchema: schema({ query: { type: 'string', maxLength: 200 } }) },
 { name: 'prepare_from_template', description: 'Prepare an independent draft from a built-in starter or a personal template belonging to this key’s owner. This never approves or sends it.', inputSchema: schema({ templateId: string, templateVersion: integer, clientId: string, title: string }, ['templateId', 'templateVersion', 'clientId']) },
 { name: 'read_proposal', description: 'Read a current proposal, revision, version, approval and recorded delivery/acceptance status. No invitation credentials are returned.', inputSchema: schema({ id: string }, ['id']) },
 { name: 'read_engagement', description: 'Read recorded delivery and acceptance status. View tracking and section reading analytics are unavailable; delivery acceptance does not prove reading.', inputSchema: schema({ id: string }, ['id']) },
 { name: 'prepare_proposal', description: 'Prepare a structured package draft (or a legacy two-option draft) for an existing client. The owner must review, approve and send it.', inputSchema: schema(draftingFields, draftRequired) },
 { name: 'revise_proposal', description: 'Revise the current draft or approved proposal using its version. This creates a draft revision and clears approval. Sent and accepted offers cannot be edited by an agent.', inputSchema: schema({ ...draftingFields, id: string, version: integer }, [...draftRequired, 'id', 'version']) },
 { name: 'request_send', description: 'Queue the exact current draft or approved revision for its key owner to review. Repeating an active request returns that request. This never approves or sends mail.', inputSchema: schema({ id: string, revision: integer }, ['id', 'revision']) },
]

function validArguments(input: unknown, definition: ReturnType<typeof schema>) {
 need(object(input), 'Tool arguments must be an object')
 need(Object.keys(input).every(key => Object.hasOwn(definition.properties, key)), 'Unknown tool argument')
 need(definition.required.every(key => Object.hasOwn(input, key)), 'Missing required tool argument')
 for (const [key, value] of Object.entries(input)) {
  const s = definition.properties[key], types = Array.isArray(s.type) ? s.type : [s.type]
  need(types.some((type: string) => type === 'array' ? Array.isArray(value) : type === 'integer' ? Number.isSafeInteger(value) : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === type), `Invalid ${key}`)
  if (typeof value === 'string') need(value.length >= (s.minLength ?? 0) && value.length <= (s.maxLength ?? 10000) && (!s.minLength || value.trim().length > 0), `Invalid ${key}`)
  if (typeof value === 'number') need(value >= (s.minimum ?? -Infinity) && value <= (s.maximum ?? Infinity) && (s.exclusiveMinimum === undefined || value > s.exclusiveMinimum), `Invalid ${key}`)
  if (s.enum) need(s.enum.includes(value), `Invalid ${key}`)
 }
 return input
}

async function callTool(env: Bindings, actor: Actor, name: string, input: Record<string, any>) {
 if (name === 'request_send') return requestSend(env.DB, actor, input)
 if (name === 'prepare_from_template') return command(env, actor, 'proposal.prepare', input)
 if (name === 'prepare_proposal' || name === 'revise_proposal') return command(env, actor, name === 'prepare_proposal' ? 'proposal.prepare' : 'proposal.revise', input)
 const current = await state(env, actor)
 if (name === 'search_templates') {
  const query = (input.query ?? '').toLocaleLowerCase()
  return { templates: [...current.starterTemplates, ...current.templates].filter(t => t.name.toLocaleLowerCase().includes(query)).map(t => ({ id: t.id, name: t.name, version: t.version })) }
 }
 if (name === 'search_proposals') {
  const query = (input.query ?? '').toLocaleLowerCase(), limit = input.limit ?? 50
  const matches = (value: string) => value.toLocaleLowerCase().includes(query)
  const found = current.proposals.filter(p => (!input.status || p.status === input.status) && matches(`${p.title}\n${p.scope}\n${p.clientName}`))
  const clients = current.clients.filter(c => matches(`${c.name}\n${c.email}`))
  return { proposals: found.slice(0, limit).map(p => ({ id: p.id, title: p.title, clientId: p.client_id, clientName: p.clientName, status: p.status, revision: p.revision, version: p.version })), clients: clients.slice(0, limit), proposalCount: found.length, clientCount: clients.length }
 }
 const found = current.proposals.find(p => p.id === input.id)
 need(found, 'Proposal not found', 404)
 if (name === 'read_proposal') {
  const { shareToken: _shareToken, ...safe } = found
  return safe
 }
 return { id: found.id, revision: found.revision, status: found.status, delivery: found.delivery ?? null, acceptance: found.acceptance ?? null,
  viewTracking: { available: false, reason: 'View tracking is not implemented.' }, sectionReading: { available: false, reason: 'Section-level reading analytics are not implemented.' } }
}

export async function handleMcp(request: Request, env: Bindings, actor: Actor): Promise<Response> {
 if (actor.role !== 'agent' || !actor.keyId) return json({ error: 'An agent credential is required' }, 403)
 if (request.headers.has('origin') && request.headers.get('origin') !== env.AUTH_ORIGIN) return json({ error: 'Cross-site request refused' }, 403)
 if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, allow: 'POST' } })
 const protocol = request.headers.get('mcp-protocol-version')
 if (protocol && !versions.includes(protocol)) return json({ error: 'Unsupported MCP protocol version' }, 400)
 if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'Use application/json' }, 415)
 const accept = request.headers.get('accept')
 if (accept && !accept.split(',').some(type => ['application/json', '*/*'].includes(type.split(';')[0].trim()))) return json({ error: 'Accept application/json responses' }, 406)
 let id: string | number | null = null
 const rpcError = (code: number, message: string, status = 200) => json({ jsonrpc: '2.0', id, error: { code, message } }, status)
 const result = (value: unknown) => json({ jsonrpc: '2.0', id, result: value })
 const raw = await request.text()
 if (new TextEncoder().encode(raw).length > 150000) return rpcError(-32600, 'Request too large', 413)
 let message: unknown
 try { message = JSON.parse(raw) } catch { return rpcError(-32700, 'Parse error', 400) }
 if (!object(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || !message.method.length) return rpcError(-32600, 'Invalid Request', 400)
 const notification = !Object.hasOwn(message, 'id')
 if (!notification) {
  if (!(typeof message.id === 'string' || typeof message.id === 'number' && Number.isFinite(message.id))) return rpcError(-32600, 'Invalid request id', 400)
  id = message.id
 }
 if (message.params !== undefined && !object(message.params)) return rpcError(-32602, 'Parameters must be an object', notification ? 400 : 200)
 const params = message.params ?? {}
 if (notification) {
  if (message.method !== 'notifications/initialized' || Object.keys(params).some(key => key !== '_meta')) return rpcError(-32600, 'Unsupported notification', 400)
  return new Response(null, { status: 202, headers })
 }
 if (message.method === 'initialize') {
  if (typeof params.protocolVersion !== 'string' || !object(params.capabilities) || !object(params.clientInfo) || typeof params.clientInfo.name !== 'string' || typeof params.clientInfo.version !== 'string') return rpcError(-32602, 'Provide protocolVersion, capabilities and clientInfo')
  return result({ protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : versions[1], capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'platter', version: '1.0.0' }, instructions: 'Tools use the current structured proposal model with built-in starters and the key owner’s personal templates. Reading analytics are unavailable. Only the owner approves and sends proposals.' })
 }
 if (message.method === 'ping') return result({})
 if (message.method === 'tools/list') {
  if (params.cursor !== undefined) return rpcError(-32602, 'This tool list has no pagination cursor')
  return result({ tools })
 }
 if (message.method !== 'tools/call') return rpcError(-32601, 'Method not found')
 if (typeof params.name !== 'string') return rpcError(-32602, 'Provide a tool name')
 const tool = tools.find(candidate => candidate.name === params.name)
 if (!tool) {
  if (/(^|[._])(approve|send|sign|refund)([._]|$)/.test(params.name)) return result({ isError: true, content: [{ type: 'text', text: 'Forbidden (403): assistants cannot approve, send, sign or refund.' }] })
  return rpcError(-32602, 'Unknown tool')
 }
 let input: Record<string, any>
 try { input = validArguments(params.arguments ?? {}, tool.inputSchema) } catch (error) { return rpcError(-32602, (error as Error).message) }
 try {
  const value = await callTool(env, actor, tool.name, input)
  await recordAudit(env.DB, actor, `mcp.${tool.name}`, String((value as any)?.id ?? input.id ?? 'proposals'))
  return result({ content: [{ type: 'text', text: JSON.stringify(value) }] })
 } catch (error) {
  const status = Number((error as any)?.status) || 500
  return result({ isError: true, content: [{ type: 'text', text: status < 500 ? `${(error as Error).message} (${status})` : 'The tool could not be completed. Reload current state before trying again.' }] })
 }
}

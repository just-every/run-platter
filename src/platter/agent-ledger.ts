import type { Bindings } from '../auth.server'
import { principal } from './credentials'
import { hash, need, type Actor } from './model'
import { scope } from './permissions'

const legacyActions = ['proposal.prepare','proposal.revise','proposal.approve','proposal.send','proposal.sign','payment.refund','invoice.write-off','client.save']
const tools = ['search_proposals','search_templates','prepare_from_template','read_proposal','read_engagement','prepare_proposal','revise_proposal','request_send','approve','proposal.approve','send','proposal.send','sign','refund','write_off']
// Only registered action labels enter history. Caller-supplied text is hashed, never retained.
function describe(request: Request, raw: string) {
 const path = new URL(request.url).pathname
 let value: any; try { value = JSON.parse(raw) } catch { value = null }
 if (path === '/api/platter/agent/mcp') return { transport: 'mcp', action: value?.method === 'tools'+'/call' ? 'mcp.' + (tools.includes(value?.params?.name) ? value.params.name : 'unknown_tool') : 'mcp.' + (['initialize','ping','tools'+'/list','notifications'+'/initialized'].includes(value?.method) ? value.method.replaceAll('/','.') : 'unknown_method') }
 if (path.startsWith('/api/platter/agent/')) return { transport: 'legacy', action: path.endsWith('/context') ? 'agent.context' : legacyActions.includes(value?.name) ? value.name : 'agent.unknown_command' }
 const route = path.slice('/api/platter/v1'.length)
 const matched = route.match(/^\/(proposals|templates|analytics|payments|agreements)(?:\/[^/]+\/(variables|approve|send|sign|refund|write-off))?$/)
 return { transport: 'rest', action: 'rest.' + request.method.toLowerCase() + '.' + (matched ? matched[1] + (matched[2] ? '.' + matched[2] : '') : 'unknown_route') }
}
const failure = (error: any) => Response.json({error: error.status && error.status < 500 ? error.message : 'The agent request could not be completed'}, {status: error.status || 500, headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})

/** Digest the exact request and returned response bodies, excluding headers and credentials. */
export async function agentRequest(request: Request, env: Bindings, run: (actor: Actor) => Promise<Response | null>): Promise<Response | null> {
 let actor: Actor
 try { actor = await principal(request, env, true, true, true) } catch (error) { return failure(error) }
 const db = env.DB, control = await db.prepare('SELECT paused_at,ledger_consent_at,monthly_model_budget_cents FROM p_agent_keys WHERE id=?').bind(actor.keyId!).first<any>()
 // Reading a bounded clone leaves the actual transport body available to its existing parser.
 let raw = ''
 if (request.body) {
  const reader = request.clone().body!.getReader(), decoder = new TextDecoder(), parts: string[] = []
  let bytes = 0
  while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.length; if (bytes > 150000) { void reader.cancel(); return failure({status:413,message:'Request too large'}) }; parts.push(decoder.decode(next.value,{stream:true})) }
  raw = parts.join('') + decoder.decode()
 }
 const id = crypto.randomUUID(), started = Date.now(), descriptor = describe(request, raw)
 if (control?.ledger_consent_at) actor.agentSources = []
 if (control?.ledger_consent_at) await db.prepare("INSERT INTO p_agent_receipts(id,owner_id,key_id,transport,action,started_at,status,input_digest) VALUES(?,?,?,?,?,?,'pending',?)").bind(id,actor.id,actor.keyId!,descriptor.transport,descriptor.action,started,await hash(raw)).run()
 let response: Response | null
 try {
  need(control && control.paused_at === null, 'This agent key is paused', 403)
  need(control.monthly_model_budget_cents===null,control.monthly_model_budget_cents===0?'The monthly model budget is zero. This agent key is held.':'Model spending is not independently recorded. Requests are held while this monthly model budget is configured.',control.monthly_model_budget_cents===0?429:409)
  response = await run(actor)
 } catch (error) { response = failure(error) }
 if (!response || !control?.ledger_consent_at) return response
 const output = await response.clone().text()
 let value: any; try { value = JSON.parse(output) } catch { value = null }
 const refused = response.status >= 400 || !!value?.error || !!value?.result?.isError
 const status = response.status >= 500 ? 'failed' : refused ? 'refused' : 'succeeded'
 // References come only from successful returned proposal projections, never from supplied ids.
 if (descriptor.transport === 'mcp' && !refused) { try { value = JSON.parse(value?.result?.content?.[0]?.text ?? 'null') } catch { value = null } }
 const candidates: any[] = refused ? [] : Array.isArray(value) ? (descriptor.action==='rest.get.payments'?value.map(row=>({id:row.proposalId})):value) : [value,...(value?.proposals ?? []),...(value?.request ? [{id:value.request.proposal_id,revision:value.request.revision}] : [])]
 // Insert references in one statement so a nonempty context read does not use
 // one database request per returned proposal.
 const eligible = descriptor.transport === 'rest' ? descriptor.action.includes('.proposals') || descriptor.action.includes('.agreements') || descriptor.action === 'rest.get.payments' : !descriptor.action.includes('template') || descriptor.action === 'mcp.prepare_from_template'
 const returned = eligible ? candidates.filter(row=>row && typeof row.id==='string').map(row=>({id:row.id,revision:Number.isSafeInteger(row.revision)?row.revision:null})) : []
 const visible = scope(actor,'view')
 const produced = ['proposal.prepare','proposal.revise','mcp.prepare_proposal','mcp.revise_proposal','mcp.prepare_from_template','rest.post.proposals','rest.post.proposals.variables'].includes(descriptor.action) && !refused
 const snapshots = produced ? (await db.prepare(`SELECT r.proposal_id,r.revision,r.snapshot FROM json_each(?) supplied
  JOIN p_proposals p ON p.id=json_extract(supplied.value,'$.id')
  JOIN p_revisions r ON r.proposal_id=p.id AND r.revision=json_extract(supplied.value,'$.revision') WHERE (${visible.sql})`).bind(JSON.stringify(returned),...visible.values).all<any>()).results : []
 const outputs = await Promise.all(snapshots.map(async row=>({id:row.proposal_id,revision:row.revision,digest:await hash(row.snapshot)})))
 const references = returned.map(row=>({...row,relation:produced?'produced':'returned',snapshotDigest:outputs.find(output=>output.id===row.id&&output.revision===row.revision)?.digest??null}))
 // A refusal can still have read a source. Link only server-observed proposal
 // revisions, never caller-supplied ids; returned or produced references win.
 for(const source of actor.agentSources??[]){
  const revision=Number(source.version)
  if(source.kind==='proposal'&&Number.isSafeInteger(revision)&&revision>0&&!references.some(row=>row.id===source.id&&row.revision===revision))references.push({id:source.id,revision,relation:'read',snapshotDigest:null})
 }
 await db.batch([
  db.prepare('UPDATE p_agent_receipts SET completed_at=?,status=?,http_status=?,output_digest=? WHERE id=?').bind(Date.now(),status,response.status,await hash(output),id),
  db.prepare(`INSERT OR IGNORE INTO p_agent_receipt_records(receipt_id,proposal_id,revision,relation,snapshot_digest)
   SELECT ?,p.id,r.revision,json_extract(supplied.value,'$.relation'),json_extract(supplied.value,'$.snapshotDigest') FROM json_each(?) supplied
   JOIN p_proposals p ON p.id=json_extract(supplied.value,'$.id')
   JOIN p_revisions r ON r.proposal_id=p.id AND r.revision=COALESCE(json_extract(supplied.value,'$.revision'),p.revision)
   WHERE (${visible.sql})`).bind(id,JSON.stringify(references),...visible.values),
  db.prepare(`INSERT OR IGNORE INTO p_agent_receipt_sources(receipt_id,kind,source_id,source_version,digest,client_id)
   SELECT ?,json_extract(value,'$.kind'),json_extract(value,'$.id'),json_extract(value,'$.version'),json_extract(value,'$.digest'),
   CASE WHEN json_extract(value,'$.kind')='client' THEN (SELECT id FROM p_clients WHERE id=json_extract(value,'$.id')) ELSE NULL END
   FROM json_each(?) WHERE json_extract(value,'$.kind')!='client' OR EXISTS(SELECT 1 FROM p_clients WHERE id=json_extract(value,'$.id'))`).bind(id,JSON.stringify(actor.agentSources ?? []))
 ])
 return response
}

export async function agentLedger(db: D1Database, actor: Actor) {
 need(actor.role === 'owner','Only the owner reads agent receipts',403)
 const receipts = (await db.prepare('SELECT * FROM p_agent_receipts WHERE owner_id=? ORDER BY started_at DESC,id DESC LIMIT 100').bind(actor.id).all<any>()).results
 const ids=JSON.stringify(receipts.map(r=>r.id))
 const records=(await db.prepare('SELECT * FROM p_agent_receipt_records WHERE receipt_id IN (SELECT value FROM json_each(?)) ORDER BY proposal_id,revision').bind(ids).all<any>()).results
 const sources=(await db.prepare('SELECT receipt_id,kind,source_id,source_version,digest FROM p_agent_receipt_sources WHERE receipt_id IN (SELECT value FROM json_each(?)) ORDER BY kind,source_id,source_version,digest').bind(ids).all<any>()).results
 const decisions=(await db.prepare(`SELECT DISTINCT a.* FROM p_approval_decisions a JOIN p_agent_receipt_records r ON r.proposal_id=a.proposal_id AND r.revision=a.revision WHERE r.receipt_id IN (SELECT value FROM json_each(?)) ORDER BY a.occurred_at,a.id`).bind(ids).all<any>()).results
 const approvals=(await db.prepare(`SELECT DISTINCT a.* FROM p_approvals a JOIN p_agent_receipt_records r ON r.proposal_id=a.proposal_id AND r.revision=a.revision WHERE r.receipt_id IN (SELECT value FROM json_each(?)) ORDER BY a.approved_at,a.id`).bind(ids).all<any>()).results
 return receipts.map(receipt=>({...receipt,sources:sources.filter(s=>s.receipt_id===receipt.id).map(({receipt_id,...source})=>source),records:records.filter(r=>r.receipt_id===receipt.id).map(({receipt_id,...record})=>({...record,
  approvals:decisions.filter(a=>a.proposal_id===record.proposal_id&&a.revision===record.revision).map(({id,actor_id,decision,occurred_at})=>({id,actor_id,decision,occurred_at})),
  legacyApprovals:approvals.filter(a=>a.proposal_id===record.proposal_id&&a.revision===record.revision).map(({id,actor_id,approved_at})=>({id,actor_id,approved_at}))
 }))}))
}

export async function agentApproval(db:D1Database,actor:Actor,id:string){
 need(actor.role==='owner','Only the owner reads agent receipts',403)
 const visible=`EXISTS(SELECT 1 FROM p_agent_receipt_records ref JOIN p_agent_receipts receipt ON receipt.id=ref.receipt_id WHERE receipt.owner_id=? AND ref.proposal_id=a.proposal_id AND ref.revision=a.revision)`
 const decision=await db.prepare(`SELECT a.* FROM p_approval_decisions a WHERE a.id=? AND ${visible}`).bind(id,actor.id).first()
 const approval=decision??await db.prepare(`SELECT a.* FROM p_approvals a WHERE a.id=? AND ${visible}`).bind(id,actor.id).first()
 need(approval,'Human approval not found',404)
 return approval
}

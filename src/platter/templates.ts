import { workspaceDefaults, templateDefaults, startDefaults, defaultStatements } from './workspace'
import { saveTemplateCosts, startTemplateCosts } from './internal-pricing'
import type { Bindings } from '../auth.server'
import { starterTemplate } from './starter-templates'
import { copyAttachments, vendorDocuments } from './attachments'
import { currentTime } from './expiry'
import { commit, exact, need, proposal, snapshot, text, type Actor } from './model'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { installationZone } from './reports/report-state'

export async function templateState(db: D1Database, a: Actor) {
 need(['owner','admin','manager','sales','content_editor','agent','viewer','billing'].includes(a.role), 'Personal template access is required', 403)
 const rows = (await db.prepare('SELECT * FROM p_personal_templates WHERE owner_id=? ORDER BY updated_at DESC,id').bind(a.id).all<any>()).results
 return rows.map(row => ({ ...row, snapshot: JSON.parse(row.snapshot), expiry: JSON.parse(row.expiry), suggestion_sections: JSON.parse(row.suggestion_sections) }))
}

async function ownTemplate(db: D1Database, a: Actor, id: unknown) {
 need(!String(id).startsWith('starter:'), 'Start a draft to customize a built-in starter; save your changes as a personal template', 403)
 const row = await db.prepare('SELECT * FROM p_personal_templates WHERE id=?').bind(text(id, 'a template')).first<any>()
 need(row, 'Template not found', 404)
 need(row.owner_id === a.id, 'Only the owner of this personal template may use or edit it', 403)
 return row
}

export async function templateCommand(env: Bindings, a: Actor, name: string, input: Record<string, unknown>) {
 need(name === 'template.save' || name === 'template.start', 'Unknown template command', 404)
 need(['owner','admin','manager','sales','content_editor'].includes(a.role) || (a.role === 'agent' && name === 'template.start'), 'A person saves personal templates', 403)
 const db = env.DB, at = await currentTime(db)
 if (name === 'template.save') {
  const source = await proposal(db, input.id)
  exact(source, input)
  const displayed = negotiatedView(source, await pendingNegotiation(db, source.id))
  need(displayed.currency === 'USD', 'Personal templates require a USD proposal; historical AUD agreements stay unchanged', 409)
  const existing = input.templateId === undefined ? null : await ownTemplate(db, a, input.templateId)
  if (existing) exact(existing, { version: input.templateVersion })
  const templateName = text(input.name, 'a template name')
  const { id: _id, client_id: _client, revision: _revision, ...content } = snapshot(displayed)
  const [pdf, savedExpiry, sections] = await Promise.all([
   db.prepare('SELECT enabled FROM p_pdf_settings WHERE proposal_id=?').bind(source.id).first<any>(),
   db.prepare('SELECT mode,period_days,expires_on,time_zone,warning_days FROM p_expiry WHERE proposal_id=?').bind(source.id).first<any>(),
   db.prepare('SELECT section FROM p_suggestion_sections WHERE proposal_id=? AND revision=? ORDER BY section').bind(source.id, displayed.revision).all<{ section: string }>(),
  ])
  const expiry = savedExpiry ? { ...savedExpiry, expires_on: savedExpiry.mode === 'date' ? savedExpiry.expires_on : null }
   : { mode: 'never', period_days: null, expires_on: null, time_zone: await installationZone(db), warning_days: null }
  const id = existing?.id ?? crypto.randomUUID(), version = (existing?.version ?? 0) + 1
  const values = [templateName, JSON.stringify(content), pdf?.enabled === 0 ? 0 : 1, JSON.stringify(expiry), JSON.stringify(sections.results.map(s => s.section))]
  const writes = existing
   ? [db.prepare('UPDATE p_personal_templates SET name=?,snapshot=?,pdf_enabled=?,expiry=?,suggestion_sections=?,version=version+1,updated_at=? WHERE id=? AND owner_id=? AND version=?').bind(...values, at, id, a.id, existing.version)]
   : [db.prepare('INSERT INTO p_personal_templates(name,snapshot,pdf_enabled,expiry,suggestion_sections,id,owner_id,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)').bind(...values, id, a.id, at, at)]
  writes.push(...saveTemplateCosts(db,source.id,displayed.revision,id),...templateDefaults(db,source.id,id))
  await commit(db, a, writes, false, {
   sql: 'EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?)' + (existing ? ' AND EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND owner_id=? AND version=?)' : ''),
   values: [source.id, source.version, ...(existing ? [id, a.id, existing.version] : [])],
  })
  return { id, version }
 }

 const clientId = text(input.clientId ?? input.starterClientId, 'a client')
 const client = await db.prepare('SELECT id,name,email FROM p_clients WHERE id=?').bind(clientId).first<{ id: string; name: string; email: string }>()
 need(client, 'Client not found', 404)
 const starter = starterTemplate(input.id, client, a)
 const template = starter ? { id: starter.id, version: starter.version, pdf_enabled: 1 } : await ownTemplate(db, a, input.id)
 exact(template, input)
 const personal = starter ? null : template as any
 const content = starter ? { ...starter.content, attachments: await vendorDocuments(db) } : JSON.parse(personal.snapshot)
 const defaults=await workspaceDefaults(db)
 const expiry = starter ? { mode: defaults.expiryDays===null?'never':'days', period_days: defaults.expiryDays, expires_on: null, time_zone: await installationZone(db), warning_days: null } : JSON.parse(personal.expiry)
 const sections: string[] = starter ? [] : JSON.parse(personal.suggestion_sections)
 need(content.currency === 'USD', 'Personal templates require USD content', 409)
 const id = crypto.randomUUID(), title = input.title === undefined || input.title === '' ? content.title : text(input.title, 'a title')
 const attachments = copyAttachments(content.attachments ?? [])
 const row = { ...content, id, client_id: clientId, title, revision: 1, attachments }
 const preparer = a.role === 'agent' ? `agent:${a.keyId}` : a.email
 await commit(db, a, [
  db.prepare(`INSERT INTO p_proposals(id,client_id,title,scope,terms,version,revision,status,deposit_bps,options,
   prepared_by,created_at,currency,sales_owner_id,sales_owner_name,attachments)
   VALUES(?,?,?,?,?,1,1,'draft',?,?,?,?,?,?,?,?)`)
   .bind(id, clientId, title, row.scope, row.terms ?? '', row.deposit_bps, JSON.stringify(row.options), preparer, at, 'USD', a.id, a.email, JSON.stringify(attachments)),
  ...(!starter?[startTemplateCosts(db,template.id,id)]:[]),...await (starter?defaultStatements(db,id,false):startDefaults(db,template.id,id)),
  db.prepare('UPDATE p_proposals SET section_conditions=? WHERE id=?').bind(JSON.stringify(row.section_conditions ?? {}), id),
  db.prepare('INSERT INTO p_revisions(proposal_id,revision,snapshot,prepared_by,prepared_at,currency) VALUES(?,1,?,?,?,?)').bind(id, JSON.stringify(snapshot(row)), preparer, at, 'USD'),
  db.prepare('INSERT INTO p_pdf_settings(proposal_id,enabled) VALUES(?,?)').bind(id, template.pdf_enabled),
  db.prepare('INSERT INTO p_expiry(proposal_id,mode,period_days,expires_on,time_zone,warning_days) VALUES(?,?,?,?,?,?)').bind(id, expiry.mode, expiry.period_days, expiry.expires_on, expiry.time_zone, expiry.warning_days),
  ...sections.map(section => db.prepare('INSERT INTO p_suggestion_sections(proposal_id,revision,section) VALUES(?,1,?)').bind(id, section)),
 ], false, {
  sql: (starter ? '' : 'EXISTS(SELECT 1 FROM p_personal_templates WHERE id=? AND owner_id=? AND version=?) AND ') + 'EXISTS(SELECT 1 FROM p_clients WHERE id=?)',
  values: [...(starter ? [] : [template.id, a.id, template.version]), clientId],
 })
 return { id, revision: 1, version: 1 }
}

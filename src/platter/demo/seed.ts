// Writes the sample studio (./studio) as Platter's own commands would have:
// proposalFields validates every offer, snapshot freezes each revision,
// acceptanceTerms prices the client's choice, invoiceFile builds the deposit
// export, and the mail rows carry the texts proposal.send and code.request queue.
// Fixed ids and ON CONFLICT DO NOTHING keep it idempotent; it never fetches.
import type { Bindings } from '../../auth.server'
import { proposalFields } from '../commands'
import { acceptanceTerms, codeMail, sixDigitCode } from '../signing'
import { invoiceFile } from '../invoices'
import { proposalMail } from '../mail'
import { hash, secret, snapshot } from '../model'
import { businessImportCommand } from '../movein/business-import'
import { catalogCsv, clients, keys, member, owner as persona, proposals, type Preparer, type SampleProposal } from './studio'

const DAY = 86400000, MINUTE = 60000
const id = (kind: number, n: number) => `5eed${String(kind).padStart(4, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`
const clientId = (n: number) => id(1, n), proposalId = (n: number) => id(2, n), memberId = id(6, member.n), keyId = (n: number) => id(7, n)

export async function seedStudio(env: Bindings, ownerEmail: string, now: Date): Promise<void> {
  const db = env.DB, t = now.getTime(), ago = (days: number) => t - Math.round(days * DAY)
  const owner = await db.prepare("SELECT id, version FROM oa_operators WHERE email = ? AND role = 'owner'").bind(ownerEmail).first<{ id: string; version: number }>()
  if (!owner) throw new Error('The demo owner is missing')
  const preparer = (by: Preparer) => by === 'owner' ? ownerEmail : by === 'member' ? member.email : `agent:${keyId(1)}`
  const writes: D1PreparedStatement[] = [
    db.prepare('INSERT INTO oa_first_run (singleton, completed_by, completed_at) VALUES (1, ?, ?) ON CONFLICT(singleton) DO NOTHING').bind(owner.id, ago(150)),
    db.prepare('UPDATE oa_operators SET display_name = ? WHERE id = ?').bind(persona.name, owner.id),
    db.prepare('INSERT INTO p_installation_settings (singleton, time_zone) VALUES (1, ?) ON CONFLICT(singleton) DO NOTHING').bind(persona.timeZone),
    db.prepare("INSERT INTO oa_operators (id, email, display_name, role, status, version, created_at) VALUES (?, ?, ?, 'member', 'active', 1, ?) ON CONFLICT DO NOTHING").bind(memberId, member.email, member.name, ago(member.joined)),
  ]
  for (const key of keys) writes.push(db.prepare('INSERT INTO p_agent_keys (id, owner_id, owner_version, label, token_hash, created_at, expires_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(keyId(key.n), owner.id, owner.version, key.label, await hash(secret()), ago(key.created), ago(key.created) + 30 * DAY, key.revoked === undefined ? null : ago(key.revoked)))
  for (const [n, name, email] of clients) writes.push(db.prepare('INSERT INTO p_clients (id, name, email) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(clientId(n), name, email))
  // Each proposal's events keep their order but fall at its own time of day.
  for (const sample of proposals) writes.push(...await proposalWrites(env, sample, { ago: days => ago(days) - (sample.n * 53 % 240) * MINUTE, owner: owner.id, ownerEmail, preparer }))
  await db.batch(writes)
  await importCatalog(db, { id: owner.id, email: ownerEmail, role: 'owner' })
}

// The catalog arrives as any owner's would: previewed, then applied through the business import journal.
async function importCatalog(db: D1Database, actor: { id: string; email: string; role: 'owner' }) {
  const input = { kind: 'catalog', format: 'platter', csv: catalogCsv, mapping: '{}' }
  const preview: any = await businessImportCommand(db, actor, 'business-import.preview', input)
  if (!preview.canApply) throw new Error('The demo catalog does not import: ' + JSON.stringify(preview.diagnostics))
  for (let step = 0; step < 20; step++) {
    const result: any = await businessImportCommand(db, actor, 'business-import.apply', { ...input, fingerprint: preview.fingerprint })
    if (result.job.state === 'completed') return
  }
  throw new Error('The demo catalog import did not finish')
}

type Context = { ago: (days: number) => number; owner: string; ownerEmail: string; preparer: (by: Preparer) => string }

async function proposalWrites(env: Bindings, sample: SampleProposal, { ago, owner, ownerEmail, preparer }: Context): Promise<D1PreparedStatement[]> {
  const db = env.DB, pid = proposalId(sample.n), [, clientName, clientEmail] = clients.find(([n]) => n === sample.client)!
  const offers = sample.revisions.map(r => ({ id: pid, ...proposalFields({ clientId: clientId(sample.client), title: sample.title, scope: r.scope, terms: r.terms, optionOne: r.one[0], priceOne: r.one[1], optionTwo: r.two[0], priceTwo: r.two[1], depositPercent: sample.deposit }), currency: 'USD' }))
  const revision = offers.length, current = sample.revisions[revision - 1]!, approvals = sample.approvals ?? []
  const approval = approvals.find(([r]) => r === revision), sentAt = sample.sent === undefined ? undefined : ago(sample.sent) + 25 * MINUTE
  const status = sample.accepted ? 'accepted' : sentAt ? 'sent' : approval ? 'approved' : 'draft'
  const version = revision + approvals.length + (sentAt ? 1 : 0) + (sample.accepted ? 1 : 0)
  const row = { ...offers[revision - 1]!, revision, options: JSON.stringify(offers[revision - 1]!.options), approved_by: approval ? ownerEmail : null, approved_at: approval ? ago(approval[1]) : null, clientName, clientEmail }
  const writes = [
    db.prepare('INSERT INTO p_proposals (id, client_id, title, scope, terms, version, revision, status, deposit_bps, options, prepared_by, approved_by, approved_at, created_at, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
      .bind(pid, row.client_id, row.title, row.scope, row.terms, version, revision, status, row.deposit_bps, row.options, preparer(current.by), row.approved_by, row.approved_at, ago(sample.revisions[0]!.at), row.currency),
    ...offers.map((offer, i) => db.prepare('INSERT INTO p_revisions (proposal_id, revision, snapshot, prepared_by, prepared_at, currency) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
      .bind(pid, i + 1, JSON.stringify(snapshot({ ...offer, revision: i + 1 })), preparer(sample.revisions[i]!.by), ago(sample.revisions[i]!.at), offer.currency)),
    ...approvals.map(([r, days], i) => db.prepare('INSERT INTO p_approvals (id, proposal_id, revision, actor_id, approved_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING').bind(id(3, sample.n * 10 + i), pid, r, owner, ago(days))),
  ]
  if (!sentAt) return writes
  const token = secret(), mail = (n: number, [subject, body]: [string, string], at: number) => db.prepare("INSERT INTO p_mail (id, proposal_id, recipient, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, 'accepted', ?) ON CONFLICT DO NOTHING").bind(id(4, sample.n * 10 + n), pid, clientEmail, subject, body, at)
  const verifiedAt = sample.accepted ? ago(sample.accepted.at) - 6 * MINUTE : undefined, codeAt = verifiedAt ? verifiedAt - 3 * MINUTE : sample.codeRequested === undefined ? undefined : ago(sample.codeRequested)
  writes.push(db.prepare('INSERT INTO p_shares (proposal_id, revision, token, code_hash, code_expires, code_attempts, code_generation, code_sent_at, session_hash, session_expires) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(pid, revision, token, codeAt && !verifiedAt ? await hash(secret()) : null, codeAt && !verifiedAt ? codeAt + 10 * MINUTE : null, codeAt ? 1 : 0, codeAt ?? null, verifiedAt ? await hash(secret()) : null, verifiedAt ? verifiedAt + DAY : null))
  writes.push(mail(1, proposalMail(sample.title, `${env.AUTH_ORIGIN}/p/${token}`), sentAt))
  if (codeAt) writes.push(mail(2, verifiedAt ? [codeMail('', sample.title)[0], 'Verification code consumed'] : codeMail(sixDigitCode(), sample.title), codeAt))
  if (!sample.accepted) return writes
  const { option, deposit, frozen, consent } = acceptanceTerms(row, sample.accepted.option), acceptedAt = ago(sample.accepted.at)
  const accepted = { snapshot: JSON.stringify(frozen), email: clientEmail, deposit_cents: deposit, currency: row.currency }
  writes.push(db.prepare('INSERT INTO p_acceptances (proposal_id, revision, snapshot, name, email, option_id, total_cents, deposit_cents, accepted_at, consent, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(pid, revision, accepted.snapshot, sample.accepted.name, clientEmail, option.id, option.cents, deposit, acceptedAt, consent, accepted.currency))
  if (sample.exported === undefined) return writes
  const exportedAt = ago(sample.exported), { number, csv } = invoiceFile(pid, accepted, exportedAt)
  writes.push(db.prepare('INSERT INTO p_invoices (id, proposal_id, number, csv, exported_at, exported_by, currency) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING').bind(id(5, sample.n), pid, number, csv, exportedAt, ownerEmail, accepted.currency))
  return writes
}

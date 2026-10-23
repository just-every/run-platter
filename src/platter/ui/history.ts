import { sectionConditions } from '../conditional'
import { date, escape, form, hidden, money, panel, proposalPath } from './shared'

export function changes(before: any, after: any): string {
 const rows: [string, unknown, unknown][] = [ ['Title', before.title, after.title], ['Scope', before.scope, after.scope], ['Terms',before.terms??'',after.terms??''], ['Client', before.client_id, after.client_id], ['Deposit percentage', before.deposit_bps / 100, after.deposit_bps / 100] ]
 for(const section of ['scope','terms'] as const)rows.push([section+' visibility',sectionConditions(before.section_conditions)[section]??'Every option',sectionConditions(after.section_conditions)[section]??'Every option'])
 const paymentTerms=(v:any)=>JSON.stringify(v.options[0]?.paymentSchedule??null)
 rows.push(['Payment schedule',paymentTerms(before),paymentTerms(after)])
 const ids = new Set([...before.options, ...after.options].map((option: any) => option.id))
 for (const id of ids) {
  const old = before.options.find((option: any) => option.id === id), next = after.options.find((option: any) => option.id === id)
  if(JSON.stringify(old?.tables??[])!==JSON.stringify(next?.tables??[])){const detail=(o:any)=>(o?.tables??[]).map((t:any)=>t.name+'\n'+t.lines.map((l:any)=>`${l.group}: ${l.name} — ${l.description} — ${l.quantity} ${l.unit} × ${l.unitPrice} = ${money(l.lineTotalCents,after.currency)}`).join('\n')).join('\n')||'No pricing tables';rows.push([`Option ${id} pricing tables`,detail(old),detail(next)])}
  if(JSON.stringify(old?.optionalItems??[])!==JSON.stringify(next?.optionalItems??[])){const detail=(o:any)=>(o?.optionalItems??[]).map((x:any)=>`${x.label}: ${money(x.unitCents,after.currency)} × ${x.quantity} (${x.min}–${x.max}, ${x.editable?'client-editable':'fixed'})`).join('\n')||'No optional items';rows.push([`Option ${id} optional items`,detail(old),detail(next)])}
  rows.push([`Option ${id} label`, old?.label ?? 'Not offered', next?.label ?? 'Not offered'], [`Option ${id} price`, old ? money(old.cents, before.currency ?? 'AUD') : 'Not offered', next ? money(next.cents, after.currency ?? 'AUD') : 'Not offered'])
 }
 const fileRefs=(value:any)=>typeof value==='string'?JSON.parse(value):value??[]
 const files=(value:any)=>fileRefs(value).map((f:any)=>`${f.filename} (${f.size} bytes)`).join('\n')||'No attachments'
 if(JSON.stringify(fileRefs(before.attachments))!==JSON.stringify(fileRefs(after.attachments)))rows.push(['Attachments',files(before.attachments),files(after.attachments)+(files(before.attachments)===files(after.attachments)?' (new file version)':'')])
 const changed = rows.filter(([label, before, value]) => before !== value && !after.hiddenSections?.includes(label.toLowerCase()))
 return changed.length ? `<dl>${changed.map(([label, before, after]) => `<dt>${escape(label)}</dt><dd class="preserve"><del>${escape(before)}</del><br><ins>${escape(after)}</ins></dd>`).join('')}</dl>` : '<p>No content or price changes.</p>'
}

export function historyPanel(state: any, proposal: any, selection: URLSearchParams): string {
 const revisions = (state.revisions ?? []).filter((row: any) => row.proposal_id === proposal.id)
 const editable = ['draft', 'approved'].includes(proposal.status) && proposal.canEdit
 const list = `<ol class="records">${revisions.map((row: any) => `<li><article><h3>Revision ${escape(row.revision)}</h3><p>${escape(String(row.prepared_by).startsWith('agent:') ? `Agent · ${(state.agentKeys ?? []).find((k: any) => 'agent:' + k.id === row.prepared_by)?.label ?? 'key ' + String(row.prepared_by).slice(6)}` : row.prepared_by)} · ${date(row.prepared_at)}</p>${editable && row.revision < proposal.revision ? form('proposal.restore', proposalPath(proposal.id), hidden('id', proposal.id) + hidden('version', proposal.version) + hidden('revision', row.revision) + `<button>Restore revision ${escape(row.revision)}</button>`) : ''}</article></li>`).join('')}</ol>`
 const from = Number(selection.get('from') ?? revisions.at(-1)?.revision), to = Number(selection.get('to') ?? proposal.revision)
 const options = (selected: number) => revisions.map((row: any) => `<option value="${escape(row.revision)}"${row.revision === selected ? ' selected' : ''}>Revision ${escape(row.revision)}</option>`).join('')
 const compare = `<form method="get" action="/app/proposal">${hidden('id', proposal.id)}<label>Compare from<select name="from">${options(from)}</select></label><label>Compare to<select name="to">${options(to)}</select></label><button>Compare revisions</button></form>`
 const before = revisions.find((row: any) => row.revision === from), after = revisions.find((row: any) => row.revision === to)
 return panel('Revision history', list + compare + (before && after ? `<h3>Revision ${escape(from)} compared with revision ${escape(to)}</h3>${changes(before.snapshot, after.snapshot)}` : '<p>Choose two saved revisions.</p>'))
}

import { ui, renderingLocale } from '../locales'
import { paymentTerms } from '../payment-terms'
import { documentOf } from '../documents/blocks'
import { sectionConditions } from '../conditional'
import { date, escape, form, hidden, money, panel, proposalPath } from './shared'

function documentSummary(row:any){const doc=documentOf(row);return [doc.brand?`Brand: ${doc.brand.name} · ${doc.brand.font} · accent ${doc.brand.accent} · text ${doc.brand.ink} · paper ${doc.brand.paper} · default cover ${doc.brand.cover}`:'Default document style',...doc.blocks.map((b,i)=>[`${i+1}. ${b.title||b.type.replaceAll('_',' ')}`,b.text,b.second,b.alt,b.type==='field'?`${b.required?'Required':'Optional'} ${b.fieldKind} field · Client recipient`:b.type==='signature'?'Typed signature · Client recipient':'',b.type==='pricing'?`${(row.options??[]).find((o:any)=>o.id===b.optionId)?.label??'Package'} pricing table ${(b.tableIndex??0)+1}`:'',b.condition?'Visible only for '+(b.condition.startsWith('item:')?(row.options??[]).flatMap((o:any)=>o.optionalItems??[]).find((i:any)=>'item:'+i.id===b.condition)?.label??'the selected optional item':(row.options??[]).find((o:any)=>o.id===b.condition)?.label??'the selected package'):''].filter(Boolean).join('\n'))].join('\n\n')}

export function changes(before: any, after: any): string {
 const rows: [string, unknown, unknown][] = [ ['Payment schedule',JSON.stringify(paymentTerms(before)),JSON.stringify(paymentTerms(after))], ['Title', before.title, after.title], ['Scope', before.scope, after.scope], ['Terms',before.terms??'',after.terms??''], ['Client', before.client_id, after.client_id], ['Deposit percentage', before.deposit_bps / 100, after.deposit_bps / 100] ]
 for(const section of ['scope','terms'] as const)rows.push([section+' visibility',sectionConditions(before.section_conditions)[section]??'Every option',sectionConditions(after.section_conditions)[section]??'Every option'])
 if(JSON.stringify(documentOf(before))!==JSON.stringify(documentOf(after))){const old=documentSummary(before),next=documentSummary(after);rows.push(['Document blocks and brand',old,next+(old===next?' (media or recipient binding changed)':'')])}
 const ids = new Set([...before.options, ...after.options].map((option: any) => option.id))
 for (const id of ids) {
  const labelId=renderingLocale()==='en'?id:id==='one'?'1':id==='two'?'2':id
  const old = before.options.find((option: any) => option.id === id), next = after.options.find((option: any) => option.id === id)
  if(JSON.stringify(old?.tables??[])!==JSON.stringify(next?.tables??[])){const detail=(o:any)=>(o?.tables??[]).map((t:any)=>t.name+'\n'+t.lines.map((l:any)=>`${l.group}: ${l.name} — ${l.description} — ${l.quantity} ${l.unit} × ${l.unitPrice} = ${money(l.lineTotalCents,after.currency)}`).join('\n')).join('\n')||'No pricing tables';rows.push([`Option ${labelId} pricing tables`,detail(old),detail(next)])}
  if(JSON.stringify(old?.optionalItems??[])!==JSON.stringify(next?.optionalItems??[])){const detail=(o:any)=>(o?.optionalItems??[]).map((x:any)=>`${x.label}: ${money(x.unitCents,after.currency)} × ${x.quantity} (${x.min}–${x.max}, ${x.editable?'client-editable':'fixed'})`).join('\n')||'No optional items';rows.push([`Option ${labelId} optional items`,detail(old),detail(next)])}
  rows.push([`Option ${labelId} label`, old?.label ?? ui('Not offered'), next?.label ?? ui('Not offered')], [`Option ${labelId} price`, old ? money(old.cents, before.currency ?? 'AUD') : ui('Not offered'), next ? money(next.cents, after.currency ?? 'AUD') : ui('Not offered')])
 }
 const fileRefs=(value:any)=>typeof value==='string'?JSON.parse(value):value??[]
 const files=(value:any)=>fileRefs(value).map((f:any)=>`${f.filename} (${f.size} bytes)`).join('\n')||'No attachments'
 if(JSON.stringify(fileRefs(before.attachments))!==JSON.stringify(fileRefs(after.attachments)))rows.push(['Attachments',files(before.attachments),files(after.attachments)+(files(before.attachments)===files(after.attachments)?' (new file version)':'')])
 const changed = rows.filter(([label, before, value]) => before !== value && !after.hiddenSections?.includes(label.toLowerCase()))
 return changed.length ? `<dl>${changed.map(([label, before, after]) => `<dt>${escape(ui(label))}</dt><dd class="preserve"><del>${escape(before)}</del><br><ins>${escape(after)}</ins></dd>`).join('')}</dl>` : ui('<p>No content or price changes.</p>')
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
